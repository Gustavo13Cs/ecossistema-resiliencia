import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Pool } from 'pg';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import {
  createCsrfProtection,
  generateCsrfToken,
} from '../src/common/security/csrf-protection';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthSessionService } from '../src/modules/auth/auth-session.service';
import { WorkoutDraftsService } from '../src/modules/workouts/workout-drafts.service';
import { PrismaService } from '../src/infra/database/prisma.service';
import {
  assertIsolationDatabase,
  clearIsolationFixtures,
  isolationDatabase,
  isolationFixtures,
  seedIsolationFixtures,
} from './fixtures/client-isolation';
import { runtimeUrls } from './fixtures/runtime-roles';
import { testAdminPrisma } from './fixtures/test-admin';

type Draft = {
  id: string;
  clientId: string;
  status: string;
  version: number;
  finalizedWorkoutId: string;
  workout: { id: string; clientId: string };
};
const content = {
  title: 'Synthetic training',
  splits: [
    { name: 'A', exercises: [{ name: 'Squat', sets: '3', reps: '10' }] },
  ],
};
describe('Workout drafts through JWT and real clinical transaction', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let pool: Pool;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  let drafts: WorkoutDraftsService;
  const tokens: Record<string, string> = {};
  const clientId = isolationFixtures.training.clientA;
  const actor = isolationFixtures.training.a;
  const http = () => request(app.getHttpServer());
  const authorization = (key = 'a') => `Bearer ${tokens[key]}`;
  const create = async () =>
    (
      await http()
        .post('/workouts/drafts')
        .set('Authorization', authorization())
        .send({ clientId, content })
        .expect(201)
    ).body as Draft;
  beforeAll(async () => {
    assertIsolationDatabase();
    pool = new Pool({ connectionString: isolationDatabase });
    urls = await runtimeUrls(pool);
    prisma = testAdminPrisma();
    await prisma.$connect();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.use(createCsrfProtection(['http://localhost:3001']));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    drafts = module.get(WorkoutDraftsService);
  });
  beforeEach(async () => {
    await seedIsolationFixtures(prisma);
    for (const [key, user] of Object.entries({
      a: actor,
      b: isolationFixtures.training.b,
      nutrition: isolationFixtures.nutrition.a,
      physio: isolationFixtures.physio.a,
    })) {
      tokens[key] = (
        await app
          .get(AuthSessionService)
          .create(
            await prisma.user.findUniqueOrThrow({ where: { id: user.sub } }),
          )
      ).access_token;
    }
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await app?.close();
    if (prisma) {
      await clearIsolationFixtures(prisma);
      await prisma.$disconnect();
    }
    urls?.restore();
    await pool?.end();
  });
  it('authenticates every draft route and rejects other domains', async () => {
    const draft = await create();
    for (const [method, path, body] of [
      ['get', '/workouts/drafts', undefined],
      ['post', '/workouts/drafts', { clientId, content }],
      ['get', `/workouts/drafts/${draft.id}`, undefined],
      ['put', `/workouts/drafts/${draft.id}`, { expectedVersion: 1, content }],
      [
        'post',
        `/workouts/drafts/${draft.id}/rebase`,
        { expectedVersion: 1, expectedActiveWorkoutId: null },
      ],
      ['post', `/workouts/drafts/${draft.id}/finalize`, { expectedVersion: 1 }],
      ['post', `/workouts/drafts/${draft.id}/discard`, { expectedVersion: 1 }],
    ] as const) {
      await http()[method](path).send(body).expect(401);
      for (const role of ['nutrition', 'physio'])
        await http()
          [method](path)
          .set('Authorization', authorization(role))
          .send(body)
          .expect(403);
    }
  });
  it('requires the existing CSRF pair for cookie-authenticated mutations', async () => {
    const csrf = generateCsrfToken();
    const cookies = `access_token=${tokens.a}; csrf_token=${csrf}`;
    await http()
      .post('/workouts/drafts')
      .set('Cookie', cookies)
      .set('Origin', 'http://localhost:3001')
      .send({ clientId, content })
      .expect(403);
    expect(await prisma.workoutDraft.count({ where: { clientId } })).toBe(0);
    await http()
      .post('/workouts/drafts')
      .set('Cookie', cookies)
      .set('Origin', 'http://localhost:3001')
      .set('X-CSRF-Token', csrf)
      .send({ clientId, content })
      .expect(201)
      .expect('Cache-Control', 'no-store');
  });
  it('reads archived drafts and rejects every mutation without changing state', async () => {
    const draft = await create();
    await prisma.client.update({
      where: { id: clientId },
      data: { status: 'ARCHIVED' },
    });
    await http()
      .get(`/workouts/drafts/${draft.id}`)
      .set('Authorization', authorization())
      .expect(200);
    for (const operation of ['rebase', 'finalize', 'discard']) {
      const response = await http()
        .post(`/workouts/drafts/${draft.id}/${operation}`)
        .set('Authorization', authorization())
        .send({
          expectedVersion: 1,
          ...(operation === 'rebase' ? { expectedActiveWorkoutId: null } : {}),
        })
        .expect(409);
      expect((response.body as { code: string }).code).toBe('CLIENT_ARCHIVED');
    }
    await http()
      .put(`/workouts/drafts/${draft.id}`)
      .set('Authorization', authorization())
      .send({ expectedVersion: 1, content })
      .expect(409);
    expect(
      await prisma.workoutDraft.findUniqueOrThrow({ where: { id: draft.id } }),
    ).toMatchObject({ version: 1, status: 'OPEN' });
  });
  it('foreign_draft_is_404 and list is classified without clinical content', async () => {
    const draft = await create();
    await http()
      .get(`/workouts/drafts/${draft.id}`)
      .set('Authorization', authorization('b'))
      .expect(404);
    await http()
      .put(`/workouts/drafts/${draft.id}`)
      .set('Authorization', authorization('b'))
      .send({ expectedVersion: 1, content })
      .expect(404);
    await http()
      .get(`/workouts/drafts?clientId=${isolationFixtures.training.clientB}`)
      .set('Authorization', authorization())
      .expect(404);
    const response = await http()
      .get('/workouts/drafts?limit=1')
      .set('Authorization', authorization())
      .expect(200)
      .expect('Cache-Control', 'no-store');
    expect(response.body).toMatchObject({
      items: [{ id: draft.id, clientId, version: 1, title: content.title }],
      nextCursor: null,
    });
    expect((response.body as { items: unknown[] }).items[0]).not.toHaveProperty(
      'content',
    );
    await http()
      .get(`/workouts/drafts/${draft.id}`)
      .set('Authorization', authorization())
      .expect(200)
      .expect('Cache-Control', 'no-store');
  });
  it('validates owner fields, UUIDs and normalized byte size before persistence', async () => {
    for (const body of [
      { clientId: 'invalid', content },
      { clientId, content, professionalId: actor.sub },
      { clientId, content, sourceWorkoutId: clientId },
      { clientId, content: { ...content, snapshot: {} } },
    ])
      await http()
        .post('/workouts/drafts')
        .set('Authorization', authorization())
        .send(body)
        .expect(400);
    await http()
      .get('/workouts/drafts/invalid')
      .set('Authorization', authorization())
      .expect(400);
    await http()
      .get('/workouts/drafts?clientId=invalid')
      .set('Authorization', authorization())
      .expect(400);
    const oversized = {
      title: '',
      splits: [
        {
          name: '',
          exercises: Array.from({ length: 32 }, () => ({
            notes: 'x'.repeat(2000),
          })),
        },
      ],
    };
    await http()
      .post('/workouts/drafts')
      .set('Authorization', authorization())
      .send({ clientId, content: oversized })
      .expect(413);
    expect(await prisma.workoutDraft.count({ where: { clientId } })).toBe(0);
  });
  it('reports duplicate, stale version and stale base conflicts without replacing work', async () => {
    const draft = await create();
    const duplicate = await http()
      .post('/workouts/drafts')
      .set('Authorization', authorization())
      .send({ clientId, content })
      .expect(409);
    expect(duplicate.body).toMatchObject({
      code: 'DRAFT_EXISTS',
      id: draft.id,
      clientId,
    });
    await http()
      .put(`/workouts/drafts/${draft.id}`)
      .set('Authorization', authorization())
      .send({ expectedVersion: 1, content })
      .expect(200);
    const stale = await http()
      .post(`/workouts/drafts/${draft.id}/finalize`)
      .set('Authorization', authorization())
      .send({ expectedVersion: 1 })
      .expect(409);
    expect((stale.body as { code: string }).code).toBe(
      'DRAFT_VERSION_CONFLICT',
    );
    const workout = await prisma.workout.create({
      data: {
        clientId,
        creatorId: actor.sub,
        title: 'New active base',
        isActive: true,
      },
    });
    const changed = await http()
      .post(`/workouts/drafts/${draft.id}/finalize`)
      .set('Authorization', authorization())
      .send({ expectedVersion: 2 })
      .expect(409);
    expect((changed.body as { code: string }).code).toBe(
      'ACTIVE_WORKOUT_CHANGED',
    );
    await http()
      .post(`/workouts/drafts/${draft.id}/rebase`)
      .set('Authorization', authorization())
      .send({ expectedVersion: 2, expectedActiveWorkoutId: null })
      .expect(409);
    await http()
      .post(`/workouts/drafts/${draft.id}/rebase`)
      .set('Authorization', authorization())
      .send({ expectedVersion: 2, expectedActiveWorkoutId: workout.id })
      .expect(201);
    const discarded = await http()
      .post(`/workouts/drafts/${draft.id}/discard`)
      .set('Authorization', authorization())
      .send({ expectedVersion: 3 })
      .expect(201);
    expect(discarded.body).toEqual({
      id: draft.id,
      clientId,
      status: 'DISCARDED',
      version: 4,
    });
  });
  it('classified_finalize_has_top_level_client_identity and retry preserves workout', async () => {
    const draft = await create();
    const result = await http()
      .post(`/workouts/drafts/${draft.id}/finalize`)
      .set('Authorization', authorization())
      .send({ expectedVersion: 1 })
      .expect(201)
      .expect('Cache-Control', 'no-store');
    const finalized = result.body as Draft;
    expect(finalized).toMatchObject({
      id: draft.id,
      clientId,
      status: 'FINALIZED',
      version: 2,
      workout: { clientId },
    });
    expect(finalized.finalizedWorkoutId).toBe(finalized.workout.id);
    await http()
      .post(`/workouts/drafts/${draft.id}/finalize`)
      .set('Authorization', authorization())
      .send({ expectedVersion: 1 })
      .expect(201)
      .expect(result.body as object);
  });
  it('rejects a prepared foreign Client response and rolls back finalization', async () => {
    const draft = await create();
    const finalize = drafts.finalize.bind(drafts);
    const spy = jest
      .spyOn(drafts, 'finalize')
      .mockImplementation(async (...args) => ({
        ...(await finalize(...args)),
        clientId: isolationFixtures.training.clientB,
      }));
    try {
      await http()
        .post(`/workouts/drafts/${draft.id}/finalize`)
        .set('Authorization', authorization())
        .send({ expectedVersion: 1 })
        .expect(500)
        .expect({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Operação indisponível',
        });
      expect(
        await prisma.workoutDraft.findUniqueOrThrow({
          where: { id: draft.id },
        }),
      ).toMatchObject({ status: 'OPEN', version: 1, finalizedWorkoutId: null });
      expect(await prisma.workout.count({ where: { clientId } })).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });
});
