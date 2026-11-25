import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { RehabPlansController } from './rehab-plans.controller';
import { RehabPlansService } from './rehab-plans.service';
import { PhysioReadService } from './physio-read.service';

describe('RehabPlansController Client contract', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'PHYSIO' };
  const clientId = 'a0000000-0000-4000-8000-000000000001';
  const planId = 'b0000000-0000-4000-8000-000000000002';
  const service = {
    create: jest.fn(),
    update: jest.fn(),
    updateCurrentPhase: jest.fn(),
    createTemplate: jest.fn(),
    getProtocolCatalog: jest.fn(),
    getExerciseCatalog: jest.fn(),
    findActive: jest.fn(),
    findActiveByUser: jest.fn(),
  };
  const physioReadService = {
    getWorkspace: jest.fn(),
    getClientOverview: jest.fn(),
  };
  const body = {
    clientId,
    title: 'Plano de treino',
    durationWeeks: 4,
    sessions: [
      {
        name: 'A',
        exercises: [{ name: 'Agachamento', sets: '3', reps: '10' }],
      },
    ],
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RehabPlansController],
      providers: [
        RolesGuard,
        { provide: RehabPlansService, useValue: service },
        { provide: PhysioReadService, useValue: physioReadService },
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
    service.update.mockResolvedValue({ id: planId, clientId });
    service.updateCurrentPhase.mockResolvedValue({
      id: planId,
      clientId,
      currentPhaseIndex: 0,
    });
    service.createTemplate.mockResolvedValue({
      id: 'template-1',
      clientId: null,
      isTemplate: true,
    });
    service.getProtocolCatalog.mockReturnValue([]);
    service.getExerciseCatalog.mockReturnValue([]);
    service.findActive.mockResolvedValue(null);
    service.findActiveByUser.mockResolvedValue(null);
  });

  it('creates with Client identity and the complete authenticated professional', async () => {
    await request(app.getHttpServer())
      .post('/rehab-plans')
      .send(body)
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(user, body);
  });

  it.each(['userId', 'patientId', 'creatorId', 'professionalId'])(
    'rejects the internal field %s before mutation',
    async (field) => {
      await request(app.getHttpServer())
        .post('/rehab-plans')
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
    { sessions: [] },
    {
      sessions: [
        { name: 'A', exercises: [{ name: '', sets: '3', reps: '10' }] },
      ],
    },
  ])('rejects invalid or unbounded plan input %j', async (invalid) => {
    await request(app.getHttpServer())
      .post('/rehab-plans')
      .send({ ...body, ...invalid })
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('reads the active plan through the Client route', async () => {
    await request(app.getHttpServer())
      .get(`/rehab-plans/client/${clientId}/active`)
      .expect(200);
    expect(service.findActive).toHaveBeenCalledWith(user, clientId);
  });

  it('does not expose the legacy User route', async () => {
    await request(app.getHttpServer())
      .get(`/rehab-plans/user/${clientId}/active`)
      .expect(404);
    expect(service.findActiveByUser).not.toHaveBeenCalled();
  });

  it('rejects client-injected demonstrationSnapshot in DTO validation', async () => {
    await request(app.getHttpServer())
      .post('/rehab-plans')
      .send({
        ...body,
        sessions: [
          {
            name: 'Fase 1',
            exercises: [
              {
                name: 'Dead bug',
                catalogExerciseId: 'cat-core-10',
                demonstrationSnapshot: {
                  revision: 'spoofed',
                  instruction: 'evil',
                },
              },
            ],
          },
        ],
      })
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('routes PATCH plan, PATCH phase, custom template creation and catalogs', async () => {
    await request(app.getHttpServer())
      .patch(`/rehab-plans/${planId}`)
      .send({
        title: 'Protocolo Atualizado',
        currentPhaseIndex: 0,
        sessions: [
          {
            name: 'Fase 1',
            progressionCriteria: 'Sem dor em repouso',
            estimatedWeeks: 3,
            exercises: [
              {
                name: 'TENS',
                category: 'ELECTROTHERAPY',
                modalityParams: { modality: 'TENS', durationMinutes: 20 },
              },
            ],
          },
        ],
      })
      .expect(200);
    expect(service.update).toHaveBeenCalledWith(
      user,
      planId,
      expect.objectContaining({ title: 'Protocolo Atualizado' }),
    );

    await request(app.getHttpServer())
      .patch(`/rehab-plans/${planId}/phase`)
      .send({ currentPhaseIndex: 1 })
      .expect(200);
    expect(service.updateCurrentPhase).toHaveBeenCalledWith(user, planId, {
      currentPhaseIndex: 1,
    });

    await request(app.getHttpServer())
      .post('/rehab-plans/templates')
      .send({
        title: 'Modelo Lombar',
        sessions: body.sessions,
      })
      .expect(201);
    expect(service.createTemplate).toHaveBeenCalled();

    await request(app.getHttpServer())
      .get('/rehab-plans/protocol-catalog')
      .expect(200);
    expect(service.getProtocolCatalog).toHaveBeenCalledWith(user);

    await request(app.getHttpServer())
      .get('/rehab-plans/exercise-catalog?onlyWithIllustration=true')
      .expect(200);
    expect(service.getExerciseCatalog).toHaveBeenCalledWith(user, {
      onlyWithIllustration: 'true',
    });
  });
});
