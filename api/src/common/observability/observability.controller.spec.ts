import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  HEADERS_METADATA,
  HTTP_CODE_METADATA,
} from '@nestjs/common/constants';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClinicalContextModule } from '../clinical-context/clinical-context.module';
import { CLINICAL_RESPONSE } from '../decorators/clinical-response.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import {
  AuthPrismaService,
  JobsPrismaService,
} from '../../infra/database/database-clients';
import { DatabaseModule } from '../../infra/database/database.module';
import { PrismaService } from '../../infra/database/prisma.service';
import { PerformanceMetricsQueryDto } from './dto/performance-metrics-query.dto';
import { ObservabilityController } from './observability.controller';
import { ObservabilityModule } from './observability.module';
import { RequestMetricsService } from './request-metrics.service';
import { WebVitalsController } from './web-vitals.controller';
import { WebVitalsMetricsService } from './web-vitals-metrics.service';

describe('ObservabilityController & RBAC contract', () => {
  it('enforces ADMIN role, non-public auth, no-store header, and observability response policy', () => {
    const reflector = new Reflector();
    const methodRef = Object.getOwnPropertyDescriptor(
      ObservabilityController.prototype,
      'getPerformance',
    )?.value as (...args: never[]) => unknown;

    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        methodRef,
        ObservabilityController,
      ]),
    ).toBeFalsy();
    expect(
      reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        methodRef,
        ObservabilityController,
      ]),
    ).toEqual(['ADMIN']);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ObservabilityController),
    ).toContain(RolesGuard);
    expect(reflector.get(CLINICAL_RESPONSE, methodRef)).toEqual({
      exception: 'observability',
    });
    expect(Reflect.getMetadata(HEADERS_METADATA, methodRef)).toEqual(
      expect.arrayContaining([{ name: 'Cache-Control', value: 'no-store' }]),
    );
  });

  it('validates top query parameter via ValidationPipe and exposes snapshot only to ADMIN', async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseModule, ObservabilityModule, ClinicalContextModule],
      providers: [
        {
          provide: APP_GUARD,
          useValue: {
            canActivate(context: ExecutionContext) {
              const req = context.switchToHttp().getRequest<{
                headers: Record<string, string | undefined>;
                user?: { sub: string; role: string };
              }>();
              const role = req.headers['x-test-role'];
              if (!role) throw new UnauthorizedException();
              req.user = { sub: 'user-1', role };
              return true;
            },
          },
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({ runAsProfessional: jest.fn(), $disconnect: jest.fn() })
      .overrideProvider(AuthPrismaService)
      .useValue({ $disconnect: jest.fn() })
      .overrideProvider(JobsPrismaService)
      .useValue({ $disconnect: jest.fn() })
      .overrideProvider(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    const app: INestApplication<App> = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    try {
      const metrics = app.get(RequestMetricsService);
      metrics.recordRequest({
        route: 'GET /clients',
        statusCode: 200,
        totalMs: 42,
        dbMs: 18,
        dbQueryCount: 2,
        slow: false,
        requestId: 'req-seed',
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      });

      await request(app.getHttpServer())
        .get('/observability/performance')
        .expect(401);

      await request(app.getHttpServer())
        .get('/observability/performance')
        .set('x-test-role', 'NUTRITIONIST')
        .expect(403);

      await request(app.getHttpServer())
        .get('/observability/performance?top=0')
        .set('x-test-role', 'ADMIN')
        .expect(400);

      await request(app.getHttpServer())
        .get('/observability/performance?top=51')
        .set('x-test-role', 'ADMIN')
        .expect(400);

      await request(app.getHttpServer())
        .get('/observability/performance?unknown=1')
        .set('x-test-role', 'ADMIN')
        .expect(400);

      const ok = await request(app.getHttpServer())
        .get('/observability/performance?top=5')
        .set('x-test-role', 'ADMIN')
        .expect(200);

      expect(ok.headers['cache-control']).toBe('no-store');
      expect(ok.headers['x-request-id']).toBeDefined();
      expect(ok.headers['server-timing']).toBeUndefined();
      expect(ok.body).toMatchObject({
        totals: { requests: 1, errors: 0, slowRequests: 0 },
        topSlowRoutes: [{ route: 'GET /clients', count: 1, p95Ms: 42 }],
      });
    } finally {
      await app.close();
    }
  });

  it('keeps DTO type definition intact for runtime validation', () => {
    const dto = new PerformanceMetricsQueryDto();
    dto.top = 10;
    expect(dto.top).toBe(10);
  });
});

describe('WebVitalsController & GET /observability/web-vitals', () => {
  it('marks POST /observability/web-vitals @Public() with 202 and keeps GET /observability/web-vitals ADMIN-only', () => {
    const reflector = new Reflector();
    const postMethod = Object.getOwnPropertyDescriptor(
      WebVitalsController.prototype,
      'report',
    )?.value as (...args: never[]) => unknown;
    const getMethod = Object.getOwnPropertyDescriptor(
      ObservabilityController.prototype,
      'getWebVitals',
    )?.value as (...args: never[]) => unknown;

    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        postMethod,
        WebVitalsController,
      ]),
    ).toBe(true);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, postMethod)).toBe(202);
    expect(reflector.get(CLINICAL_RESPONSE, postMethod)).toEqual({
      exception: 'observability',
    });
    expect(Reflect.getMetadata(HEADERS_METADATA, postMethod)).toEqual(
      expect.arrayContaining([{ name: 'Cache-Control', value: 'no-store' }]),
    );

    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        getMethod,
        ObservabilityController,
      ]),
    ).toBeFalsy();
    expect(
      reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        getMethod,
        ObservabilityController,
      ]),
    ).toEqual(['ADMIN']);
    expect(reflector.get(CLINICAL_RESPONSE, getMethod)).toEqual({
      exception: 'observability',
    });
    expect(Reflect.getMetadata(HEADERS_METADATA, getMethod)).toEqual(
      expect.arrayContaining([{ name: 'Cache-Control', value: 'no-store' }]),
    );
  });

  it('ingests sanitized RUM batches without auth, preserves request metrics isolation, and serves ADMIN-filtered snapshots', async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseModule, ObservabilityModule, ClinicalContextModule],
      providers: [
        {
          provide: APP_GUARD,
          useValue: {
            canActivate(context: ExecutionContext) {
              const reflector = new Reflector();
              const isPublic = reflector.getAllAndOverride<boolean>(
                IS_PUBLIC_KEY,
                [context.getHandler(), context.getClass()],
              );
              if (isPublic) return true;
              const req = context.switchToHttp().getRequest<{
                headers: Record<string, string | undefined>;
                user?: { sub: string; role: string };
              }>();
              const role = req.headers['x-test-role'];
              if (!role) throw new UnauthorizedException();
              req.user = { sub: 'user-1', role };
              return true;
            },
          },
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({ runAsProfessional: jest.fn(), $disconnect: jest.fn() })
      .overrideProvider(AuthPrismaService)
      .useValue({ $disconnect: jest.fn() })
      .overrideProvider(JobsPrismaService)
      .useValue({ $disconnect: jest.fn() })
      .overrideProvider(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    const app: INestApplication<App> = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    try {
      const requestMetrics = app.get(RequestMetricsService);
      const webVitals = app.get(WebVitalsMetricsService);
      requestMetrics.reset();
      webVitals.reset();

      // Rejects malformed payloads cleanly
      await request(app.getHttpServer())
        .post('/observability/web-vitals')
        .send({ metrics: [] })
        .expect(400);

      await request(app.getHttpServer())
        .post('/observability/web-vitals')
        .send({
          metrics: [
            {
              name: 'FID',
              value: 15,
              route: '/',
              device: 'desktop',
            },
          ],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/observability/web-vitals')
        .send({
          metrics: [
            {
              name: 'CLS',
              value: 101,
              route: '/',
              device: 'desktop',
            },
          ],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/observability/web-vitals')
        .send({
          metrics: [
            {
              name: 'LCP',
              value: 1400,
              route: '/',
              device: 'desktop',
              unexpectedField: 'leak',
            },
          ],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/observability/web-vitals')
        .send({
          metrics: Array.from({ length: 11 }, () => ({
            name: 'INP',
            value: 100,
            route: '/',
            device: 'desktop',
          })),
        })
        .expect(400);

      // Valid anonymous RUM ingestion returns 202 and no-store
      const accepted = await request(app.getHttpServer())
        .post('/observability/web-vitals')
        .send({
          metrics: [
            {
              name: 'LCP',
              value: 2950,
              route:
                '/clientes/11111111-1111-4111-8111-111111111111/nova-dieta?patient=Maria',
              device: 'mobile',
              navigationType: 'navigate',
            },
            {
              name: 'CLS',
              value: 0.03,
              route: '/',
              device: 'desktop',
              navigationType: 'navigate',
            },
          ],
        })
        .expect(202);

      expect(accepted.headers['cache-control']).toBe('no-store');
      expect(accepted.body).toEqual({ accepted: 2 });

      // Must NOT pollute API performance request metrics
      expect(requestMetrics.getSnapshot(10).totals.requests).toBe(0);

      // Auth & RBAC enforcement on GET /observability/web-vitals
      await request(app.getHttpServer())
        .get('/observability/web-vitals')
        .expect(401);

      await request(app.getHttpServer())
        .get('/observability/web-vitals')
        .set('x-test-role', 'NUTRITIONIST')
        .expect(403);

      await request(app.getHttpServer())
        .get('/observability/web-vitals?device=watch')
        .set('x-test-role', 'ADMIN')
        .expect(400);

      await request(app.getHttpServer())
        .get('/observability/web-vitals?top=0')
        .set('x-test-role', 'ADMIN')
        .expect(400);

      await request(app.getHttpServer())
        .get('/observability/web-vitals?unknown=1')
        .set('x-test-role', 'ADMIN')
        .expect(400);

      const snapshotRes = await request(app.getHttpServer())
        .get(
          '/observability/web-vitals?device=mobile&route=/clientes/:id/nova-dieta',
        )
        .set('x-test-role', 'ADMIN')
        .expect(200);

      expect(snapshotRes.headers['cache-control']).toBe('no-store');
      expect(snapshotRes.headers['server-timing']).toBeUndefined();
      expect(snapshotRes.body).toMatchObject({
        availableRoutes: ['/', '/clientes/:id/nova-dieta'],
        filters: { route: '/clientes/:id/nova-dieta', device: 'mobile' },
        totals: { samples: 1, trackedRoutes: 1, trackedSegments: 1 },
        segments: [
          {
            route: '/clientes/:id/nova-dieta',
            device: 'mobile',
            samples: 1,
          },
        ],
      });
      expect(JSON.stringify(snapshotRes.body)).not.toContain('Maria');
      expect(JSON.stringify(snapshotRes.body)).not.toContain(
        '11111111-1111-4111-8111-111111111111',
      );
    } finally {
      await app.close();
    }
  });
});
