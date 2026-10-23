import { Prisma } from '@prisma/client';
import {
  findCatalogDemonstration,
  REVOKED_DEMONSTRATION_ASSET_IDS,
} from '../src/modules/workouts/exercise-demonstration';
import type { LibraryReference } from '../src/modules/workouts/exercise-demonstration.types';
import type { WorkoutDraftResource } from '../src/modules/workouts/workout-draft.types';
import type { WorkoutDetail } from '../src/modules/workouts/training-read.types';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthSessionService } from '../src/modules/auth/auth-session.service';
import { PrismaService } from '../src/infra/database/prisma.service';
import { ExerciseLibraryItem } from '../src/modules/workouts/exercise-catalog';
import {
  assertIsolationDatabase,
  clearIsolationFixtures,
  isolationDatabase,
  isolationFixtures,
  seedIsolationFixtures,
} from './fixtures/client-isolation';
import { runtimeUrls } from './fixtures/runtime-roles';
import { testAdminPrisma } from './fixtures/test-admin';

describe('Authorized demonstration snapshots through JWT and PostgreSQL', () => {
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

  const clientId = isolationFixtures.training.clientA;
  const ref = (
    exerciseId: string,
    revision: string | null = '1',
  ): LibraryReference => ({
    source: 'CUSTOM',
    exerciseId,
    demonstrationRevision: revision,
  });
  const input = (libraryReference?: LibraryReference | null) => ({
    title: 'Snapshot workout',
    splits: [
      {
        name: 'A',
        exercises: [
          {
            name: 'Supino',
            sets: '3',
            reps: '10',
            load: '42 kg',
            ...(libraryReference ? { libraryReference } : {}),
          },
        ],
      },
    ],
  });
  const draft = async (content = input()) =>
    (
      await http()
        .post('/workouts/drafts')
        .set('Authorization', auth())
        .send({ clientId, content })
        .expect(201)
    ).body as WorkoutDraftResource;
  const save = async (id: string, expectedVersion: number, content: object) =>
    (
      await http()
        .put(`/workouts/drafts/${id}`)
        .set('Authorization', auth())
        .send({ expectedVersion, content })
        .expect(200)
    ).body as WorkoutDraftResource;
  const finalize = async (id: string, expectedVersion: number) =>
    (
      await http()
        .post(`/workouts/drafts/${id}/finalize`)
        .set('Authorization', auth())
        .send({ expectedVersion })
        .expect(201)
    ).body as { workout: WorkoutDetail };
  const raw = async (id: string) =>
    await prisma.workoutExercise.findMany({
      where: { split: { workoutId: id } },
      orderBy: { position: 'asc' },
    });
  it('persists_server_resolved_snapshot and read-only display approval', async () => {
    const snapshot = findCatalogDemonstration('cat-chest-01')!;
    const reference: LibraryReference = {
      source: 'CATALOG',
      exerciseId: 'cat-chest-01',
      demonstrationRevision: snapshot.revision,
    };
    const created = await draft(input(reference));
    expect(created.schemaVersion).toBe(3);
    const stored = await prisma.workoutDraft.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(JSON.stringify(stored.content)).not.toContain('displayAllowed');
    expect(stored.content).toMatchObject({
      splits: [
        {
          exercises: [
            { libraryReference: reference, demonstrationSnapshot: snapshot },
          ],
        },
      ],
    });
    const result = await finalize(created.id, 1);
    expect((await raw(result.workout.id))[0].demonstrationSnapshot).toEqual(
      snapshot,
    );
    expect(
      result.workout.splits[0].exercises[0].demonstrationSnapshot?.assets?.[0]
        .displayAllowed,
    ).toBe(true);
    const revoked = REVOKED_DEMONSTRATION_ASSET_IDS as Set<string>;
    revoked.add(snapshot.assets![0].id);
    try {
      const read = (
        await http()
          .get(`/workouts/${result.workout.id}`)
          .set('Authorization', auth())
          .expect(200)
      ).body as WorkoutDetail;
      expect(
        read.splits[0].exercises[0].demonstrationSnapshot?.assets?.[0]
          .displayAllowed,
      ).toBe(false);
      const copy = (
        await http()
          .post('/workouts/drafts')
          .set('Authorization', auth())
          .send({ clientId, sourceWorkoutId: result.workout.id })
          .expect(201)
      ).body as WorkoutDraftResource;
      const revised = await finalize(copy.id, 1);
      expect((await raw(revised.workout.id))[0].demonstrationSnapshot).toEqual(
        snapshot,
      );
      expect((await raw(result.workout.id))[0].demonstrationSnapshot).toEqual(
        snapshot,
      );
    } finally {
      revoked.delete(snapshot.assets![0].id);
    }
  });
  it('direct_creation_returns_persisted_presentation_and_active_reads_it', async () => {
    const snapshot = findCatalogDemonstration('cat-chest-01')!;
    const reference: LibraryReference = {
      source: 'CATALOG',
      exerciseId: 'cat-chest-01',
      demonstrationRevision: snapshot.revision,
    };
    const response = (
      await http()
        .post('/workouts')
        .set('Authorization', auth())
        .send({ clientId, ...input(reference) })
        .expect(201)
    ).body as WorkoutDetail;
    expect(response.splits?.[0].exercises[0]).toMatchObject({
      libraryReference: reference,
      demonstrationSnapshot: {
        revision: snapshot.revision,
        assets: [expect.objectContaining({ displayAllowed: true })],
      },
    });
    expect((await raw(response.id))[0].demonstrationSnapshot).toEqual(snapshot);
    const active = (
      await http()
        .get(`/workouts/client/${clientId}/active`)
        .set('Authorization', auth())
        .expect(200)
    ).body as WorkoutDetail;
    expect(active.splits[0].exercises[0]).toMatchObject({
      libraryReference: reference,
      demonstrationSnapshot: {
        assets: [expect.objectContaining({ displayAllowed: true })],
      },
    });
  });
  it('copy_normalizes_prescription_text_without_changing_authorized_snapshot', async () => {
    const snapshot = findCatalogDemonstration('cat-chest-01')!;
    const reference: LibraryReference = {
      source: 'CATALOG',
      exerciseId: 'cat-chest-01',
      demonstrationRevision: snapshot.revision,
    };
    const content = input(reference);
    content.title = '  Copied title  ';
    content.splits[0].exercises[0].sets = ' 3 ';
    const source = (
      await http()
        .post('/workouts')
        .set('Authorization', auth())
        .send({ clientId, ...content })
        .expect(201)
    ).body as WorkoutDetail;
    const copy = (
      await http()
        .post('/workouts/drafts')
        .set('Authorization', auth())
        .send({ clientId, sourceWorkoutId: source.id })
        .expect(201)
    ).body as WorkoutDraftResource;
    expect(copy.content?.title).toBe('Copied title');
    expect(copy.content?.splits[0].exercises[0].sets).toBe('3');
    const stored = await prisma.workoutDraft.findUniqueOrThrow({
      where: { id: copy.id },
    });
    expect(stored.content).toMatchObject({
      splits: [
        {
          exercises: [
            { libraryReference: reference, demonstrationSnapshot: snapshot },
          ],
        },
      ],
    });
    expect((await raw(source.id))[0].demonstrationSnapshot).toEqual(snapshot);
  });
  it('changed_custom_link_does_not_rewrite_finalized_workout', async () => {
    const item = await create('https://vimeo.com/123');
    const created = await draft(input(ref(item.id)));
    const original =
      created.content!.splits[0].exercises[0].demonstrationSnapshot;
    await http()
      .patch(`${path}/${item.id}`)
      .set('Authorization', auth())
      .send({ expectedMediaVersion: 1, videoUrl: 'https://vimeo.com/456' })
      .expect(200);
    const finalized = await finalize(created.id, 1);
    expect((await raw(finalized.workout.id))[0].demonstrationSnapshot).toEqual(
      original,
    );
    const copy = (
      await http()
        .post('/workouts/drafts')
        .set('Authorization', auth())
        .send({ clientId, sourceWorkoutId: finalized.workout.id })
        .expect(201)
    ).body as WorkoutDraftResource;
    expect(copy.content?.splits[0].exercises[0].demonstrationSnapshot).toEqual(
      original,
    );
    const content = input(ref(item.id));
    content.splits[0].exercises[0].sets = '5';
    const updated = await save(copy.id, 1, content);
    expect(
      updated.content?.splits[0].exercises[0].demonstrationSnapshot,
    ).toEqual(original);
    const revised = await finalize(copy.id, 2);
    expect((await raw(revised.workout.id))[0]).toMatchObject({
      sets: '5',
      load: '42 kg',
      demonstrationSnapshot: original,
    });
  });
  it('deleted_custom_item_keeps_existing_authorized_snapshot and duplicate/reordered reference', async () => {
    const item = await create('https://vimeo.com/123');
    const reference = ref(item.id);
    const created = await draft(input(reference));
    const snapshot =
      created.content!.splits[0].exercises[0].demonstrationSnapshot;
    await http()
      .delete(`${path}/${item.id}`)
      .set('Authorization', auth())
      .expect(200);
    const content = input(reference);
    content.splits[0].exercises = [
      { name: 'Manual', sets: '2', reps: '8', load: '' },
      ...content.splits[0].exercises,
      { ...content.splits[0].exercises[0], sets: '7' },
    ];
    await save(created.id, 1, content);
    const result = await finalize(created.id, 2);
    const rows = await raw(result.workout.id);
    expect(
      rows.map((row) => [row.position, row.sets, row.demonstrationSnapshot]),
    ).toEqual([
      [0, '2', null],
      [1, '3', snapshot],
      [2, '7', snapshot],
    ]);
    await http()
      .post('/workouts/drafts')
      .set('Authorization', auth())
      .send({ clientId, content: input(reference) })
      .expect(404);
  });
  it.each(['deleted', 'later-link'])(
    'saved_null_snapshot_preserves_reference_when_%s',
    async (change) => {
      const item = await create();
      const reference = ref(item.id, null);
      const created = await draft(input(reference));
      if (change === 'deleted')
        await http()
          .delete(`${path}/${item.id}`)
          .set('Authorization', auth())
          .expect(200);
      else
        await http()
          .patch(`${path}/${item.id}`)
          .set('Authorization', auth())
          .send({ expectedMediaVersion: 1, videoUrl: 'https://vimeo.com/123' })
          .expect(200);
      const saved = await save(created.id, 1, input(reference));
      expect(saved.content?.splits[0].exercises[0]).toMatchObject({
        libraryReference: reference,
        demonstrationSnapshot: null,
      });
      const result = await finalize(created.id, 2);
      expect((await raw(result.workout.id))[0]).toMatchObject({
        librarySource: 'CUSTOM',
        libraryExerciseId: item.id,
        demonstrationSnapshot: null,
      });
      const copy = (
        await http()
          .post('/workouts/drafts')
          .set('Authorization', auth())
          .send({ clientId, sourceWorkoutId: result.workout.id })
          .expect(201)
      ).body as WorkoutDraftResource;
      expect(copy.content?.splits[0].exercises[0]).toMatchObject({
        libraryReference: reference,
        demonstrationSnapshot: null,
      });
      await save(copy.id, 1, input(reference));
      await finalize(copy.id, 2);
    },
  );
  it('foreign_custom_reference_is_404 and stale_new_selection_is_409', async () => {
    const item = await create('https://vimeo.com/123');
    await prisma.customExercise.update({
      where: { id: item.id },
      data: { professionalId: isolationFixtures.training.b.sub },
    });
    await http()
      .post('/workouts/drafts')
      .set('Authorization', auth())
      .send({ clientId, content: input(ref(item.id)) })
      .expect(404);
    await http()
      .post('/workouts')
      .set('Authorization', auth())
      .send({ clientId, ...input(ref(item.id)) })
      .expect(404);
    await prisma.customExercise.update({
      where: { id: item.id },
      data: { professionalId: actor.sub, mediaVersion: 2 },
    });
    await http()
      .post('/workouts/drafts')
      .set('Authorization', auth())
      .send({ clientId, content: input(ref(item.id)) })
      .expect(409);
    const created = await draft(input(ref(item.id, '2')));
    await http()
      .put(`/workouts/drafts/${created.id}`)
      .set('Authorization', auth())
      .send({ expectedVersion: 1, content: input(ref(item.id, '1')) })
      .expect(409);
    expect(
      (
        await prisma.workoutDraft.findUniqueOrThrow({
          where: { id: created.id },
        })
      ).version,
    ).toBe(1);
    const manual = await save(created.id, 1, input());
    expect(manual.content?.splits[0].exercises[0]).toMatchObject({
      libraryReference: null,
      demonstrationSnapshot: null,
    });
  });
  it('manual_direct_prescriptions_over64KiB_keep_legacy_values_while_drafts_reject413', async () => {
    const content = {
      title: '  Direct title  ',
      notes: null,
      splits: [
        {
          name: ' A ',
          focus: null,
          exercises: Array.from({ length: 40 }, () => ({
            name: ' Supino ',
            sets: ' 3 ',
            reps: ' 10 ',
            rest: null,
            notes: 'x'.repeat(1800),
            load: null,
            tempo: null,
            method: null,
          })),
        },
      ],
    };
    expect(Buffer.byteLength(JSON.stringify(content))).toBeGreaterThan(65536);
    const direct = (
      await http()
        .post('/workouts')
        .set('Authorization', auth())
        .send({ clientId, ...content })
        .expect(201)
    ).body as WorkoutDetail;
    expect(direct.title).toBe(content.title);
    expect((await raw(direct.id))[0]).toMatchObject({
      name: ' Supino ',
      sets: ' 3 ',
      reps: ' 10 ',
      rest: null,
      notes: content.splits[0].exercises[0].notes,
      load: null,
      tempo: null,
      librarySource: null,
      libraryExerciseId: null,
      demonstrationSnapshot: null,
    });
    const draftContent = {
      title: content.title,
      splits: [
        {
          name: 'A',
          exercises: content.splits[0].exercises.map((exercise) => ({
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            notes: exercise.notes,
          })),
        },
      ],
    };
    await http()
      .post('/workouts/drafts')
      .set('Authorization', auth())
      .send({ clientId, content: draftContent })
      .expect(413);
    expect(await prisma.workoutDraft.count({ where: { clientId } })).toBe(0);
  });
  it('rejects snapshot injection at HTTP boundaries and cap includes resolved metadata', async () => {
    for (const extra of [
      {
        demonstrationSnapshot: {
          revision: 'forged',
          personalVideoUrl: 'https://vimeo.com/123',
        },
      },
      { personalVideoUrl: 'https://vimeo.com/123' },
      { displayAllowed: true },
      {
        libraryReference: {
          ...ref('91000000-0000-4000-8000-000000000001'),
          displayAllowed: true,
        },
      },
    ]) {
      const content = input();
      Object.assign(content.splits[0].exercises[0], extra);
      await http()
        .post('/workouts/drafts')
        .set('Authorization', auth())
        .send({ clientId, content })
        .expect(400);
      await http()
        .post('/workouts')
        .set('Authorization', auth())
        .send({ clientId, ...content })
        .expect(400);
    }
    const snapshot = findCatalogDemonstration('cat-chest-01')!;
    const content = input({
      source: 'CATALOG',
      exerciseId: 'cat-chest-01',
      demonstrationRevision: snapshot.revision,
    });
    content.splits[0].exercises = Array.from({ length: 40 }, () => ({
      ...content.splits[0].exercises[0],
      notes: 'x'.repeat(1000),
    }));
    expect(Buffer.byteLength(JSON.stringify(content))).toBeLessThan(65536);
    await http()
      .post('/workouts/drafts')
      .set('Authorization', auth())
      .send({ clientId, content })
      .expect(413);
    expect(await prisma.workoutDraft.count({ where: { clientId } })).toBe(0);
  });
  it('v1_draft_upgrades_without_guessed_media and rebase preserves saved media', async () => {
    const old = await prisma.workoutDraft.create({
      data: {
        professionalId: actor.sub,
        clientId,
        schemaVersion: 1,
        content: input() as unknown as Prisma.InputJsonValue,
      },
    });
    const read = (
      await http()
        .get(`/workouts/drafts/${old.id}`)
        .set('Authorization', auth())
        .expect(200)
    ).body as WorkoutDraftResource;
    expect(read).toMatchObject({
      schemaVersion: 3,
      content: {
        splits: [
          {
            exercises: [
              { libraryReference: null, demonstrationSnapshot: null },
            ],
          },
        ],
      },
    });
    const saved = await save(old.id, 1, input());
    expect(saved.schemaVersion).toBe(3);
    expect(
      (await prisma.workoutDraft.findUniqueOrThrow({ where: { id: old.id } }))
        .schemaVersion,
    ).toBe(3);
    await finalize(old.id, 2);
    const item = await create('https://vimeo.com/123');
    const created = await draft(input(ref(item.id)));
    const direct = (
      await http()
        .post('/workouts')
        .set('Authorization', auth())
        .send({ clientId, ...input() })
        .expect(201)
    ).body as { id: string };
    await http()
      .patch(`${path}/${item.id}`)
      .set('Authorization', auth())
      .send({ expectedMediaVersion: 1, videoUrl: 'https://vimeo.com/456' })
      .expect(200);
    const rebased = (
      await http()
        .post(`/workouts/drafts/${created.id}/rebase`)
        .set('Authorization', auth())
        .send({ expectedVersion: 1, expectedActiveWorkoutId: direct.id })
        .expect(201)
    ).body as WorkoutDraftResource;
    expect(rebased.content).toEqual(created.content);
    const result = await finalize(created.id, 2);
    expect((await raw(result.workout.id))[0].demonstrationSnapshot).toEqual(
      created.content!.splits[0].exercises[0].demonstrationSnapshot,
    );
  });
});
