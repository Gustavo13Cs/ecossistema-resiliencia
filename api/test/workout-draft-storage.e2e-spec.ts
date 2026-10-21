import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, PoolClient } from 'pg';
import { PrismaService } from '../src/infra/database/prisma.service';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import {
  assertIsolationDatabase,
  isolationFixtures,
} from './fixtures/client-isolation';
import { runtimeUrls } from './fixtures/runtime-roles';

const migrationName = '20261017120000_workout_drafts';
const { a, b, clientA, clientB } = isolationFixtures.training;
const legacyId = '91000000-0000-4000-8000-000000000001';

describe('Workout draft storage and RLS (synthetic PostgreSQL)', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  let runtime: Pool;
  let legacyBefore: Record<string, unknown>;
  beforeAll(async () => {
    assertIsolationDatabase();
    db = await isolatedPostgres({ beforeHistoryRemoval: true });
    const directory = resolve(__dirname, '../prisma/migrations');
    for (const migration of readdirSync(directory).sort()) {
      if (
        migration < '20261008120000_remove_read_access_history' ||
        migration >= migrationName
      )
        continue;
      const path = resolve(directory, migration, 'migration.sql');
      if (existsSync(path)) await db.pool.query(readFileSync(path, 'utf8'));
    }
    await db.pool.query(
      `INSERT INTO "User" (id,name,email,password,role,"updatedAt") VALUES ($1,'Synthetic','draft-a@test.invalid','unused','PERSONAL',now()),($2,'Synthetic','draft-b@test.invalid','unused','PERSONAL',now())`,
      [a.sub, b.sub],
    );
    await db.pool.query(
      `INSERT INTO clients (id,"professionalId",name,"updatedAt") VALUES ($1,$2,'Synthetic A',now()),($3,$4,'Synthetic B',now())`,
      [clientA, a.sub, clientB, b.sub],
    );
    await db.pool.query(
      `INSERT INTO workouts (id,title,"creatorId","clientId",notes,"createdAt","updatedAt") VALUES ($1,'Legacy synthetic',$2,$3,'preserved', '2020-01-01','2020-02-01')`,
      [legacyId, a.sub, clientA],
    );
    await db.pool.query(
      `INSERT INTO workout_splits (id,name,"workoutId",position) VALUES ('legacy-split','A',$1,2)`,
      [legacyId],
    );
    await db.pool.query(
      `INSERT INTO workout_exercises (id,name,sets,reps,"splitId",position) VALUES ('legacy-exercise','Synthetic','3','10','legacy-split',4)`,
    );
    legacyBefore = await legacySnapshot();
    const path = resolve(directory, migrationName, 'migration.sql');
    if (existsSync(path)) await db.pool.query(readFileSync(path, 'utf8'));
    urls = await runtimeUrls(db.pool, db.port);
    runtime = new Pool({ connectionString: urls.values.CLINICAL_DATABASE_URL });
  });
  afterAll(async () => {
    await runtime?.end();
    urls?.restore();
    await db?.close();
  });
  beforeEach(async () => {
    await db.pool.query('DELETE FROM workout_drafts');
  });
  async function legacySnapshot() {
    return (
      await db.pool.query<Record<string, unknown>>(
        `SELECT to_jsonb(w)-'finalizedAt'-'revisionOfId' AS workout,(SELECT jsonb_agg(to_jsonb(s)) FROM workout_splits s WHERE s."workoutId"=w.id) AS splits,(SELECT jsonb_agg(to_jsonb(e)) FROM workout_exercises e JOIN workout_splits s ON s.id=e."splitId" WHERE s."workoutId"=w.id) AS exercises FROM workouts w WHERE id=$1`,
        [legacyId],
      )
    ).rows[0];
  }
  async function insert(
    id = 'draft-a',
    professionalId = a.sub,
    clientId = clientA,
    extra = '',
  ) {
    return db.pool.query(
      `INSERT INTO workout_drafts (id,"professionalId","clientId",content,"updatedAt"${extra}) VALUES ($1,$2,$3,'{"title":"","splits":[]}',now())`,
      [id, professionalId, clientId],
    );
  }
  async function scoped<T>(
    id: string,
    fn: (c: PoolClient) => Promise<T>,
    role = 'PERSONAL',
  ) {
    const c = await runtime.connect();
    try {
      await c.query('BEGIN');
      await c.query(
        "SELECT set_config('safemove.professional_id',$1,true),set_config('safemove.role',$2,true)",
        [id, role],
      );
      const result = await fn(c);
      await c.query('COMMIT');
      return result;
    } catch (error) {
      await c.query('ROLLBACK');
      throw error;
    } finally {
      c.release();
    }
  }
  it('exposes the draft delegate only inside the clinical request transaction', async () => {
    const previous = process.env.CLINICAL_DATABASE_URL;
    process.env.CLINICAL_DATABASE_URL = urls.values.CLINICAL_DATABASE_URL;
    const prisma = new PrismaService();
    if (previous === undefined) delete process.env.CLINICAL_DATABASE_URL;
    else process.env.CLINICAL_DATABASE_URL = previous;
    try {
      expect(() => prisma.workoutDraft).toThrow(
        'Clinical database context required',
      );
      const draft = await prisma.runAsProfessional(
        { ...a, sessionId: 'synthetic-session' },
        'synthetic-request',
        () =>
          prisma.workoutDraft.create({
            data: {
              professionalId: a.sub,
              clientId: clientA,
              content: { title: '', splits: [] },
            },
          }),
      );
      expect(draft).toMatchObject({
        version: 1,
        schemaVersion: 1,
        status: 'OPEN',
        clientId: clientA,
      });
      expect(
        await prisma.runAsProfessional(
          { ...b, sessionId: 'synthetic-session' },
          'synthetic-request-b',
          () => prisma.workoutDraft.findMany(),
        ),
      ).toEqual([]);
      expect(() => prisma.workoutDraft).toThrow(
        'Clinical database context required',
      );
    } finally {
      await prisma.$disconnect();
    }
  });
  it('one_open_per_owner_and_client', async () => {
    await insert();
    await expect(insert('draft-second')).rejects.toMatchObject({
      code: '23505',
    });
    await db.pool.query(
      `UPDATE workout_drafts SET status='DISCARDED',content=NULL,"closedAt"=now() WHERE id='draft-a'`,
    );
    await expect(insert('draft-next')).resolves.toBeDefined();
    await expect(insert('draft-other', b.sub, clientB)).resolves.toBeDefined();
  });
  it('rejects_invalid_terminal_shape', async () => {
    await insert();
    for (const set of [
      `content=NULL`,
      `"closedAt"=now()`,
      `"finalizedWorkoutId"='${legacyId}'`,
      `status='FINALIZED'`,
      `status='DISCARDED'`,
      `status='DISCARDED',content=NULL`,
      `status='FINALIZED',content=NULL,"closedAt"=now()`,
      `version=0`,
      `"schemaVersion"=0`,
    ]) {
      await expect(
        db.pool.query(`UPDATE workout_drafts SET ${set} WHERE id='draft-a'`),
      ).rejects.toMatchObject({ code: '23514' });
    }
    await expect(
      db.pool.query(
        `UPDATE workout_drafts SET status='FINALIZED',content=NULL,"closedAt"=now(),"finalizedWorkoutId"=$1 WHERE id='draft-a'`,
        [legacyId],
      ),
    ).resolves.toBeDefined();
    await expect(
      db.pool.query(
        `INSERT INTO workout_drafts (id,"professionalId","clientId",status,content,"closedAt","finalizedWorkoutId","updatedAt") VALUES ('duplicate',$1,$2,'FINALIZED',NULL,now(),$3,now())`,
        [a.sub, clientA, legacyId],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });
  it('isolates reads and writes by professional AND client ownership', async () => {
    await insert();
    await insert('forged-owner', a.sub, clientB);
    expect(
      (await scoped(a.sub, (c) => c.query('SELECT id FROM workout_drafts')))
        .rows,
    ).toEqual([{ id: 'draft-a' }]);
    expect(
      (await scoped(b.sub, (c) => c.query('SELECT id FROM workout_drafts')))
        .rows,
    ).toEqual([]);
    expect(
      (
        await scoped(b.sub, (c) =>
          c.query(`UPDATE workout_drafts SET version=2 WHERE id='draft-a'`),
        )
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await scoped(b.sub, (c) =>
          c.query(`DELETE FROM workout_drafts WHERE id='draft-a'`),
        )
      ).rowCount,
    ).toBe(0);
    await expect(
      scoped(b.sub, (c) =>
        c.query(
          `INSERT INTO workout_drafts (id,"professionalId","clientId",content,"updatedAt") VALUES ('forged',$1,$2,'{}',now())`,
          [a.sub, clientA],
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      scoped(a.sub, (c) =>
        c.query(
          `INSERT INTO workout_drafts (id,"professionalId","clientId",content,"updatedAt") VALUES ('wrong-client',$1,$2,'{}',now())`,
          [a.sub, clientB],
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      scoped(a.sub, (c) =>
        c.query(`UPDATE workout_drafts SET "clientId"=$1 WHERE id='draft-a'`, [
          clientB,
        ]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    expect(
      (
        await scoped(a.sub, (c) =>
          c.query(`UPDATE workout_drafts SET version=2 WHERE id='draft-a'`),
        )
      ).rowCount,
    ).toBe(1);
  });
  it('requires PERSONAL context and denies unscoped/auth/jobs/PUBLIC/Data API', async () => {
    await insert();
    for (const role of ['NUTRITIONIST', 'PHYSIO', 'ADMIN', 'PATIENT', ''])
      expect(
        (
          await scoped(
            a.sub,
            (c) => c.query('SELECT id FROM workout_drafts'),
            role,
          )
        ).rows,
      ).toEqual([]);
    expect((await runtime.query('SELECT id FROM workout_drafts')).rows).toEqual(
      [],
    );
    expect(
      (
        await runtime.query(
          'SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user',
        )
      ).rows[0],
    ).toEqual({ rolsuper: false, rolbypassrls: false });
    for (const role of [
      'safemove_auth',
      'safemove_jobs',
      'safemove_data_api_denied',
    ])
      expect(
        (
          await db.pool.query<{ allowed: boolean }>(
            "SELECT has_table_privilege($1,'workout_drafts','SELECT,INSERT,UPDATE,DELETE') AS allowed",
            [role],
          )
        ).rows[0].allowed,
      ).toBe(false);
    expect(
      (
        await db.pool.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid='workout_drafts'::regclass AND a.grantee=0`,
        )
      ).rows[0].count,
    ).toBe(0);
  });
  it('restricts referenced deletion and preserves legacy rows without backfill', async () => {
    expect(await legacySnapshot()).toEqual(legacyBefore);
    expect(
      (
        await db.pool.query(
          'SELECT "finalizedAt","revisionOfId" FROM workouts WHERE id=$1',
          [legacyId],
        )
      ).rows[0],
    ).toEqual({ finalizedAt: null, revisionOfId: null });
    await insert();
    await db.pool.query(
      `UPDATE workout_drafts SET "sourceWorkoutId"=$1,"baseActiveWorkoutId"=$1 WHERE id='draft-a'`,
      [legacyId],
    );
    await expect(
      db.pool.query('DELETE FROM workouts WHERE id=$1', [legacyId]),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      db.pool.query('DELETE FROM clients WHERE id=$1', [clientA]),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      db.pool.query('DELETE FROM "User" WHERE id=$1', [a.sub]),
    ).rejects.toMatchObject({ code: '23503' });
  });
});
