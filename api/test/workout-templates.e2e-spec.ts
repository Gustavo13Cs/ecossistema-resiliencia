import { suggestPeriodization } from '../src/modules/workouts/workout-periodization';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthSessionService } from '../src/modules/auth/auth-session.service';
import { PrismaService } from '../src/infra/database/prisma.service';
import { SAFEMOVE_EXERCISE_CATALOG } from '../src/modules/workouts/exercise-catalog';
import {
  isolationDatabase,
  isolationFixtures,
  seedIsolationFixtures,
  clearIsolationFixtures,
} from './fixtures/client-isolation';
import { testAdminPrisma } from './fixtures/test-admin';
import { DraftContentInput } from '../src/modules/workouts/workout-draft.types';

type Template = { id: string; isGlobal: boolean; content: DraftContentInput };
const actor = isolationFixtures.training.a;
const other = isolationFixtures.training.b;
const clientId = isolationFixtures.training.clientA;
const input = {
  title: 'Private base',
  description: 'Description chosen explicitly',
  goal: 'MUSCLE_GAIN',
  level: 'INTERMEDIATE',
  targetAudience: 'Adults',
};
const content = {
  title: 'Prescription',
  goal: 'Sensitive free goal',
  durationWeeks: 8,
  notes: 'Sensitive general note',
  splits: [
    {
      name: 'A',
      focus: 'Sensitive focus',
      exercises: [
        {
          name: 'Supino',
          sets: '3+2',
          reps: 'AMRAP',
          rest: '60s',
          load: '87 kg',
          notes: 'Sensitive exercise note',
          effortType: 'RIR',
          effortTarget: '1-2',
          tempo: '3-1-1-0',
          method: 'DROP_SET',
        },
      ],
    },
  ],
};

describe('Workout templates HTTP and real LOGIN RLS', () => {
  let app: INestApplication<App>;
  let admin: PrismaService;
  let pool: Pool;
  let sourceId: string;
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const auth = (key = 'a') => `Bearer ${tokens[key]}`;
  const save = async () =>
    (
      await http()
        .post(`/workouts/templates/from-workout/${sourceId}`)
        .set('Authorization', auth())
        .send(input)
        .expect(201)
        .expect('Cache-Control', 'no-store')
    ).body as { clientId: string; template: Template };
  beforeAll(async () => {
    admin = testAdminPrisma();
    pool = new Pool({ connectionString: isolationDatabase });
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
    await admin.workoutTemplate.deleteMany({
      where: { professionalId: { in: [actor.sub, other.sub] } },
    });
    await seedIsolationFixtures(admin);
    for (const [key, user] of Object.entries({
      a: actor,
      b: other,
      nutrition: isolationFixtures.nutrition.a,
      physio: isolationFixtures.physio.a,
    }))
      tokens[key] = (
        await app
          .get(AuthSessionService)
          .create(
            await admin.user.findUniqueOrThrow({ where: { id: user.sub } }),
          )
      ).access_token;
    const draft = await http()
      .post('/workouts/drafts')
      .set('Authorization', auth())
      .send({ clientId, content })
      .expect(201);
    const finalized = await http()
      .post(`/workouts/drafts/${(draft.body as { id: string }).id}/finalize`)
      .set('Authorization', auth())
      .send({ expectedVersion: 1 })
      .expect(201);
    sourceId = (finalized.body as { finalizedWorkoutId: string })
      .finalizedWorkoutId;
  });
  afterAll(async () => {
    await app?.close();
    if (admin) {
      await admin.workoutTemplate.deleteMany({
        where: { professionalId: { in: [actor.sub, other.sub] } },
      });
      await clearIsolationFixtures(admin);
      await admin.$disconnect();
    }
    await pool?.end();
  });
  it('requires PERSONAL on all four routes and validates strict DTOs', async () => {
    const { template } = await save();
    for (const [method, path, body] of [
      ['get', '/workouts/templates', {}],
      ['get', `/workouts/templates/${template.id}`, {}],
      ['post', `/workouts/templates/from-workout/${sourceId}`, input],
      ['post', `/workouts/templates/${template.id}/create-draft`, { clientId }],
    ] as const) {
      await http()[method](path).send(body).expect(401);
      for (const role of ['nutrition', 'physio'])
        await http()
          [method](path)
          .set('Authorization', auth(role))
          .send(body)
          .expect(403);
    }
    for (const query of [
      'limit=21',
      'limit=0',
      'goal=free',
      'level=EXPERT',
      'origin=other',
      'cursor=bad',
      'professionalId=x',
    ])
      await http()
        .get(`/workouts/templates?${query}`)
        .set('Authorization', auth())
        .expect(400);
    for (const body of [
      { ...input, professionalId: other.sub },
      { ...input, goal: 'FREE' },
      { ...input, level: 'EXPERT' },
      { ...input, title: ' ' },
      { ...input, content: {} },
    ])
      await http()
        .post(`/workouts/templates/from-workout/${sourceId}`)
        .set('Authorization', auth())
        .send(body)
        .expect(400);
    await http()
      .get('/workouts/templates/invalid')
      .set('Authorization', auth())
      .expect(400);
    await http()
      .post(`/workouts/templates/${template.id}/create-draft`)
      .set('Authorization', auth())
      .send({ clientId, content: {} })
      .expect(400);
  });
  it('strips clinical association, notes, loads and free focus; preserves structure and unknown legacy frequency', async () => {
    const saved = await save();
    expect(saved.clientId).toBe(clientId);
    expect(saved.template.content).toMatchObject({
      title: input.title,
      goal: input.goal,
      notes: '',
      durationWeeks: 8,
      splits: [
        {
          name: 'A',
          focus: '',
          exercises: [
            {
              sets: '3+2',
              reps: 'AMRAP',
              rest: '60s',
              load: '',
              notes: '',
              effortType: 'RIR',
              effortTarget: '1-2',
              tempo: '3-1-1-0',
              method: 'DROP_SET',
            },
          ],
        },
      ],
    });
    expect(saved.template.content.splits[0]).not.toHaveProperty(
      'weeklyFrequency',
    );
    const stored = await admin.workoutTemplate.findUniqueOrThrow({
      where: { id: saved.template.id },
    });
    for (const value of [clientId, sourceId, 'Sensitive', '87 kg'])
      expect(JSON.stringify(stored.content)).not.toContain(value);
    expect(stored.professionalId).toBe(actor.sub);
    const list = await http()
      .get('/workouts/templates?origin=private')
      .set('Authorization', auth())
      .expect(200)
      .expect('Cache-Control', 'no-store');
    expect(list.body).toMatchObject({
      items: [{ id: saved.template.id, isGlobal: false }],
      nextCursor: null,
    });
    for (const key of [
      'content',
      'clientId',
      'professionalId',
      'notes',
      'load',
    ])
      expect((list.body as { items: object[] }).items[0]).not.toHaveProperty(
        key,
      );
    await http()
      .get(`/workouts/templates/${saved.template.id}`)
      .set('Authorization', auth('b'))
      .expect(404);
    await http()
      .post(`/workouts/templates/${saved.template.id}/create-draft`)
      .set('Authorization', auth('b'))
      .send({ clientId: isolationFixtures.training.clientB })
      .expect(404);
    await http()
      .post(`/workouts/templates/from-workout/${sourceId}`)
      .set('Authorization', auth('b'))
      .send(input)
      .expect(404);
    expect(
      (
        await http()
          .get('/workouts/templates?origin=private')
          .set('Authorization', auth('b'))
          .expect(200)
      ).body,
    ).toEqual({ items: [], nextCursor: null });
  });
  it('copies P3 structure while clearing the source start date and requires finalized source', async () => {
    const periodization = {
      ...suggestPeriodization(8),
      startsOn: '2026-10-23',
    };
    await admin.workout.update({
      where: { id: sourceId },
      data: { periodization },
    });
    const split = await admin.workoutSplit.findFirstOrThrow({
      where: { workoutId: sourceId },
    });
    await admin.workoutSplit.update({
      where: { id: split.id },
      data: { weeklyFrequency: 2 },
    });
    const exercise = await admin.workoutExercise.findFirstOrThrow({
      where: { splitId: split.id },
    });
    await admin.workoutExercise.update({
      where: { id: exercise.id },
      data: { secondaryMuscles: [{ muscleGroup: 'TRICEPS', weight: 0.5 }] },
    });
    const { template } = await save();
    expect(template.content.periodization).toEqual({
      ...periodization,
      startsOn: '',
    });
    expect(template.content.splits[0].weeklyFrequency).toBe(2);
    expect(template.content.splits[0].exercises[0].secondaryMuscles).toEqual([
      { muscleGroup: 'TRICEPS', weight: 0.5 },
    ]);
    expect(
      (await admin.workout.findUniqueOrThrow({ where: { id: sourceId } }))
        .periodization,
    ).toEqual(periodization);
    await admin.workout.update({
      where: { id: sourceId },
      data: { finalizedAt: null },
    });
    await http()
      .post(`/workouts/templates/from-workout/${sourceId}`)
      .set('Authorization', auth())
      .send(input)
      .expect(404);
  });
  it('paginates stable metadata and applies goal, level and origin filters', async () => {
    await save();
    await save();
    await save();
    const first = await http()
      .get(
        '/workouts/templates?origin=private&goal=MUSCLE_GAIN&level=INTERMEDIATE&limit=2',
      )
      .set('Authorization', auth())
      .expect(200);
    const page = first.body as { items: { id: string }[]; nextCursor: string };
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeTruthy();
    const second = await http()
      .get(
        `/workouts/templates?origin=private&goal=MUSCLE_GAIN&level=INTERMEDIATE&limit=2&cursor=${page.nextCursor}`,
      )
      .set('Authorization', auth())
      .expect(200);
    expect((second.body as { items: object[] }).items).toHaveLength(1);
    expect(page.items.map((i) => i.id)).not.toContain(
      (second.body as { items: { id: string }[] }).items[0].id,
    );
    await http()
      .get(`/workouts/templates?origin=private&cursor=${page.nextCursor}`)
      .set('Authorization', auth('b'))
      .expect(400);
    expect(
      (
        await http()
          .get('/workouts/templates?origin=private&goal=STRENGTH')
          .set('Authorization', auth())
          .expect(200)
      ).body,
    ).toEqual({ items: [], nextCursor: null });
  });
  it('seeds exactly seven deterministic global templates with valid catalog references and readonly HTTP', async () => {
    const result = await http()
      .get('/workouts/templates?origin=global')
      .set('Authorization', auth())
      .expect(200);
    const globals = (result.body as { items: Template[] }).items;
    expect(globals).toHaveLength(7);
    for (const item of globals) {
      expect(item.isGlobal).toBe(true);
      const detail = await http()
        .get(`/workouts/templates/${item.id}`)
        .set('Authorization', auth('b'))
        .expect(200)
        .expect('Cache-Control', 'no-store');
      const value = (detail.body as Template).content;
      for (const exercise of value.splits.flatMap((s) => s.exercises)) {
        expect(exercise.load).toBe('');
        expect(
          SAFEMOVE_EXERCISE_CATALOG.some(
            (e) => e.id === exercise.libraryReference?.exerciseId,
          ),
        ).toBe(true);
        expect(exercise).not.toHaveProperty('demonstrationSnapshot');
      }
      await http()
        .patch(`/workouts/templates/${item.id}`)
        .set('Authorization', auth())
        .send({ title: 'Changed' })
        .expect(404);
      await http()
        .delete(`/workouts/templates/${item.id}`)
        .set('Authorization', auth())
        .expect(404);
    }
  });
  it('imports concurrently into one OPEN and preserves active prescription and retry conflict', async () => {
    const { template } = await save();
    const importRequest = () =>
      http()
        .post(`/workouts/templates/${template.id}/create-draft`)
        .set('Authorization', auth())
        .send({ clientId });
    const results = await Promise.all([importRequest(), importRequest()]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const draft = results.find((r) => r.status === 201)!.body as {
      id: string;
      clientId: string;
      baseActiveWorkoutId: string;
    };
    expect(draft).toMatchObject({ clientId, baseActiveWorkoutId: sourceId });
    expect(results.find((r) => r.status === 409)!.body).toMatchObject({
      code: 'DRAFT_EXISTS',
      id: draft.id,
    });
    const before = await admin.workoutDraft.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(before.content).toMatchObject({ goal: 'Hipertrofia' });
    expect(
      await admin.workoutTemplate.findUniqueOrThrow({
        where: { id: template.id },
      }),
    ).toMatchObject({ goal: 'MUSCLE_GAIN', content: { goal: 'MUSCLE_GAIN' } });
    await importRequest().expect(409).expect('Cache-Control', 'no-store');
    expect(
      await admin.workoutDraft.findUniqueOrThrow({ where: { id: draft.id } }),
    ).toEqual(before);
    expect(
      await admin.workoutDraft.count({ where: { clientId, status: 'OPEN' } }),
    ).toBe(1);
    expect(
      await admin.workout.findMany({
        where: { clientId, isActive: true },
        select: { id: true },
      }),
    ).toEqual([{ id: sourceId }]);
  });
  it('refreshes authorized custom media and conflicts atomically when custom reference is deleted', async () => {
    const custom = await admin.customExercise.create({
      data: {
        professionalId: actor.sub,
        name: 'Synthetic custom',
        normalizedName: 'synthetic custom',
        muscleGroup: 'CHEST',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        mediaVersion: 1,
      },
    });
    const { template } = await save();
    // Somente o owner sintético prepara um snapshot antigo; runtime não possui UPDATE.
    const saved = template.content;
    saved.splits[0].exercises[0].libraryReference = {
      source: 'CUSTOM',
      exerciseId: custom.id,
      demonstrationRevision: '1',
    };
    await admin.workoutTemplate.update({
      where: { id: template.id },
      data: { content: JSON.parse(JSON.stringify(saved)) as object },
    });
    await admin.customExercise.update({
      where: { id: custom.id },
      data: {
        mediaVersion: 2,
        videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
      },
    });
    const imported = await http()
      .post(`/workouts/templates/${template.id}/create-draft`)
      .set('Authorization', auth())
      .send({ clientId })
      .expect(201);
    expect(
      (imported.body as { content: DraftContentInput }).content.splits[0]
        .exercises[0].libraryReference?.demonstrationRevision,
    ).toBe('2');
    await admin.workoutDraft.deleteMany({
      where: { clientId, status: 'OPEN' },
    });
    await admin.customExercise.delete({ where: { id: custom.id } });
    await http()
      .post(`/workouts/templates/${template.id}/create-draft`)
      .set('Authorization', auth())
      .send({ clientId })
      .expect(409);
    expect(
      await admin.workoutDraft.count({ where: { clientId, status: 'OPEN' } }),
    ).toBe(0);
  });
  it('blocks archived source derivation and archived/foreign target import', async () => {
    const { template } = await save();
    await http()
      .post(`/workouts/templates/${template.id}/create-draft`)
      .set('Authorization', auth())
      .send({ clientId: isolationFixtures.training.clientB })
      .expect(404);
    await admin.client.update({
      where: { id: clientId },
      data: { status: 'ARCHIVED' },
    });
    await http()
      .post(`/workouts/templates/from-workout/${sourceId}`)
      .set('Authorization', auth())
      .send(input)
      .expect(409);
    await http()
      .post(`/workouts/templates/${template.id}/create-draft`)
      .set('Authorization', auth())
      .send({ clientId })
      .expect(409);
  });
  it('enforces SELECT own+global, INSERT own only, immutable grants and Data API denial with real LOGIN', async () => {
    const { template } = await save();
    const clinical = new Pool({
      connectionString: process.env.CLINICAL_DATABASE_URL,
    });
    const connection = await clinical.connect();
    try {
      const role = (
        await connection.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
          'SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user',
        )
      ).rows[0];
      expect(role).toEqual({ rolsuper: false, rolbypassrls: false });
      const service = app.get(PrismaService);
      await expect(
        service.runAsProfessional(
          { ...other, sessionId: 'synthetic-template-rls' },
          'template-rls',
          () =>
            service.workoutTemplate.findMany({ where: { id: template.id } }),
        ),
      ).resolves.toEqual([]);
      await expect(
        service.runAsProfessional(
          { ...actor, sessionId: 'synthetic-template-rls' },
          'template-rls',
          () =>
            service.workoutTemplate.create({
              data: {
                professionalId: null,
                ...input,
                estimatedWeeks: 8,
                schemaVersion: 3,
                content: {},
              },
            }),
        ),
      ).rejects.toThrow();
      await expect(
        service.runAsProfessional(
          { ...actor, sessionId: 'synthetic-template-rls' },
          'template-rls',
          () =>
            service.workoutTemplate.create({
              data: { professionalId: other.sub, ...input, content: {} },
            }),
        ),
      ).rejects.toThrow();
      await expect(
        service.runAsProfessional(
          { ...actor, sessionId: 'synthetic-template-rls' },
          'template-rls',
          () =>
            service.workoutTemplate.update({
              where: { id: template.id },
              data: { title: 'Changed' },
            }),
        ),
      ).rejects.toThrow();
      await expect(
        service.runAsProfessional(
          { ...actor, sessionId: 'synthetic-template-rls' },
          'template-rls',
          () => service.workoutTemplate.delete({ where: { id: template.id } }),
        ),
      ).rejects.toThrow();
      const deniedPrivileges = await pool.query<{ allowed: boolean }>(
        "SELECT has_table_privilege('safemove_data_api_denied','public.workout_templates','SELECT,INSERT,UPDATE,DELETE') AS allowed",
      );
      expect(deniedPrivileges.rows).toEqual([{ allowed: false }]);
      // LOGIN de Data API sintético: mesmo com grants clínicos herdados acidentalmente,
      // a policy restritiva deve prevalecer. Nenhuma role real/remota é alterada.
      await pool.query(
        "CREATE ROLE safemove_template_data_api_probe LOGIN PASSWORD 'local-synthetic-only' NOSUPERUSER NOBYPASSRLS",
      );
      const denied = new Pool({
        connectionString:
          'postgresql://safemove_template_data_api_probe:local-synthetic-only@localhost:5434/ecossistema_resiliencia_test',
      });
      try {
        await pool.query(
          'GRANT safemove_data_api_denied,safemove_clinical TO safemove_template_data_api_probe',
        );
        const dataConnection = await denied.connect();
        try {
          const dataRole = (
            await dataConnection.query<{
              rolsuper: boolean;
              rolbypassrls: boolean;
            }>(
              'SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user',
            )
          ).rows[0];
          expect(dataRole).toEqual({ rolsuper: false, rolbypassrls: false });
          await dataConnection.query('BEGIN');
          await dataConnection.query(
            "SELECT set_config('safemove.professional_id',$1,true),set_config('safemove.role','PERSONAL',true)",
            [actor.sub],
          );
          expect(
            (await dataConnection.query('SELECT id FROM workout_templates'))
              .rows,
          ).toEqual([]);
          await expect(
            dataConnection.query(
              `INSERT INTO workout_templates (id,professional_id,title,goal,level,content,"updatedAt") VALUES ('75000000-0000-4000-8000-000000000099',$1,'Denied','MUSCLE_GAIN','BEGINNER','{}',now())`,
              [actor.sub],
            ),
          ).rejects.toMatchObject({ code: '42501' });
          await dataConnection.query('ROLLBACK');
        } finally {
          dataConnection.release();
        }
      } finally {
        await denied.end();
        await pool.query('DROP ROLE safemove_template_data_api_probe');
      }
    } finally {
      connection.release();
      await clinical.end();
    }
  });
});
