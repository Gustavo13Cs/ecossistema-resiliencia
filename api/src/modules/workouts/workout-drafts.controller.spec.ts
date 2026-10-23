import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { WorkoutsModule } from './workouts.module';
import { WorkoutDraftsService } from './workout-drafts.service';
import { WorkoutTemplatesService } from './workout-templates.service';
import { WorkoutsService } from './workouts.service';
import { TrainingReadService } from './training-read.service';
import { ExerciseLibraryService } from './exercise-library.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CLINICAL_RESPONSE } from '../../common/decorators/clinical-response.decorator';
const id = '30000000-0000-4000-8000-000000000001';
class FixtureAuth implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user: unknown }>();
    req.user = { sub: id, role: req.headers['x-role'] };
    return true;
  }
}
describe('Workout draft HTTP controller', () => {
  let app: INestApplication<App>;
  const service = {
    list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    rebase: jest.fn(),
    finalize: jest.fn().mockResolvedValue({
      id,
      clientId: id,
      status: 'FINALIZED',
      version: 2,
      finalizedWorkoutId: id,
      workout: { id, clientId: id },
    }),
    discard: jest.fn(),
  };
  const controllers = Reflect.getMetadata(
    'controllers',
    WorkoutsModule,
  ) as Type<unknown>[];
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers,
      providers: [
        RolesGuard,
        { provide: WorkoutDraftsService, useValue: service },
        { provide: WorkoutTemplatesService, useValue: {} },
        { provide: WorkoutsService, useValue: {} },
        { provide: TrainingReadService, useValue: {} },
        { provide: ExerciseLibraryService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FixtureAuth)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => app?.close());
  beforeEach(() => jest.clearAllMocks());
  it('draft_route_is_not_workout_id', async () => {
    await request(app.getHttpServer())
      .get('/workouts/drafts?limit=2')
      .set('x-role', 'PERSONAL')
      .expect(200)
      .expect({ items: [], nextCursor: null });
  });
  it('rejects_non_personal_before_service', async () => {
    for (const role of ['ADMIN', 'NUTRITIONIST', 'PHYSIO', 'PATIENT'])
      await request(app.getHttpServer())
        .post('/workouts/drafts')
        .set('x-role', role)
        .send({ clientId: id, content: { title: '', splits: [] } })
        .expect(403);
    expect(service.create).not.toHaveBeenCalled();
  });
  it('rejects_owner_fields_and_invalid_uuid', async () => {
    await request(app.getHttpServer())
      .post('/workouts/drafts')
      .set('x-role', 'PERSONAL')
      .send({
        clientId: id,
        professionalId: id,
        content: { title: '', splits: [] },
      })
      .expect(400);
    await request(app.getHttpServer())
      .get('/workouts/drafts/not-uuid')
      .set('x-role', 'PERSONAL')
      .expect(400);
    await request(app.getHttpServer())
      .get('/workouts/drafts?clientId=invalid')
      .set('x-role', 'PERSONAL')
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });
  it('classifies all handlers and preserves finalize top level identity', async () => {
    const controller = controllers.find(
      (entry) => entry.name === 'WorkoutDraftsController',
    );
    expect(controller).toBeDefined();
    for (const [method, shape] of Object.entries({
      list: 'resource-page',
      create: 'resource',
      get: 'resource',
      update: 'resource',
      rebase: 'resource',
      finalize: 'resource',
      discard: 'ack',
    }))
      expect(
        Reflect.getMetadata(
          CLINICAL_RESPONSE,
          (controller!.prototype as Record<string, object>)[method],
        ),
      ).toEqual({ shape });
    await request(app.getHttpServer())
      .post(`/workouts/drafts/${id}/finalize`)
      .set('x-role', 'PERSONAL')
      .send({ expectedVersion: 1 })
      .expect(201)
      .expect({
        id,
        clientId: id,
        status: 'FINALIZED',
        version: 2,
        finalizedWorkoutId: id,
        workout: { id, clientId: id },
      });
  });
});
