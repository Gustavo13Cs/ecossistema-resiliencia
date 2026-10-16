import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule, GLOBAL_JWT_AUTH_GUARD } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AuthUser } from '../src/common/types/auth-user';
import { PrismaService } from '../src/infra/database/prisma.service';
import {
  assertIsolationDatabase,
  clearIsolationFixtures,
  isolationDatabase,
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
      sessionId: 'synthetic-archived-lifecycle-session',
      sub: req.headers['x-test-user-id'],
      role: req.headers['x-test-role'] as AuthUser['role'],
    };
    return true;
  }
}

const existingWorkoutId = '85000000-0000-4000-8000-000000000001';
const existingAssessmentId = '85000000-0000-4000-8000-000000000002';

describe('Archived Client lifecycle & concurrent write protection (PostgreSQL E2E)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminPool: Pool;

  const personal = isolationFixtures.training.a;
  const clientA = isolationFixtures.training.clientA;

  const asUser = (user: AuthUser) => ({
    'x-test-user-id': user.sub,
    'x-test-role': user.role,
  });

  const cleanFixtures = async () => {
    await prisma.physicalAssessment.deleteMany({
      where: {
        clientId: {
          in: [
            isolationFixtures.training.clientA,
            isolationFixtures.nutrition.clientA,
            isolationFixtures.physio.clientA,
          ],
        },
      },
    });
    await prisma.workout.deleteMany({
      where: { creatorId: personal.sub },
    });
  };

  beforeAll(async () => {
    assertIsolationDatabase();
    prisma = testAdminPrisma();
    adminPool = new Pool({ connectionString: isolationDatabase });
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
  });

  beforeEach(async () => {
    await cleanFixtures();
    await seedIsolationFixtures(prisma);

    await prisma.workout.create({
      data: {
        id: existingWorkoutId,
        clientId: clientA,
        creatorId: personal.sub,
        title: 'Treino Ativo Preservado',
        isActive: true,
        splits: {
          create: [
            {
              name: 'Treino A',
              exercises: {
                create: [{ name: 'Agachamento', sets: '4', reps: '8' }],
              },
            },
          ],
        },
      },
    });

    await prisma.physicalAssessment.create({
      data: {
        id: existingAssessmentId,
        clientId: clientA,
        squat1RM: 100,
        notes: 'Avaliação anterior ao arquivamento',
      },
    });
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await cleanFixtures();
        await clearIsolationFixtures(prisma);
      }
    } finally {
      await app?.close();
      await prisma?.$disconnect();
      await adminPool?.end();
    }
  });

  it('allows reading workouts and assessments of an ARCHIVED Client while rejecting new writes with 409', async () => {
    await request(app.getHttpServer())
      .patch(`/clients/${clientA}/status`)
      .set(asUser(personal))
      .send({ status: 'ARCHIVED' })
      .expect(200);

    const overview = await request(app.getHttpServer())
      .get(`/workouts/client/${clientA}/overview`)
      .set(asUser(personal))
      .expect(200);
    expect(overview.body).toMatchObject({
      client: { id: clientA, status: 'ARCHIVED' },
      activeWorkout: {
        id: existingWorkoutId,
        isActive: true,
      },
    });

    const detail = await request(app.getHttpServer())
      .get(`/workouts/${existingWorkoutId}`)
      .set(asUser(personal))
      .expect(200);
    expect(detail.body).toMatchObject({
      id: existingWorkoutId,
      client: { id: clientA, status: 'ARCHIVED' },
    });

    const assessments = await request(app.getHttpServer())
      .get(`/assessments/client/${clientA}`)
      .set(asUser(personal))
      .expect(200);
    expect(assessments.body).toHaveLength(1);

    await request(app.getHttpServer())
      .post('/workouts')
      .set(asUser(personal))
      .send({
        clientId: clientA,
        title: 'Tentativa em Arquivado',
        splits: [
          {
            name: 'Treino A',
            exercises: [{ name: 'Supino', sets: '3', reps: '10' }],
          },
        ],
      })
      .expect(409);

    for (const domain of [
      { user: personal, clientId: clientA, payload: { squat1RM: 110 } },
      {
        user: isolationFixtures.nutrition.a,
        clientId: isolationFixtures.nutrition.clientA,
        payload: { weight: 70 },
      },
      {
        user: isolationFixtures.physio.a,
        clientId: isolationFixtures.physio.clientA,
        payload: { weight: 68 },
      },
    ]) {
      await prisma.client.update({
        where: { id: domain.clientId },
        data: { status: 'ARCHIVED' },
      });
      await request(app.getHttpServer())
        .post('/assessments')
        .set(asUser(domain.user))
        .send({ clientId: domain.clientId, ...domain.payload })
        .expect(409);
    }

    const preserved = await prisma.workout.findUniqueOrThrow({
      where: { id: existingWorkoutId },
    });
    expect(preserved.isActive).toBe(true);
    expect(await prisma.workout.count({ where: { clientId: clientA } })).toBe(
      1,
    );
    expect(
      await prisma.physicalAssessment.count({ where: { clientId: clientA } }),
    ).toBe(1);
  });

  it('serializes concurrent archival and workout/assessment creation on the Client row without arbitrary sleeps', async () => {
    const lockClient = await adminPool.connect();
    let concurrentWrites:
      | Promise<[request.Response, request.Response]>
      | undefined;

    try {
      await lockClient.query('BEGIN');
      await lockClient.query(
        'SELECT id FROM public.clients WHERE id = $1 FOR UPDATE',
        [clientA],
      );

      const workoutWrite = request(app.getHttpServer())
        .post('/workouts')
        .set(asUser(personal))
        .send({
          clientId: clientA,
          title: 'Corrida Concorrente',
          splits: [
            {
              name: 'Treino A',
              exercises: [{ name: 'Terra', sets: '3', reps: '5' }],
            },
          ],
        });

      const assessmentWrite = request(app.getHttpServer())
        .post('/assessments')
        .set(asUser(personal))
        .send({
          clientId: clientA,
          deadlift1RM: 140,
        });

      concurrentWrites = Promise.all([workoutWrite, assessmentWrite]);

      // Wait until both write transactions are blocked on the Client row lock in PostgreSQL
      const deadline = Date.now() + 5000;
      let waitingOnLock = 0;
      while (Date.now() < deadline) {
        const stat = await adminPool.query<{ count: number }>(
          `SELECT count(*)::int AS count
           FROM pg_stat_activity
           WHERE datname = current_database()
             AND state = 'active'
             AND wait_event_type = 'Lock'`,
        );
        waitingOnLock = stat.rows[0].count;
        if (waitingOnLock >= 2) break;
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      }
      expect(waitingOnLock).toBeGreaterThanOrEqual(2);

      // Commit the archival while both writes are queued on the same Client row lock
      await lockClient.query(
        `UPDATE public.clients SET status = 'ARCHIVED', "updatedAt" = NOW() WHERE id = $1`,
        [clientA],
      );
      await lockClient.query('COMMIT');

      const [workoutRes, assessmentRes] = await concurrentWrites;
      expect(workoutRes.status).toBe(409);
      expect(assessmentRes.status).toBe(409);

      const clientRow = await prisma.client.findUniqueOrThrow({
        where: { id: clientA },
      });
      expect(clientRow.status).toBe('ARCHIVED');

      const activeRow = await prisma.workout.findUniqueOrThrow({
        where: { id: existingWorkoutId },
      });
      expect(activeRow.isActive).toBe(true);
      expect(await prisma.workout.count({ where: { clientId: clientA } })).toBe(
        1,
      );
      expect(
        await prisma.physicalAssessment.count({ where: { clientId: clientA } }),
      ).toBe(1);
    } finally {
      await lockClient.query('ROLLBACK').catch(() => undefined);
      lockClient.release();
      await concurrentWrites?.catch(() => undefined);
    }
  });
});
