import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { JwtStrategy } from '../src/common/strategies/jwt.strategy';
import { AnamnesesController } from '../src/modules/anamneses/anamneses.controller';
import { AnamnesesService } from '../src/modules/anamneses/anamneses.service';
import { AssessmentsController } from '../src/modules/assessments/assessments.controller';
import { AssessmentsService } from '../src/modules/assessments/assessments.service';
import { ConsultationNotesController } from '../src/modules/consultation-notes/consultation-notes.controller';
import { ConsultationNotesService } from '../src/modules/consultation-notes/consultation-notes.service';
import { DietPlansController } from '../src/modules/diet-plans/diet-plans.controller';
import { DietPlansService } from '../src/modules/diet-plans/diet-plans.service';
import { FoodsController } from '../src/modules/foods/foods.controller';
import { FoodsService } from '../src/modules/foods/foods.service';
import { LabExamsController } from '../src/modules/lab-exams/lab-exams.controller';
import { LabExamsService } from '../src/modules/lab-exams/lab-exams.service';
import { MetricsController } from '../src/modules/metrics/metrics.controller';
import { MetricsService } from '../src/modules/metrics/metrics.service';
import { PhysioAssessmentsController } from '../src/modules/physio-assessments/physio-assessments.controller';
import { PhysioAssessmentsService } from '../src/modules/physio-assessments/physio-assessments.service';
import { RehabPlansController } from '../src/modules/rehab-plans/rehab-plans.controller';
import { RehabPlansService } from '../src/modules/rehab-plans/rehab-plans.service';
import { SupplementsController } from '../src/modules/supplements/supplements.controller';
import { SupplementsService } from '../src/modules/supplements/supplements.service';
import { WorkoutsController } from '../src/modules/workouts/workouts.controller';
import { WorkoutsService } from '../src/modules/workouts/workouts.service';

type TestRole = 'NUTRITIONIST' | 'PERSONAL' | 'PHYSIO' | 'ADMIN' | 'PATIENT';

type TestRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: { sub: string; role: TestRole };
};

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<TestRequest>();
    req.user = {
      sub: String(req.headers['x-test-user-id']),
      role: String(req.headers['x-test-role']) as TestRole,
    };
    return true;
  }
}

const PROFESSIONAL_ID = '30000000-0000-4000-8000-000000000001';

describe('Professional domain boundaries (e2e)', () => {
  let app: INestApplication<App>;
  let realJwtApp: INestApplication<App>;
  let originalJwtSecret: string | undefined;

  const dietPlansService = {
    saveAsTemplate: jest.fn().mockResolvedValue({ id: 'diet-template' }),
  };
  const workoutsService = {
    saveAsTemplate: jest.fn().mockResolvedValue({ id: 'workout-template' }),
  };
  const rehabPlansService = {
    saveAsTemplate: jest.fn().mockResolvedValue({ id: 'rehab-template' }),
  };
  const metricsService = {
    getTodayLogs: jest.fn().mockResolvedValue([]),
  };

  const asRole = (role: TestRole) => ({
    'x-test-user-id': PROFESSIONAL_ID,
    'x-test-role': role,
  });

  beforeAll(async () => {
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'professional-domain-e2e-only-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        FoodsController,
        AssessmentsController,
        AnamnesesController,
        LabExamsController,
        PhysioAssessmentsController,
        SupplementsController,
        DietPlansController,
        WorkoutsController,
        RehabPlansController,
        ConsultationNotesController,
        MetricsController,
      ],
      providers: [
        RolesGuard,
        { provide: FoodsService, useValue: {} },
        { provide: AssessmentsService, useValue: {} },
        { provide: AnamnesesService, useValue: {} },
        { provide: LabExamsService, useValue: {} },
        { provide: PhysioAssessmentsService, useValue: {} },
        { provide: SupplementsService, useValue: {} },
        { provide: DietPlansService, useValue: dietPlansService },
        { provide: WorkoutsService, useValue: workoutsService },
        { provide: RehabPlansService, useValue: rehabPlansService },
        { provide: ConsultationNotesService, useValue: {} },
        { provide: MetricsService, useValue: metricsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const realJwtModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [MetricsController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    realJwtApp = realJwtModule.createNestApplication();
    await realJwtApp.init();
  });

  afterAll(async () => {
    await Promise.all([app?.close(), realJwtApp?.close()]);
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      domain: 'nutrition',
      allowedRoles: ['NUTRITIONIST'] as TestRole[],
      deniedRoles: ['PERSONAL', 'PHYSIO', 'ADMIN'] as TestRole[],
      invoke: (role: TestRole) =>
        request(app.getHttpServer())
          .patch('/diet-plans/plan-1/save-as-template')
          .set(asRole(role)),
      serviceMethod: dietPlansService.saveAsTemplate,
    },
    {
      domain: 'training',
      allowedRoles: ['PERSONAL'] as TestRole[],
      deniedRoles: ['NUTRITIONIST', 'PHYSIO', 'ADMIN'] as TestRole[],
      invoke: (role: TestRole) =>
        request(app.getHttpServer())
          .patch('/workouts/workout-1/save-as-template')
          .set(asRole(role)),
      serviceMethod: workoutsService.saveAsTemplate,
    },
    {
      domain: 'rehabilitation',
      allowedRoles: ['PHYSIO'] as TestRole[],
      deniedRoles: ['NUTRITIONIST', 'PERSONAL', 'ADMIN'] as TestRole[],
      invoke: (role: TestRole) =>
        request(app.getHttpServer())
          .patch('/rehab-plans/rehab-1/save-as-template')
          .set(asRole(role)),
      serviceMethod: rehabPlansService.saveAsTemplate,
    },
    {
      domain: 'sharedAssessment',
      allowedRoles: ['NUTRITIONIST', 'PERSONAL', 'PHYSIO'] as TestRole[],
      deniedRoles: ['ADMIN', 'PATIENT'] as TestRole[],
      invoke: (role: TestRole) =>
        request(app.getHttpServer())
          .get('/metrics/today/patient-1')
          .set(asRole(role)),
      serviceMethod: metricsService.getTodayLogs,
    },
  ])(
    '$domain permits only its policy roles before invoking service logic',
    async ({ allowedRoles, deniedRoles, invoke, serviceMethod }) => {
      for (const role of allowedRoles) {
        await invoke(role).expect(200);
      }

      expect(serviceMethod).toHaveBeenCalledTimes(allowedRoles.length);
      serviceMethod.mockClear();

      for (const role of deniedRoles) {
        await invoke(role).expect(403);
      }

      expect(serviceMethod).not.toHaveBeenCalled();
    },
  );

  it('rejects unauthenticated metrics requests through the real JWT guard', async () => {
    await request(realJwtApp.getHttpServer())
      .get('/metrics/today/patient-1')
      .expect(401);

    expect(metricsService.getTodayLogs).not.toHaveBeenCalled();
  });
});
