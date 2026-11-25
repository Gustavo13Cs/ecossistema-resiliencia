import {
  CallHandler,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { defer, lastValueFrom, of, throwError } from 'rxjs';
import { ClinicalContextInterceptor } from './clinical-context.interceptor';
import { ClinicalResponseValidator } from './clinical-response.validator';
import { PrismaService } from '../../infra/database/prisma.service';
import { RequestMetricsService } from '../observability/request-metrics.service';
import { RequestTelemetryLogger } from '../observability/request-telemetry.logger';
import {
  recordDatabaseSpan,
  recordStageDuration,
  recordTxAcquire,
} from '../observability/request-telemetry.context';
import type { ClinicalResponsePolicy } from '../decorators/clinical-response.decorator';

function createHttpContext(options: {
  method?: string;
  url?: string;
  routePath?: string;
  headers?: Record<string, string>;
  role?: 'NUTRITIONIST' | 'PERSONAL' | 'PHYSIO' | 'ADMIN';
  response?: {
    statusCode?: number;
    headersSent?: boolean;
    setHeader: jest.Mock;
  };
}) {
  const response = options.response ?? {
    statusCode: 200,
    headersSent: false,
    setHeader: jest.fn(),
  };
  const request = {
    method: options.method ?? 'GET',
    baseUrl: '',
    route: options.routePath ? { path: options.routePath } : undefined,
    originalUrl: options.url ?? '/clients',
    url: options.url ?? '/clients',
    headers: options.headers ?? {},
    user: options.role
      ? { sub: 'prof-1', role: options.role, sessionId: 'sess-1' }
      : undefined,
    body: { clientName: 'Maria Sigilosa', notes: 'Anamnese privada' },
  };
  const handler = function testHandler() {};
  const context = {
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, response, request };
}

describe('ClinicalContextInterceptor instrumentation', () => {
  const prevLogMode = process.env.OBSERVABILITY_LOG_REQUESTS;
  const prevSlowReq = process.env.OBSERVABILITY_SLOW_REQUEST_MS;
  const prevServerTiming = process.env.OBSERVABILITY_SERVER_TIMING;

  afterEach(() => {
    if (prevLogMode === undefined)
      delete process.env.OBSERVABILITY_LOG_REQUESTS;
    else process.env.OBSERVABILITY_LOG_REQUESTS = prevLogMode;
    if (prevSlowReq === undefined)
      delete process.env.OBSERVABILITY_SLOW_REQUEST_MS;
    else process.env.OBSERVABILITY_SLOW_REQUEST_MS = prevSlowReq;
    if (prevServerTiming === undefined) {
      delete process.env.OBSERVABILITY_SERVER_TIMING;
    } else {
      process.env.OBSERVABILITY_SERVER_TIMING = prevServerTiming;
    }
    jest.restoreAllMocks();
  });

  function setup(
    policy: ClinicalResponsePolicy,
    options?: { runAsImpl?: () => Promise<unknown> },
  ) {
    const logs: Array<{ line: string; level: string }> = [];
    const logger = new RequestTelemetryLogger((line, level) =>
      logs.push({ line, level }),
    );
    const metrics = new RequestMetricsService(logger);
    const reflector = {
      get: jest.fn((_key: unknown, target: unknown) =>
        typeof target === 'function' ? policy : undefined,
      ),
    } as unknown as Reflector;
    const runAsProfessional = jest.fn(
      async (
        _user: unknown,
        _requestId: string,
        op: () => Promise<unknown>,
      ) => {
        if (options?.runAsImpl) return options.runAsImpl();
        recordTxAcquire('clinical', 1.25);
        recordStageDuration('rlsContextMs', 0.75);
        const out = await op();
        recordDatabaseSpan({
          source: 'clinical',
          operation: 'COMMIT',
          target: 'transaction',
          durationMs: 0.9,
          ok: true,
        });
        return out;
      },
    );
    const prisma = {
      runAsProfessional,
    } as unknown as PrismaService;
    const validate = jest.fn().mockResolvedValue(undefined);
    const validator = {
      validate,
    } as unknown as ClinicalResponseValidator;
    const interceptor = new ClinicalContextInterceptor(
      prisma,
      reflector,
      {} as DiscoveryService,
      {} as MetadataScanner,
      validator,
      metrics,
      logger,
    );
    return {
      interceptor,
      metrics,
      prisma,
      validator,
      runAsProfessional,
      validate,
      logs,
    };
  }

  it('instruments clinical routes with X-Request-Id, Server-Timing, traceparent correlation, and zero clinical leakage', async () => {
    process.env.OBSERVABILITY_LOG_REQUESTS = 'all';
    process.env.OBSERVABILITY_SLOW_REQUEST_MS = '1';

    const { interceptor, metrics, validate, logs } = setup({
      shape: 'resource',
    });
    const { context, response } = createHttpContext({
      method: 'GET',
      routePath: '/clients/:id/overview',
      url: '/clients/123e4567-e89b-12d3-a456-426614174000/overview',
      headers: {
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      },
      role: 'NUTRITIONIST',
    });

    const next: CallHandler = {
      handle: () =>
        defer(async () => {
          recordDatabaseSpan({
            source: 'clinical',
            operation: 'SELECT',
            target: 'Client',
            durationMs: 14.2,
            ok: true,
          });
          await new Promise((r) => setTimeout(r, 10));
          return {
            clientId: '123e4567-e89b-12d3-a456-426614174000',
            clientName: 'Paciente Confidencial',
            notes: 'Informação Clínica Privada',
          };
        }),
    };

    const result = await lastValueFrom(interceptor.intercept(context, next));
    expect(result).toMatchObject({ clientName: 'Paciente Confidencial' });
    expect(validate).toHaveBeenCalledTimes(1);

    const headerCalls = response.setHeader.mock.calls as Array<
      [string, string]
    >;
    const headerMap = Object.fromEntries(headerCalls);
    expect(headerMap['Cache-Control']).toBe('no-store');
    expect(headerMap['X-Request-Id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(headerMap['Server-Timing']).toContain('total;dur=');
    expect(headerMap['Server-Timing']).toContain('db;dur=');
    expect(headerMap['Server-Timing']).toContain('tx;dur=1.25');
    expect(headerMap['Server-Timing']).toContain('rls;dur=0.75');
    expect(headerMap['Server-Timing']).toContain('handler;dur=');
    expect(headerMap['Server-Timing']).toContain('validate;dur=');
    expect(headerMap['Server-Timing']).toContain('commit;dur=0.9');

    expect(logs).toHaveLength(1);
    const parsedLog = JSON.parse(logs[0].line) as Record<string, unknown>;
    expect(parsedLog).toMatchObject({
      event: 'http_request_completed',
      requestId: headerMap['X-Request-Id'],
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      parentSpanId: '00f067aa0ba902b7',
      route: 'GET /clients/:id/overview',
      policy: 'resource',
      role: 'NUTRITIONIST',
      statusCode: 200,
      dbQueryCount: 1,
      slowestOperation: 'SELECT',
      slowestTarget: 'Client',
      dbSources: ['clinical'],
      slow: true,
    });
    expect(logs[0].line).not.toContain('Paciente Confidencial');
    expect(logs[0].line).not.toContain('Informação Clínica Privada');
    expect(logs[0].line).not.toContain('Maria Sigilosa');

    const snapshot = metrics.getSnapshot(5);
    expect(snapshot.totals.requests).toBe(1);
    expect(snapshot.topSlowRoutes[0].lastSlowRequest?.requestId).toBe(
      headerMap['X-Request-Id'],
    );
  });

  it('sets X-Request-Id but omits Server-Timing on auth, health, and observability routes and excludes observability from metrics', async () => {
    process.env.OBSERVABILITY_LOG_REQUESTS = 'all';

    for (const exception of ['auth', 'health', 'observability'] as const) {
      const { interceptor, metrics, runAsProfessional, logs } = setup({
        exception,
      });
      const { context, response } = createHttpContext({
        method: 'GET',
        routePath: `/${exception}/test`,
      });
      await lastValueFrom(
        interceptor.intercept(context, { handle: () => of({ ok: true }) }),
      );

      expect(runAsProfessional).not.toHaveBeenCalled();
      const headerMap = Object.fromEntries(
        response.setHeader.mock.calls as Array<[string, string]>,
      );
      expect(headerMap['X-Request-Id']).toBeDefined();
      expect(headerMap['Server-Timing']).toBeUndefined();
      expect(metrics.getSnapshot().totals.requests).toBe(
        exception === 'observability' ? 0 : 1,
      );
      expect(logs).toHaveLength(1);
    }
  });

  it('preserves HttpException, P2034 -> 409, and generic 500 error semantics without logging sensitive details', async () => {
    process.env.OBSERVABILITY_LOG_REQUESTS = 'all';

    const notFoundSetup = setup({ shape: 'resource' });
    const ctx404 = createHttpContext({ routePath: '/clients/:id' });
    await expect(
      lastValueFrom(
        notFoundSetup.interceptor.intercept(ctx404.context, {
          handle: () =>
            throwError(() => new NotFoundException('Paciente Maria Privada')),
        }),
      ),
    ).rejects.toThrow(NotFoundException);
    expect(JSON.parse(notFoundSetup.logs[0].line)).toMatchObject({
      statusCode: 404,
      errorCode: 'NotFoundException',
    });
    expect(notFoundSetup.logs[0].line).not.toContain('Maria Privada');

    const p2034Setup = setup(
      { shape: 'resource' },
      {
        runAsImpl: () =>
          Promise.reject(
            Object.assign(new Error('serialization failure'), {
              code: 'P2034',
            }),
          ),
      },
    );
    const ctx409 = createHttpContext({
      method: 'POST',
      routePath: '/appointments',
    });
    await expect(
      lastValueFrom(
        p2034Setup.interceptor.intercept(ctx409.context, {
          handle: () => of({}),
        }),
      ),
    ).rejects.toThrow('Operação concorrente');
    expect(JSON.parse(p2034Setup.logs[0].line)).toMatchObject({
      statusCode: 409,
      errorCode: 'P2034',
    });

    const dsnSetup = setup(
      { shape: 'resource' },
      {
        runAsImpl: () =>
          Promise.reject(
            new Error('postgresql://admin:supersecret@db.host:5432/clinical'),
          ),
      },
    );
    const ctx500 = createHttpContext({ routePath: '/clients' });
    await expect(
      lastValueFrom(
        dsnSetup.interceptor.intercept(ctx500.context, {
          handle: () => of({}),
        }),
      ),
    ).rejects.toThrow('Operação indisponível');
    expect(JSON.parse(dsnSetup.logs[0].line)).toMatchObject({
      statusCode: 500,
      errorCode: 'INTERNAL_ERROR',
    });
    expect(dsnSetup.logs[0].line).not.toContain('supersecret');
  });
});
