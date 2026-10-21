import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule, GLOBAL_JWT_AUTH_GUARD } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { JwtStrategy } from '../src/common/strategies/jwt.strategy';
import { AuthUser } from '../src/common/types/auth-user';
import { PrismaService } from '../src/infra/database/prisma.service';
import { AuthSessionService } from '../src/modules/auth/auth-session.service';
import { ExerciseLibraryService } from '../src/modules/workouts/exercise-library.service';
import { TrainingReadService } from '../src/modules/workouts/training-read.service';
import { WorkoutsController } from '../src/modules/workouts/workouts.controller';
import { WorkoutsService } from '../src/modules/workouts/workouts.service';
import {
  assertIsolationDatabase,
  clearIsolationFixtures,
  isolationFixtures,
  seedIsolationFixtures,
} from './fixtures/client-isolation';
import { testAdminPrisma } from './fixtures/test-admin';

class FixtureAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user: AuthUser }>();
    req.user = {
      sessionId: 'synthetic-training-workspace-session',
      sub: req.headers['x-test-user-id'],
      role: req.headers['x-test-role'] as AuthUser['role'],
    };
    return true;
  }
}

const studentUuid = (index: number) =>
  `82000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const workoutUuid = (index: number) =>
  `83000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const assessmentUuid = (index: number) =>
  `84000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

describe('Personal training workspace & read projections (PostgreSQL E2E)', () => {
  let app: INestApplication<App>;
  let unauthenticatedApp: INestApplication<App>;
  let prisma: PrismaService;

  const personalA = isolationFixtures.training.a;
  const personalB = isolationFixtures.training.b;
  const nutritionist = isolationFixtures.nutrition.a;
  const physio = isolationFixtures.physio.a;

  const extraClientIds = Array.from({ length: 8 }, (_, index) =>
    studentUuid(index + 1),
  );
  const seededWorkoutIds = [
    workoutUuid(1),
    workoutUuid(2),
    workoutUuid(3),
    workoutUuid(4),
    workoutUuid(5),
  ];
  const seededAssessmentIds = [
    assessmentUuid(1),
    assessmentUuid(2),
    assessmentUuid(3),
  ];

  const asUser = (user: { sub: string; role: string }) => ({
    'x-test-user-id': user.sub,
    'x-test-role': user.role,
  });

  const cleanExtraFixtures = async () => {
    await prisma.workoutDraft.deleteMany({
      where: { clientId: { in: extraClientIds } },
    });
    await prisma.physicalAssessment.deleteMany({
      where: { id: { in: seededAssessmentIds } },
    });
    await prisma.workout.deleteMany({
      where: { id: { in: seededWorkoutIds } },
    });
    await prisma.clientAuditEvent.deleteMany({
      where: { clientId: { in: extraClientIds } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: extraClientIds } },
    });
  };

  beforeAll(async () => {
    assertIsolationDatabase();
    prisma = testAdminPrisma();
    await prisma.$connect();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FixtureAuthGuard)
      .overrideProvider(GLOBAL_JWT_AUTH_GUARD)
      .useClass(FixtureAuthGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const realJwtModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [WorkoutsController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: AuthSessionService,
          useValue: { validateAccess: jest.fn() },
        },
        { provide: WorkoutsService, useValue: {} },
        { provide: TrainingReadService, useValue: {} },
        { provide: ExerciseLibraryService, useValue: {} },
      ],
    }).compile();

    unauthenticatedApp = realJwtModule.createNestApplication();
    await unauthenticatedApp.init();
  });

  beforeEach(async () => {
    await cleanExtraFixtures();
    await seedIsolationFixtures(prisma);

    // Personal A starts with isolationFixtures.training.clientA (ACTIVE)
    // Add 6 more ACTIVE students (total 7 ACTIVE) and 2 ARCHIVED students for Personal A
    const baseTime = new Date('2026-10-10T12:00:00.000Z').getTime();
    await prisma.client.update({
      where: { id: isolationFixtures.training.clientA },
      data: {
        name: 'Aluno Ativo 1',
        goal: 'Força máxima',
        privacyNotes: 'Nota privada sigilosa',
        professionalNotes: 'Nota profissional interna',
        pathologies: 'Condromalácia',
        updatedAt: new Date(baseTime + 7_000),
      },
    });

    await prisma.client.createMany({
      data: [
        {
          id: studentUuid(1),
          professionalId: personalA.sub,
          name: 'Aluno Ativo 2 (Treino Modelo Legado)',
          goal: 'Hipertrofia',
          status: 'ACTIVE',
          updatedAt: new Date(baseTime + 6_000),
        },
        {
          id: studentUuid(2),
          professionalId: personalA.sub,
          name: 'Aluno Sem Treino 1',
          goal: 'Condicionamento',
          status: 'ACTIVE',
          updatedAt: new Date(baseTime + 5_000),
        },
        {
          id: studentUuid(3),
          professionalId: personalA.sub,
          name: 'Aluno Sem Treino 2',
          goal: 'Resistência',
          status: 'ACTIVE',
          updatedAt: new Date(baseTime + 4_000),
        },
        {
          id: studentUuid(4),
          professionalId: personalA.sub,
          name: 'Aluno Sem Treino 3',
          goal: 'Mobilidade',
          status: 'ACTIVE',
          updatedAt: new Date(baseTime + 3_000),
        },
        {
          id: studentUuid(5),
          professionalId: personalA.sub,
          name: 'Aluno Sem Treino 4',
          goal: 'Potência',
          status: 'ACTIVE',
          updatedAt: new Date(baseTime + 2_000),
        },
        {
          id: studentUuid(6),
          professionalId: personalA.sub,
          name: 'Aluno Sem Treino 5',
          goal: 'Recondicionamento',
          status: 'ACTIVE',
          updatedAt: new Date(baseTime + 1_000),
        },
        {
          id: studentUuid(7),
          professionalId: personalA.sub,
          name: 'Aluno Arquivado 1',
          goal: 'Histórico 1',
          status: 'ARCHIVED',
          updatedAt: new Date(baseTime + 9_000),
        },
        {
          id: studentUuid(8),
          professionalId: personalA.sub,
          name: 'Aluno Arquivado 2',
          goal: 'Histórico 2',
          status: 'ARCHIVED',
          updatedAt: new Date(baseTime + 8_000),
        },
      ],
    });

    // Workouts for Personal A & Personal B
    await prisma.workout.create({
      data: {
        id: workoutUuid(1),
        clientId: isolationFixtures.training.clientA,
        creatorId: personalA.sub,
        title: 'Ficha Anterior de Adaptação',
        goal: 'Adaptação',
        durationWeeks: 4,
        isActive: false,
        isTemplate: false,
        splits: {
          create: [
            {
              name: 'Treino A',
              focus: 'Geral',
              exercises: {
                create: [{ name: 'Agachamento Goblet', sets: '3', reps: '12' }],
              },
            },
          ],
        },
      },
    });

    await prisma.workout.create({
      data: {
        id: workoutUuid(2),
        clientId: isolationFixtures.training.clientA,
        creatorId: personalA.sub,
        title: 'Ficha Ativa de Força',
        goal: 'Força máxima',
        durationWeeks: 8,
        isActive: true,
        isTemplate: false,
        splits: {
          create: [
            {
              name: 'Treino A',
              focus: 'Inferiores',
              exercises: {
                create: [
                  {
                    name: 'Agachamento Livre',
                    sets: '5',
                    reps: '5',
                    rest: '180s',
                    notes: 'Barra baixa',
                  },
                ],
              },
            },
          ],
        },
      },
    });

    // Legacy workout that also has isTemplate: true on an active student still counts as active workout
    await prisma.workout.create({
      data: {
        id: workoutUuid(3),
        clientId: studentUuid(1),
        creatorId: personalA.sub,
        title: 'Ficha Ativa Marcada Como Modelo Legado',
        isActive: true,
        isTemplate: true,
      },
    });

    // Unlinked template without client does not count as student prescription
    await prisma.workout.create({
      data: {
        id: workoutUuid(4),
        clientId: null,
        userId: personalA.sub,
        creatorId: personalA.sub,
        title: 'Modelo Sem Aluno',
        isActive: true,
        isTemplate: true,
      },
    });

    // Personal B workout
    await prisma.workout.create({
      data: {
        id: workoutUuid(5),
        clientId: isolationFixtures.training.clientB,
        creatorId: personalB.sub,
        title: 'Treino Privado Personal B',
        isActive: true,
        isTemplate: false,
      },
    });

    // Assessments for Personal A's student 1 (3 assessments, overview returns latest 2)
    await prisma.physicalAssessment.createMany({
      data: [
        {
          id: assessmentUuid(1),
          clientId: isolationFixtures.training.clientA,
          date: new Date('2026-08-01T12:00:00.000Z'),
          weight: 78,
          squat1RM: 90,
        },
        {
          id: assessmentUuid(2),
          clientId: isolationFixtures.training.clientA,
          date: new Date('2026-09-01T12:00:00.000Z'),
          weight: 79,
          squat1RM: 100,
        },
        {
          id: assessmentUuid(3),
          clientId: isolationFixtures.training.clientA,
          date: new Date('2026-10-01T12:00:00.000Z'),
          weight: null,
          squat1RM: 112.5,
          benchPress1RM: 85,
          notes: 'Avaliação exclusiva de força',
        },
      ],
    });
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await cleanExtraFixtures();
        await clearIsolationFixtures(prisma);
      }
    } finally {
      await Promise.all([app?.close(), unauthenticatedApp?.close()]);
      await prisma?.$disconnect();
    }
  });

  it('enforces authentication, PERSONAL role, UUID validation, and Cache-Control: no-store', async () => {
    const clientA = isolationFixtures.training.clientA;
    for (const path of [
      '/workouts/workspace',
      `/workouts/client/${clientA}/overview`,
      `/workouts/${workoutUuid(2)}`,
    ]) {
      await request(unauthenticatedApp.getHttpServer()).get(path).expect(401);

      for (const user of [
        nutritionist,
        physio,
        { sub: personalA.sub, role: 'ADMIN' },
        { sub: personalA.sub, role: 'PATIENT' },
      ]) {
        await request(app.getHttpServer())
          .get(path)
          .set(asUser(user))
          .expect(403);
      }

      await request(app.getHttpServer())
        .get(path)
        .set(asUser(personalA))
        .expect(200)
        .expect('Cache-Control', 'no-store');
    }

    await request(app.getHttpServer())
      .get('/workouts/client/not-a-uuid/overview')
      .set(asUser(personalA))
      .expect(400);

    await request(app.getHttpServer())
      .get('/workouts/not-a-uuid')
      .set(asUser(personalA))
      .expect(400);
  });

  it('isolates workspace counts and 5-item samples per Personal without leaking private Client fields', async () => {
    type WorkspaceBody = {
      counts: {
        activeStudents: number;
        archivedStudents: number;
        withoutActiveWorkout: number;
      };
      items: Array<{
        clientId: string;
        name: string;
        goal: string | null;
        updatedAt: string;
        section: 'RECENT' | 'WITHOUT_ACTIVE_WORKOUT';
      }>;
    };

    const responseA = await request(app.getHttpServer())
      .get('/workouts/workspace')
      .set(asUser(personalA))
      .expect(200);
    const bodyA = responseA.body as WorkspaceBody;

    expect(bodyA.counts).toEqual({
      activeStudents: 7,
      archivedStudents: 2,
      withoutActiveWorkout: 5,
    });

    const itemsA = bodyA.items;
    const recentA = itemsA.filter((item) => item.section === 'RECENT');
    const pendingA = itemsA.filter(
      (item) => item.section === 'WITHOUT_ACTIVE_WORKOUT',
    );

    expect(recentA).toHaveLength(5);
    expect(pendingA).toHaveLength(5);
    expect(recentA.map((item) => item.clientId)).toEqual([
      isolationFixtures.training.clientA,
      studentUuid(1),
      studentUuid(2),
      studentUuid(3),
      studentUuid(4),
    ]);
    expect(pendingA.map((item) => item.clientId)).toEqual([
      studentUuid(2),
      studentUuid(3),
      studentUuid(4),
      studentUuid(5),
      studentUuid(6),
    ]);

    const serializedA = JSON.stringify(bodyA);
    expect(serializedA).not.toContain('Aluno Arquivado');
    expect(serializedA).not.toContain(isolationFixtures.training.clientB);
    expect(serializedA).not.toContain('Nota privada sigilosa');
    expect(serializedA).not.toContain('Nota profissional interna');
    expect(serializedA).not.toContain('Condromalácia');

    const responseB = await request(app.getHttpServer())
      .get('/workouts/workspace')
      .set(asUser(personalB))
      .expect(200);
    const bodyB = responseB.body as WorkspaceBody;

    expect(bodyB.counts).toEqual({
      activeStudents: 1,
      archivedStudents: 0,
      withoutActiveWorkout: 0,
    });
    expect(bodyB.items).toEqual([
      expect.objectContaining({
        clientId: isolationFixtures.training.clientB,
        section: 'RECENT',
      }),
    ]);
  });

  it('returns bounded client training overview and opens the exact selected workout by ID', async () => {
    type OverviewBody = {
      client: { id: string; status: string };
      activeWorkout: Record<string, unknown> | null;
      recentAssessments: Array<Record<string, unknown>>;
    };
    type DetailBody = {
      id: string;
      clientId: string;
      title: string;
      isActive: boolean;
      client: { id: string; name: string; status: string };
      splits: Array<{
        exercises: Array<Record<string, unknown>>;
      }>;
    };

    const clientA = isolationFixtures.training.clientA;

    const overview = await request(app.getHttpServer())
      .get(`/workouts/client/${clientA}/overview`)
      .set(asUser(personalA))
      .expect(200);
    const overviewBody = overview.body as OverviewBody;

    expect(overviewBody.client).toEqual({ id: clientA, status: 'ACTIVE' });
    expect(overviewBody.activeWorkout).toMatchObject({
      id: workoutUuid(2),
      clientId: clientA,
      title: 'Ficha Ativa de Força',
      isActive: true,
    });
    expect(overviewBody.recentAssessments).toHaveLength(2);
    expect(overviewBody.recentAssessments[0]).toMatchObject({
      id: assessmentUuid(3),
      clientId: clientA,
      weight: null,
      squat1RM: 112.5,
      benchPress1RM: 85,
      notes: 'Avaliação exclusiva de força',
    });

    const activeDetail = await request(app.getHttpServer())
      .get(`/workouts/${workoutUuid(2)}`)
      .set(asUser(personalA))
      .expect(200);
    const activeDetailBody = activeDetail.body as DetailBody;
    expect(activeDetailBody).toMatchObject({
      id: workoutUuid(2),
      clientId: clientA,
      title: 'Ficha Ativa de Força',
      isActive: true,
      client: { id: clientA, name: 'Aluno Ativo 1', status: 'ACTIVE' },
    });
    expect(activeDetailBody.splits[0].exercises[0]).toMatchObject({
      name: 'Agachamento Livre',
      sets: '5',
      reps: '5',
    });

    const olderDetail = await request(app.getHttpServer())
      .get(`/workouts/${workoutUuid(1)}`)
      .set(asUser(personalA))
      .expect(200);
    const olderDetailBody = olderDetail.body as DetailBody;
    expect(olderDetailBody).toMatchObject({
      id: workoutUuid(1),
      clientId: clientA,
      title: 'Ficha Anterior de Adaptação',
      isActive: false,
      client: { id: clientA, name: 'Aluno Ativo 1', status: 'ACTIVE' },
    });
    expect(olderDetailBody.splits[0].exercises[0]).toMatchObject({
      name: 'Agachamento Goblet',
      sets: '3',
      reps: '12',
    });

    // Unlinked template and foreign workout both return 404
    await request(app.getHttpServer())
      .get(`/workouts/${workoutUuid(4)}`)
      .set(asUser(personalA))
      .expect(404);
    await request(app.getHttpServer())
      .get(`/workouts/${workoutUuid(5)}`)
      .set(asUser(personalA))
      .expect(404);
    await request(app.getHttpServer())
      .get(`/workouts/client/${isolationFixtures.training.clientB}/overview`)
      .set(asUser(personalA))
      .expect(404);
  });

  it('persists split/exercise order, advanced parameters, and isolates custom exercises in the library', async () => {
    const clientA = isolationFixtures.training.clientA;

    // 1. Custom exercise creation and tenant isolation
    const customCreated = await request(app.getHttpServer())
      .post('/workouts/exercise-library')
      .set(asUser(personalA))
      .send({
        name: 'Agachamento Pausa 2s',
        muscleGroup: 'QUADRICEPS',
        equipment: 'BARBELL',
        notes: 'Manter tensão no fundo',
      })
      .expect(201);

    const customExercise = customCreated.body as {
      id: string;
      name: string;
      muscleGroup: string;
      source: string;
    };
    expect(customExercise).toMatchObject({
      name: 'Agachamento Pausa 2s',
      muscleGroup: 'QUADRICEPS',
      source: 'CUSTOM',
    });

    // Duplicate name for same Personal returns 409
    await request(app.getHttpServer())
      .post('/workouts/exercise-library')
      .set(asUser(personalA))
      .send({
        name: 'agachamento pausa 2s',
        muscleGroup: 'QUADRICEPS',
      })
      .expect(409);

    // Personal A sees custom exercise + catalog
    const libraryA = await request(app.getHttpServer())
      .get('/workouts/exercise-library?q=agachamento&muscleGroup=QUADRICEPS')
      .set(asUser(personalA))
      .expect(200);
    const itemsA = libraryA.body as Array<{
      id: string;
      name: string;
      source: string;
    }>;
    expect(itemsA[0]).toMatchObject({
      id: customExercise.id,
      name: 'Agachamento Pausa 2s',
      source: 'CUSTOM',
    });
    expect(itemsA.some((item) => item.source === 'CATALOG')).toBe(true);

    // Personal B never sees Personal A's custom exercise and cannot delete it
    const libraryB = await request(app.getHttpServer())
      .get('/workouts/exercise-library?q=pausa')
      .set(asUser(personalB))
      .expect(200);
    expect(libraryB.body).toEqual([]);

    await request(app.getHttpServer())
      .delete(`/workouts/exercise-library/${customExercise.id}`)
      .set(asUser(personalB))
      .expect(404);

    // 2. Create workout with persisted order and advanced parameters
    const createdWorkout = await request(app.getHttpServer())
      .post('/workouts')
      .set(asUser(personalA))
      .send({
        clientId: clientA,
        title: 'Hipertrofia Avançada P2',
        goal: 'Hipertrofia miofibrilar',
        durationWeeks: 6,
        splits: [
          {
            name: 'Treino B - Superiores',
            focus: 'Peito e Costas',
            exercises: [
              {
                name: 'Supino reto com barra',
                sets: '4',
                reps: '6-8',
                rest: '120s',
                muscleGroup: 'CHEST',
                load: '75% 1RM',
                effortType: 'RIR',
                effortTarget: '1-2',
                tempo: '3-1-1-0',
                method: 'REST_PAUSE',
                notes: 'Escápulas retraídas',
              },
              {
                name: 'Remada curvada com barra pronada',
                sets: '4',
                reps: '8-10',
                rest: '90s',
                muscleGroup: 'BACK',
                load: '60 kg',
                effortType: 'RPE',
                effortTarget: '8.5',
                tempo: '2-0-1-1',
                method: 'STANDARD',
              },
            ],
          },
          {
            name: 'Treino A - Inferiores',
            focus: 'Quadríceps e Glúteos',
            exercises: [
              {
                name: 'Agachamento Pausa 2s',
                sets: '5',
                reps: '5',
                rest: '180s',
                muscleGroup: 'QUADRICEPS',
                load: '100 kg',
                effortType: 'RIR',
                effortTarget: '2',
                tempo: '3-2-1-0',
                method: 'CLUSTER',
              },
            ],
          },
        ],
      })
      .expect(201);

    const createdId = (createdWorkout.body as { id: string }).id;

    try {
      const detail = await request(app.getHttpServer())
        .get(`/workouts/${createdId}`)
        .set(asUser(personalA))
        .expect(200);

      const detailBody = detail.body as {
        splits: Array<{
          name: string;
          position: number;
          exercises: Array<{
            name: string;
            position: number;
            muscleGroup: string | null;
            load: string | null;
            effortType: string | null;
            effortTarget: string | null;
            tempo: string | null;
            method: string;
          }>;
        }>;
      };

      expect(
        detailBody.splits.map((s) => ({ name: s.name, position: s.position })),
      ).toEqual([
        { name: 'Treino B - Superiores', position: 0 },
        { name: 'Treino A - Inferiores', position: 1 },
      ]);
      expect(detailBody.splits[0].exercises).toEqual([
        expect.objectContaining({
          name: 'Supino reto com barra',
          position: 0,
          muscleGroup: 'CHEST',
          load: '75% 1RM',
          effortType: 'RIR',
          effortTarget: '1-2',
          tempo: '3-1-1-0',
          method: 'REST_PAUSE',
        }),
        expect.objectContaining({
          name: 'Remada curvada com barra pronada',
          position: 1,
          muscleGroup: 'BACK',
          load: '60 kg',
          effortType: 'RPE',
          effortTarget: '8.5',
          tempo: '2-0-1-1',
          method: 'STANDARD',
        }),
      ]);

      await request(app.getHttpServer())
        .delete(`/workouts/exercise-library/${customExercise.id}`)
        .set(asUser(personalA))
        .expect(200);
    } finally {
      await prisma.workout.deleteMany({ where: { id: createdId } });
    }
  });
});
