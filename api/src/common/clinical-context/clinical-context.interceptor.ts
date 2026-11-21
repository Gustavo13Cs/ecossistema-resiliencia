import { randomUUID } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  OnApplicationBootstrap,
  Optional,
  HttpException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { HTTP_CODE_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { defer, lastValueFrom } from 'rxjs';
import { AuthenticatedRequest, AuthUser } from '../types/auth-user';
import {
  CLINICAL_RESPONSE,
  ClinicalResponsePolicy,
} from '../decorators/clinical-response.decorator';
import { ClinicalResponseValidator } from './clinical-response.validator';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  formatServerTiming,
  generateSpanId,
  generateTraceId,
  parseTraceparent,
  resolveRouteTemplate,
  safeErrorCode,
} from '../observability/log-redaction';
import {
  elapsedMs,
  readObservabilityConfig,
} from '../observability/observability.config';
import {
  createRequestTelemetry,
  getTotalDbMs,
  recordStageDuration,
  runWithRequestTelemetry,
} from '../observability/request-telemetry.context';
import { RequestMetricsService } from '../observability/request-metrics.service';
import { RequestTelemetryLogger } from '../observability/request-telemetry.logger';

type HttpResponseLike = {
  statusCode?: number;
  headersSent?: boolean;
  setHeader: (name: string, value: string) => void;
};

function extractRouteMetadata(route: unknown): { path?: unknown } | undefined {
  if (!route || typeof route !== 'object') return undefined;
  return { path: (route as { path?: unknown }).path };
}

function resolveSuccessStatus(
  reflector: Reflector,
  context: ExecutionContext,
  method: string,
  responseStatusCode?: number,
): number {
  const configuredCode = reflector.get<number | undefined>(
    HTTP_CODE_METADATA,
    context.getHandler(),
  );
  if (typeof configuredCode === 'number') return configuredCode;
  if (typeof responseStatusCode === 'number' && responseStatusCode !== 200) {
    return responseStatusCode;
  }
  return method.toUpperCase() === 'POST' ? 201 : 200;
}

@Injectable()
export class ClinicalContextInterceptor
  implements NestInterceptor, OnApplicationBootstrap
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly validator: ClinicalResponseValidator,
    @Optional() private readonly metrics?: RequestMetricsService,
    @Optional() private readonly telemetryLogger?: RequestTelemetryLogger,
  ) {}
  onApplicationBootstrap() {
    for (const { instance } of this.discovery.getControllers()) {
      if (!instance) continue;
      const prototype = Object.getPrototypeOf(instance) as object;
      for (const name of this.scanner.getAllMethodNames(prototype)) {
        const handler = (instance as Record<string, unknown>)[name];
        if (
          typeof handler !== 'function' ||
          Reflect.getMetadata(METHOD_METADATA, handler) === undefined
        )
          continue;
        if (
          !this.reflector.get<ClinicalResponsePolicy>(
            CLINICAL_RESPONSE,
            handler,
          )
        )
          throw new Error(
            'Unclassified HTTP handler: ' +
              (instance as { constructor: { name: string } }).constructor.name +
              '.' +
              name,
          );
      }
    }
  }
  intercept(context: ExecutionContext, next: CallHandler) {
    return defer(async () => {
      const policy = this.reflector.get<ClinicalResponsePolicy>(
        CLINICAL_RESPONSE,
        context.getHandler(),
      );
      if (!policy)
        throw new InternalServerErrorException('Operação indisponível');
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const response = context.switchToHttp().getResponse<HttpResponseLike>();
      const requestId = randomUUID();
      if (!response.headersSent) {
        response.setHeader('X-Request-Id', requestId);
      }

      const config = readObservabilityConfig();
      const incomingTrace = parseTraceparent(request.headers?.traceparent);
      const method = (request.method || 'UNKNOWN').toUpperCase();
      const route = resolveRouteTemplate({
        method,
        baseUrl: request.baseUrl,
        route: extractRouteMetadata(request.route),
        originalUrl: request.originalUrl,
        url: request.url,
      });
      const policyTag = 'exception' in policy ? policy.exception : policy.shape;
      const role = (request as { user?: AuthUser }).user?.role ?? 'anonymous';
      const telemetry = createRequestTelemetry({
        requestId,
        traceId: incomingTrace?.traceId ?? generateTraceId(),
        spanId: generateSpanId(),
        parentSpanId: incomingTrace?.parentSpanId,
        method,
        route,
        policy: policyTag,
        role,
      });

      const isNonClinicalException =
        'exception' in policy &&
        (policy.exception === 'auth' ||
          policy.exception === 'health' ||
          policy.exception === 'observability');

      let statusCode = resolveSuccessStatus(
        this.reflector,
        context,
        method,
        response.statusCode,
      );
      let errorCode: string | undefined;

      try {
        return await runWithRequestTelemetry(telemetry, async () => {
          if (isNonClinicalException) {
            const handlerStartNs = process.hrtime.bigint();
            const value: unknown = await lastValueFrom<unknown>(next.handle());
            recordStageDuration('handlerMs', elapsedMs(handlerStartNs));
            return value;
          }

          if (!response.headersSent) {
            response.setHeader('Cache-Control', 'no-store');
          }

          const result = await this.prisma.runAsProfessional(
            request.user,
            requestId,
            async () => {
              const handlerStartNs = process.hrtime.bigint();
              const value: unknown = await lastValueFrom<unknown>(
                next.handle(),
              );
              recordStageDuration('handlerMs', elapsedMs(handlerStartNs));
              if (!('exception' in policy)) {
                const validationStartNs = process.hrtime.bigint();
                await this.validator.validate(policy, value);
                recordStageDuration(
                  'validationMs',
                  elapsedMs(validationStartNs),
                );
              }
              return value;
            },
            'exception' in policy ? undefined : policy.isolation,
          );

          if (config.serverTimingEnabled && !response.headersSent) {
            response.setHeader(
              'Server-Timing',
              formatServerTiming({
                totalMs: elapsedMs(telemetry.startedAtNs),
                dbMs: getTotalDbMs(telemetry),
                ...telemetry.stages,
              }),
            );
          }
          return result;
        });
      } catch (error) {
        if (error instanceof HttpException) {
          statusCode = error.getStatus();
          errorCode = safeErrorCode(error);
          throw error;
        }
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2034'
        ) {
          statusCode = 409;
          errorCode = 'P2034';
          throw new ConflictException(
            'Operação concorrente. Atualize os dados e tente novamente.',
          );
        }
        statusCode = 500;
        errorCode = safeErrorCode(error);
        // Não propagar query, payload, DSN ou metadados do erro de persistência.
        throw new InternalServerErrorException('Operação indisponível');
      } finally {
        const totalMs = elapsedMs(telemetry.startedAtNs);
        const dbMs = getTotalDbMs(telemetry);
        const slow = totalMs >= config.slowRequestMs;
        const isObservabilityRoute =
          'exception' in policy && policy.exception === 'observability';

        if (!isObservabilityRoute) {
          this.metrics?.recordRequest({
            route: telemetry.route,
            statusCode,
            totalMs,
            dbMs,
            dbQueryCount: telemetry.db.queryCount,
            slow,
            requestId: telemetry.requestId,
            traceId: telemetry.traceId,
          });
        }

        this.telemetryLogger?.logRequestCompleted(
          {
            requestId: telemetry.requestId,
            traceId: telemetry.traceId,
            spanId: telemetry.spanId,
            ...(telemetry.parentSpanId
              ? { parentSpanId: telemetry.parentSpanId }
              : {}),
            method: telemetry.method,
            route: telemetry.route,
            policy: telemetry.policy,
            role: telemetry.role,
            statusCode,
            totalMs,
            dbMs,
            dbQueryCount: telemetry.db.queryCount,
            slowQueryCount: telemetry.db.slowQueryCount,
            slowestQueryMs: telemetry.db.slowestQueryMs,
            ...(telemetry.db.slowestOperation
              ? { slowestOperation: telemetry.db.slowestOperation }
              : {}),
            ...(telemetry.db.slowestTarget
              ? { slowestTarget: telemetry.db.slowestTarget }
              : {}),
            dbSources: Array.from(telemetry.db.sources),
            ...telemetry.stages,
            slow,
            ...(errorCode ? { errorCode } : {}),
          },
          config,
        );
      }
    });
  }
}
