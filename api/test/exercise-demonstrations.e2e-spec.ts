import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthSessionService } from '../src/modules/auth/auth-session.service';
import { PrismaService } from '../src/infra/database/prisma.service';
import {
  ExerciseLibraryDetail,
  ExerciseLibraryItem,
} from '../src/modules/workouts/exercise-catalog';
import {
  assertIsolationDatabase,
  clearIsolationFixtures,
  isolationDatabase,
  isolationFixtures,
  seedIsolationFixtures,
} from './fixtures/client-isolation';
import { runtimeUrls } from './fixtures/runtime-roles';
import { testAdminPrisma } from './fixtures/test-admin';

describe('Private exercise demonstrations through JWT and non-owner clinical transactions', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let pool: Pool;
  let clinical: Pool;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  const tokens: Record<string, string> = {};
  const actor = isolationFixtures.training.a;
  const path = '/workouts/exercise-library';
  const http = () => request(app.getHttpServer());
  const auth = (key = 'a') => `Bearer ${tokens[key]}`;
  const create = async (videoUrl?: string) =>
    (
      await http()
        .post(path)
        .set('Authorization', auth())
        .send({
          name: 'Synthetic private exercise',
          muscleGroup: 'CHEST',
          equipment: 'BARBELL',
          ...(videoUrl ? { videoUrl } : {}),
        })
        .expect(201)
    ).body as ExerciseLibraryItem;

  beforeAll(async () => {
    assertIsolationDatabase();
    pool = new Pool({ connectionString: isolationDatabase });
    urls = await runtimeUrls(pool);
    clinical = new Pool({
      connectionString: urls.values.CLINICAL_DATABASE_URL,
    });
    prisma = testAdminPrisma();
    await prisma.$connect();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
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
    await app?.close();
    if (prisma) {
      await clearIsolationFixtures(prisma);
      await prisma.$disconnect();
    }
    await clinical?.end();
    urls?.restore();
    await pool?.end();
  });

  it('authenticates detail and mutation, restricts roles and accepts non-UUID catalog detail', async () => {
    const item = await create();
    for (const [method, endpoint, body] of [
      ['get', `${path}/cat-chest-01`, undefined],
      ['get', `${path}/${item.id}`, undefined],
      [
        'patch',
        `${path}/${item.id}`,
        { expectedMediaVersion: 1, videoUrl: null },
      ],
    ] as const) {
      await http()[method](endpoint).send(body).expect(401);
      for (const role of ['nutrition', 'physio'])
        await http()
          [method](endpoint)
          .set('Authorization', auth(role))
          .send(body)
          .expect(403);
    }
    const detail = (
      await http()
        .get(`${path}/cat-chest-01`)
        .set('Authorization', auth())
        .expect(200)
        .expect('Cache-Control', 'no-store')
    ).body as ExerciseLibraryDetail;
    expect(detail).toMatchObject({
      source: 'CATALOG',
      hasDemonstration: true,
      demonstrationTypes: ['IMAGE'],
      mediaVersion: null,
      demonstration: {
        assets: [
          expect.objectContaining({
            displayAllowed: true,
            author: expect.any(String) as unknown,
            licenseName: 'CC BY-SA 4.0',
            upstreamSourcePageUrl: expect.any(String) as unknown,
            changes: expect.any(String) as unknown,
          }),
        ],
      },
    });
    await http()
      .get(`${path}/cat-chest-99`)
      .set('Authorization', auth())
      .expect(404);
    await http()
      .get(`${path}/invalid`)
      .set('Authorization', auth())
      .expect(400);
    await http()
      .patch(`${path}/cat-chest-01`)
      .set('Authorization', auth())
      .send({ expectedMediaVersion: 1, videoUrl: null })
      .expect(400);
  });

  it('keeps custom links private, filters both sources and lists only media summaries', async () => {
    const item = await create('https://youtu.be/abcdefghijk?si=tracking');
    const own = (
      await http()
        .get(`${path}/${item.id}`)
        .set('Authorization', auth())
        .expect(200)
    ).body as ExerciseLibraryDetail;
    expect(own).toMatchObject({
      mediaVersion: 1,
      demonstration: {
        revision: '1',
        personalVideoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      },
    });
    for (const method of ['get', 'patch'] as const)
      await http()
        [method](`${path}/${item.id}`)
        .set('Authorization', auth('b'))
        .send(
          method === 'patch'
            ? { expectedMediaVersion: 1, videoUrl: null }
            : undefined,
        )
        .expect(404);
    const ownList = (
      await http()
        .get(`${path}?equipment=BARBELL&muscleGroup=CHEST`)
        .set('Authorization', auth())
        .expect(200)
    ).body as ExerciseLibraryItem[];
    expect(ownList[0]).toMatchObject({
      id: item.id,
      hasDemonstration: true,
      demonstrationTypes: ['VIDEO'],
    });
    expect(
      ownList.every(
        (row) =>
          row.equipment === 'BARBELL' &&
          row.muscleGroup === 'CHEST' &&
          !('demonstration' in row) &&
          !('videoUrl' in row),
      ),
    ).toBe(true);
    expect(ownList.find((row) => row.id === 'cat-chest-01')).toMatchObject({
      hasDemonstration: true,
    });
    const foreign = (
      await http().get(path).set('Authorization', auth('b')).expect(200)
    ).body as ExerciseLibraryItem[];
    expect(foreign).toHaveLength(148);
    expect(foreign.some((row) => row.id === item.id)).toBe(false);
    const stored = await prisma.customExercise.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(stored).toMatchObject({
      professionalId: actor.sub,
      videoUrl: own.demonstration?.personalVideoUrl,
      mediaVersion: 1,
    });
  });

  it('compares version atomically under concurrent PATCH and removes a link with null', async () => {
    const item = await create('https://vimeo.com/123');
    const results = await Promise.all(
      ['https://vimeo.com/456', 'https://youtu.be/abcdefghijk'].map(
        (videoUrl) =>
          http()
            .patch(`${path}/${item.id}`)
            .set('Authorization', auth())
            .send({ expectedMediaVersion: 1, videoUrl }),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const winner = results.find((result) => result.status === 200)
      ?.body as ExerciseLibraryDetail;
    expect(winner).toMatchObject({
      mediaVersion: 2,
      demonstration: { revision: '2' },
    });
    expect(
      await prisma.customExercise.findUniqueOrThrow({ where: { id: item.id } }),
    ).toMatchObject({
      mediaVersion: 2,
      videoUrl: winner.demonstration?.personalVideoUrl,
    });
    const cleared = (
      await http()
        .patch(`${path}/${item.id}`)
        .set('Authorization', auth())
        .send({ expectedMediaVersion: 2, videoUrl: null })
        .expect(200)
    ).body as ExerciseLibraryDetail;
    expect(cleared).toMatchObject({
      mediaVersion: 3,
      hasDemonstration: false,
      demonstrationTypes: [],
      demonstration: null,
    });
    await http()
      .patch(`${path}/${item.id}`)
      .set('Authorization', auth())
      .send({ expectedMediaVersion: 2, videoUrl: 'https://vimeo.com/999' })
      .expect(409);
    expect(
      await prisma.customExercise.findUniqueOrThrow({ where: { id: item.id } }),
    ).toMatchObject({ mediaVersion: 3, videoUrl: null });
  });

  it('rejects unsafe URLs and client assignment of versions or internal media fields', async () => {
    const item = await create();
    for (const body of [
      { expectedMediaVersion: 1 },
      { expectedMediaVersion: 0, videoUrl: null },
      { expectedMediaVersion: 1, videoUrl: 'javascript:alert(1)' },
      {
        expectedMediaVersion: 1,
        videoUrl: 'https://youtube.com.evil/watch?v=abcdefghijk',
      },
      { expectedMediaVersion: 1, videoUrl: 'https://user:pass@vimeo.com/123' },
      { expectedMediaVersion: 1, videoUrl: null, mediaVersion: 9 },
    ])
      await http()
        .patch(`${path}/${item.id}`)
        .set('Authorization', auth())
        .send(body)
        .expect(400);
    for (const extra of [
      { mediaVersion: 9 },
      { professionalId: actor.sub },
      { videoUrl: 'https://vimeo.com/123/private' },
      { demonstrationSnapshot: { personalVideoUrl: 'https://vimeo.com/123' } },
    ])
      await http()
        .post(path)
        .set('Authorization', auth())
        .send({
          name: 'Another synthetic exercise',
          muscleGroup: 'CHEST',
          ...extra,
        })
        .expect(400);
    expect(
      await prisma.customExercise.findUniqueOrThrow({ where: { id: item.id } }),
    ).toMatchObject({ mediaVersion: 1, videoUrl: null });
    expect(await prisma.customExercise.count()).toBe(1);
  });

  it('preserves manual/legacy exercises without inferred media and inherits child RLS', async () => {
    const item = await create();
    const detail = (
      await http()
        .get(`${path}/${item.id}`)
        .set('Authorization', auth())
        .expect(200)
    ).body as ExerciseLibraryDetail;
    expect(detail).toMatchObject({
      mediaVersion: 1,
      demonstration: null,
      hasDemonstration: false,
    });
    const workout = (
      await http()
        .post('/workouts')
        .set('Authorization', auth())
        .send({
          clientId: isolationFixtures.training.clientA,
          title: 'Synthetic legacy workout',
          splits: [
            {
              name: 'A',
              exercises: [
                { name: 'Supino reto com barra', sets: '3', reps: '10' },
              ],
            },
          ],
        })
        .expect(201)
    ).body as { id: string };
    const rows = await prisma.workoutExercise.findMany({
      where: { split: { workoutId: workout.id } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      librarySource: null,
      libraryExerciseId: null,
      demonstrationSnapshot: null,
    });
    await http()
      .get(`/workouts/${workout.id}`)
      .set('Authorization', auth())
      .expect(200);
    await http()
      .get(`/workouts/${workout.id}`)
      .set('Authorization', auth('b'))
      .expect(404);
    const connection = await clinical.connect();
    try {
      await connection.query('BEGIN');
      await connection.query(
        "SELECT set_config('safemove.professional_id',$1,true),set_config('safemove.role','PERSONAL',true),set_config('safemove.session_id','synthetic-session',true),set_config('safemove.request_id','synthetic-request',true)",
        [isolationFixtures.training.b.sub],
      );
      expect(
        (
          await connection.query(
            'SELECT id,"librarySource","libraryExerciseId","demonstrationSnapshot" FROM workout_exercises WHERE id=$1',
            [rows[0].id],
          )
        ).rows,
      ).toEqual([]);
      expect(
        (
          await connection.query(
            'UPDATE workout_exercises SET "libraryExerciseId"=$1 WHERE id=$2 RETURNING id',
            ['cat-chest-01', rows[0].id],
          )
        ).rows,
      ).toEqual([]);
      expect(
        (
          await connection.query(
            'SELECT id,"videoUrl","mediaVersion" FROM custom_exercises WHERE id=$1',
            [item.id],
          )
        ).rows,
      ).toEqual([]);
      await connection.query('ROLLBACK');
    } finally {
      connection.release();
    }
  });
});
