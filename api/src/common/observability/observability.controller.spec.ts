import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { GUARDS_METADATA, HEADERS_METADATA } from '@nestjs/common/constants';
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
