import { INestApplication, ValidationPipe } from '@nestjs/common';
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
      providers: [RolesGuard, { provide: WorkoutsService, useValue: service }],
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
  });

  it('creates with Client identity and the complete authenticated professional', async () => {
    await request(app.getHttpServer()).post('/workouts').send(body).expect(201);
    expect(service.create).toHaveBeenCalledWith(user, body);
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
  ])('rejects invalid or unbounded plan input %j', async (invalid) => {
    await request(app.getHttpServer())
      .post('/workouts')
      .send({ ...body, ...invalid })
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
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
});
