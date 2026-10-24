import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { CLINICAL_RESPONSE } from '../../common/decorators/clinical-response.decorator';
import { TrainingReadService } from './training-read.service';
import { ExerciseLibraryService } from './exercise-library.service';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';

describe('WorkoutsController Client contract', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'PERSONAL' };
  const clientId = 'a0000000-0000-4000-8000-000000000001';
  const service = {
    create: jest.fn(),
    findActive: jest.fn(),
    findActiveByUser: jest.fn(),
    listTemplates: jest.fn(),
  };
  const readService = {
    getWorkspace: jest.fn(),
    getClientOverview: jest.fn(),
    getWorkout: jest.fn(),
  };
  const exerciseLibraryService = {
    list: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    get: jest.fn(),
    updateVideo: jest.fn(),
  };
  const body = {
    clientId,
    title: 'Plano de treino',
    durationWeeks: 4,
    splits: [
      {
        name: 'A',
        exercises: [{ name: 'Agachamento', sets: '3', reps: '10' }],
      },
    ],
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WorkoutsController],
      providers: [
        RolesGuard,
        { provide: WorkoutsService, useValue: service },
        { provide: TrainingReadService, useValue: readService },
        { provide: ExerciseLibraryService, useValue: exerciseLibraryService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp(): { getRequest(): { user?: AuthUser } };
        }) {
          context.switchToHttp().getRequest().user = user;
          return true;
        },
      })
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
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    service.create.mockResolvedValue({ id: 'workout-1', clientId });
    service.findActive.mockResolvedValue(null);
    service.findActiveByUser.mockResolvedValue(null);
    service.listTemplates.mockResolvedValue([]);
    exerciseLibraryService.list.mockResolvedValue([]);
    exerciseLibraryService.create.mockResolvedValue({
      id: clientId,
      name: 'Agachamento pausa',
      muscleGroup: 'QUADRICEPS',
      equipment: 'BARBELL',
      notes: null,
      source: 'CUSTOM',
    });
    exerciseLibraryService.remove.mockResolvedValue({ id: clientId });
    readService.getWorkspace.mockResolvedValue({
      counts: {
        activeStudents: 0,
        archivedStudents: 0,
        withoutActiveWorkout: 0,
      },
      items: [],
    });
    readService.getClientOverview.mockResolvedValue({
      client: { id: clientId, status: 'ACTIVE' },
      activeWorkout: null,
      recentAssessments: [],
    });
    readService.getWorkout.mockResolvedValue({
      id: clientId,
      clientId,
      updatedAt: new Date('2026-10-14T12:00:00Z'),
    });
  });

  it('creates with Client identity and the complete authenticated professional', async () => {
    await request(app.getHttpServer()).post('/workouts').send(body).expect(201);
    expect(service.create).toHaveBeenCalledWith(user, body);
  });

  it('accepts valid advanced exercise parameters on workout creation', async () => {
    const advancedBody = {
      ...body,
      splits: [
        {
          name: 'Treino A',
          focus: 'Inferiores',
          exercises: [
            {
              name: 'Agachamento livre',
              sets: '4',
              reps: '6-8',
              rest: '120s',
              muscleGroup: 'QUADRICEPS',
              load: '80 kg (75% 1RM)',
              effortType: 'RIR',
              effortTarget: '1-2',
              tempo: '3-1-X-0',
              method: 'REST_PAUSE',
              notes: 'Manter tronco firme',
            },
          ],
        },
      ],
    };
    await request(app.getHttpServer())
      .post('/workouts')
      .send(advancedBody)
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(user, advancedBody);
  });

  it.each(['userId', 'patientId', 'creatorId', 'professionalId'])(
    'rejects the internal field %s before mutation',
    async (field) => {
      await request(app.getHttpServer())
        .post('/workouts')
        .send({ ...body, [field]: clientId })
        .expect(400);
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    { clientId: 'not-a-uuid' },
    { title: '' },
    { durationWeeks: -1 },
    { durationWeeks: 1.5 },
    { splits: [] },
    {
      splits: [{ name: 'A', exercises: [{ name: '', sets: '3', reps: '10' }] }],
    },
    {
      splits: [
        {
          name: 'A',
          position: 0,
          exercises: [{ name: 'Agachamento', sets: '3', reps: '10' }],
        },
      ],
    },
    {
      splits: [
        {
          name: 'A',
          exercises: [
            {
              name: 'Agachamento',
              sets: '3',
              reps: '10',
              tempo: 'lento',
            },
          ],
        },
      ],
    },
    {
      splits: [
        {
          name: 'A',
          exercises: [
            {
              name: 'Agachamento',
              sets: '3',
              reps: '10',
              effortType: 'RIR',
            },
          ],
        },
      ],
    },
    {
      splits: [
        {
          name: 'A',
          exercises: [
            {
              name: 'Agachamento',
              sets: '3',
              reps: '10',
              effortTarget: '2',
            },
          ],
        },
      ],
    },
    {
      splits: [
        {
          name: 'A',
          exercises: [
            {
              name: 'Agachamento',
              sets: '3',
              reps: '10',
              muscleGroup: 'INVALID_GROUP',
            },
          ],
        },
      ],
    },
  ])('rejects invalid or unbounded plan input %j', async (invalid) => {
    await request(app.getHttpServer())
      .post('/workouts')
      .send({ ...body, ...invalid })
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('serves and mutates the exercise library before the generic workout route', async () => {
    await request(app.getHttpServer())
      .get('/workouts/exercise-library?q=supino&muscleGroup=CHEST')
      .expect(200);
    expect(exerciseLibraryService.list).toHaveBeenCalledWith(user, {
      q: 'supino',
      muscleGroup: 'CHEST',
    });
    expect(readService.getWorkout).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .post('/workouts/exercise-library')
      .send({
        name: 'Agachamento pausa',
        muscleGroup: 'QUADRICEPS',
        equipment: 'BARBELL',
      })
      .expect(201);
    expect(exerciseLibraryService.create).toHaveBeenCalledWith(user, {
      name: 'Agachamento pausa',
      muscleGroup: 'QUADRICEPS',
      equipment: 'BARBELL',
    });

    await request(app.getHttpServer())
      .delete(`/workouts/exercise-library/${clientId}`)
      .expect(200);
    expect(exerciseLibraryService.remove).toHaveBeenCalledWith(user, clientId);

    expect(
      Reflect.getMetadata(
        CLINICAL_RESPONSE,
        WorkoutsController.prototype['listExerciseLibrary'],
      ),
    ).toEqual({ exception: 'catalog' });
    expect(
      Reflect.getMetadata(
        CLINICAL_RESPONSE,
        WorkoutsController.prototype['createCustomExercise'],
      ),
    ).toEqual({ exception: 'catalog' });
    expect(
      Reflect.getMetadata(
        CLINICAL_RESPONSE,
        WorkoutsController.prototype['removeCustomExercise'],
      ),
    ).toEqual({ shape: 'ack' });
  });

  it('serves catalog IDs without UUID parsing and patches only custom UUIDs', async () => {
    await request(app.getHttpServer())
      .get('/workouts/exercise-library/cat-chest-01')
      .expect(200);
    expect(exerciseLibraryService.get).toHaveBeenCalledWith(
      user,
      'cat-chest-01',
    );
    expect(readService.getWorkout).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .patch(`/workouts/exercise-library/${clientId}`)
      .send({ expectedMediaVersion: 1, videoUrl: null })
      .expect(200);
    expect(exerciseLibraryService.updateVideo).toHaveBeenCalledWith(
      user,
      clientId,
      { expectedMediaVersion: 1, videoUrl: null },
    );
    for (const method of [
      'getExerciseLibraryDetail',
      'updateExerciseVideo',
    ] as const) {
      expect(
        Reflect.getMetadata(
          CLINICAL_RESPONSE,
          WorkoutsController.prototype[method],
        ),
      ).toEqual({ exception: 'catalog' });
    }
    await request(app.getHttpServer())
      .patch('/workouts/exercise-library/cat-chest-01')
      .send({ expectedMediaVersion: 1, videoUrl: null })
      .expect(400);
  });
  it.each([
    {},
    { expectedMediaVersion: 1 },
    { expectedMediaVersion: 0, videoUrl: null },
    { expectedMediaVersion: 1.5, videoUrl: null },
    { expectedMediaVersion: '1', videoUrl: null },
    { expectedMediaVersion: 1, videoUrl: 22 },
    { expectedMediaVersion: 1, videoUrl: null, mediaVersion: 2 },
    { expectedMediaVersion: 1, videoUrl: 'x'.repeat(2049) },
  ])('rejects invalid video mutation %j', async (body) => {
    await request(app.getHttpServer())
      .patch(`/workouts/exercise-library/${clientId}`)
      .send(body)
      .expect(400);
    expect(exerciseLibraryService.updateVideo).not.toHaveBeenCalled();
  });
  it('rejects mediaVersion assignment at custom creation and accepts optional video URL', async () => {
    await request(app.getHttpServer())
      .post('/workouts/exercise-library')
      .send({ name: 'Teste', muscleGroup: 'CHEST', mediaVersion: 9 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/workouts/exercise-library')
      .send({
        name: 'Teste',
        muscleGroup: 'CHEST',
        videoUrl: 'https://vimeo.com/123',
      })
      .expect(201);
    await request(app.getHttpServer())
      .get('/workouts/exercise-library?equipment=BARBELL')
      .expect(200);
    expect(exerciseLibraryService.list).toHaveBeenCalledWith(user, {
      equipment: 'BARBELL',
    });
    await request(app.getHttpServer())
      .get('/workouts/exercise-library?equipment=invalid')
      .expect(400);
  });

  it('reads the active plan through the Client route', async () => {
    await request(app.getHttpServer())
      .get(`/workouts/client/${clientId}/active`)
      .expect(200);
    expect(service.findActive).toHaveBeenCalledWith(user, clientId);
  });

  it('does not expose the legacy User route', async () => {
    await request(app.getHttpServer())
      .get(`/workouts/user/${clientId}/active`)
      .expect(404);
    expect(service.findActiveByUser).not.toHaveBeenCalled();
  });

  it('serves the workspace as a classified resource page', async () => {
    await request(app.getHttpServer()).get('/workouts/workspace').expect(200);
    expect(readService.getWorkspace).toHaveBeenCalledWith(user);
    expect(
      Reflect.getMetadata(
        CLINICAL_RESPONSE,
        WorkoutsController.prototype['getWorkspace'],
      ),
    ).toEqual({ shape: 'resource-page' });
  });

  it('serves a classified training overview', async () => {
    await request(app.getHttpServer())
      .get(`/workouts/client/${clientId}/overview`)
      .expect(200);
    expect(readService.getClientOverview).toHaveBeenCalledWith(user, clientId);
    expect(
      Reflect.getMetadata(
        CLINICAL_RESPONSE,
        WorkoutsController.prototype['getClientOverview'],
      ),
    ).toEqual({ shape: 'overview' });
  });

  it('serves the selected workout with ISO dates and resource classification', async () => {
    const response = await request(app.getHttpServer())
      .get(`/workouts/${clientId}`)
      .expect(200);
    expect(response.body).toMatchObject({
      updatedAt: '2026-10-14T12:00:00.000Z',
    });
    expect(readService.getWorkout).toHaveBeenCalledWith(user, clientId);
    expect(
      Reflect.getMetadata(
        CLINICAL_RESPONSE,
        WorkoutsController.prototype['getWorkout'],
      ),
    ).toEqual({ shape: 'resource' });
  });

  it.each(['/workouts/not-a-uuid', '/workouts/client/not-a-uuid/overview'])(
    'rejects invalid UUID on %s before querying',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(400);
      expect(readService.getClientOverview).not.toHaveBeenCalled();
      expect(readService.getWorkout).not.toHaveBeenCalled();
    },
  );

  it('leaves template bank routes to the dedicated controller', () => {
    expect(
      Object.getOwnPropertyNames(WorkoutsController.prototype),
    ).not.toContain('listTemplates');
  });

  it.each(['getClientOverview', 'getWorkout'] as const)(
    'preserves ownership 404 for %s',
    async (method) => {
      readService[method].mockRejectedValueOnce(new NotFoundException());
      const path =
        method === 'getWorkout'
          ? `/workouts/${clientId}`
          : `/workouts/client/${clientId}/overview`;
      await request(app.getHttpServer()).get(path).expect(404);
    },
  );
});
