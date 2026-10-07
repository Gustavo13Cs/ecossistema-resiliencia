import { isolationPort } from './fixtures/client-isolation';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, PoolClient } from 'pg';

const ADMIN_DATABASE_URL = `postgresql://postgres:postgres@localhost:${isolationPort}/postgres`;
const TARGET_MIGRATION = '20260929120000_add_client_owned_clinical_resources';
const MIGRATIONS_DIR = resolve(__dirname, '../prisma/migrations');
const TARGET_MIGRATION_PATH = resolve(
  MIGRATIONS_DIR,
  TARGET_MIGRATION,
  'migration.sql',
);

const PROFESSIONAL_A = '41000000-0000-4000-8000-000000000001';
const PROFESSIONAL_B = '41000000-0000-4000-8000-000000000002';
const UNRELATED_PROFESSIONAL = '41000000-0000-4000-8000-000000000003';
const UNIQUE_PATIENT = '41000000-0000-4000-8000-000000000004';
const AMBIGUOUS_PATIENT = '41000000-0000-4000-8000-000000000005';
const UNIQUE_CLIENT = '42000000-0000-4000-8000-000000000001';
const AMBIGUOUS_CLIENT_A = '42000000-0000-4000-8000-000000000002';
const AMBIGUOUS_CLIENT_B = '42000000-0000-4000-8000-000000000003';

const EXPLICIT_OWNER_RESOURCES = [
  {
    table: 'workouts',
    uniqueId: 'workout-unique',
    ambiguousId: 'workout-ambiguous',
  },
  {
    table: 'rehab_plans',
    uniqueId: 'rehab-unique',
    ambiguousId: 'rehab-ambiguous',
  },
  {
    table: 'anamneses',
    uniqueId: 'anamnesis-unique',
    ambiguousId: 'anamnesis-ambiguous',
  },
  {
    table: 'supplement_plans',
    uniqueId: 'supplement-unique',
    ambiguousId: 'supplement-ambiguous',
  },
  {
    table: 'lab_exams',
    uniqueId: 'lab-exam-unique',
    ambiguousId: 'lab-exam-ambiguous',
  },
] as const;

const CLIENT_OWNED_TABLES = [
  'workouts',
  'rehab_plans',
  'physio_assessments',
  'anamneses',
  'supplement_plans',
  'lab_exams',
  'consultation_notes',
  'DailyTracking',
  'patient_alerts',
  'client_goals',
  'lab_orders',
] as const;

describe('Client-owned clinical schema migration (e2e)', () => {
  jest.setTimeout(60_000);

  const databaseName = `safemove_client_owned_${randomUUID().replaceAll('-', '')}`;
  const databaseUrl = `postgresql://postgres:postgres@localhost:${isolationPort}/${databaseName}`;
  let adminPool: Pool;
  let pool: Pool;

  beforeAll(async () => {
    assertSafeLocalDatabase(ADMIN_DATABASE_URL);
    adminPool = new Pool({ connectionString: ADMIN_DATABASE_URL });
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);

    pool = new Pool({ connectionString: databaseUrl });
    await applyMigrationsBeforeTarget(pool);
    await seedLegacyOwnershipFixtures(pool);

    const migrationSql = existsSync(TARGET_MIGRATION_PATH)
      ? readFileSync(TARGET_MIGRATION_PATH, 'utf8')
      : 'SELECT 1';
    await pool.query(migrationSql);
  });

  afterAll(async () => {
    await pool?.end();

    if (adminPool) {
      await adminPool.query(
        `select pg_terminate_backend(pid)
         from pg_stat_activity
         where datname = $1 and pid <> pg_backend_pid()`,
        [databaseName],
      );
      await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await adminPool.end();
    }
  });

  it('backfills only rows whose Client and author are provable', async () => {
    for (const resource of EXPLICIT_OWNER_RESOURCES) {
      const rows = await pool.query<{ id: string; clientId: string | null }>(
        `select id, "clientId" from public."${resource.table}"
         where id = any($1::text[]) order by id`,
        [[resource.ambiguousId, resource.uniqueId]],
      );

      expect(rows.rows).toEqual([
        { id: resource.ambiguousId, clientId: null },
        { id: resource.uniqueId, clientId: UNIQUE_CLIENT },
      ]);
    }

    const alerts = await pool.query<{ id: string; clientId: string | null }>(
      `select id, "clientId" from public.patient_alerts
       where id = any($1::text[]) order by id`,
      [['alert-ambiguous', 'alert-unique']],
    );
    expect(alerts.rows).toEqual([
      { id: 'alert-ambiguous', clientId: null },
      { id: 'alert-unique', clientId: UNIQUE_CLIENT },
    ]);
  });

  it('does not guess ownership for authorless rows with multiple possible Clients', async () => {
    const physio = await pool.query<{
      id: string;
      clientId: string | null;
      creatorId: string | null;
    }>(
      `select id, "clientId", "creatorId" from public.physio_assessments
       where id = any($1::text[]) order by id`,
      [['physio-ambiguous', 'physio-unique']],
    );
    expect(physio.rows).toEqual([
      { id: 'physio-ambiguous', clientId: null, creatorId: null },
      {
        id: 'physio-unique',
        clientId: UNIQUE_CLIENT,
        creatorId: PROFESSIONAL_A,
      },
    ]);

    const tracking = await pool.query<{
      id: string;
      clientId: string | null;
      professionalId: string | null;
    }>(
      `select id, "clientId", "professionalId" from public."DailyTracking"
       where id = any($1::text[]) order by id`,
      [['tracking-ambiguous', 'tracking-unique']],
    );
    expect(tracking.rows).toEqual([
      {
        id: 'tracking-ambiguous',
        clientId: null,
        professionalId: null,
      },
      {
        id: 'tracking-unique',
        clientId: UNIQUE_CLIENT,
        professionalId: PROFESSIONAL_A,
      },
    ]);
  });

  it('supports new Client-only writes while retaining nullable legacy columns', async () => {
    await withTransaction(pool, async (client) => {
      await client.query(
        `insert into public.workouts
           (id, title, "clientId", "creatorId", "userId", "updatedAt")
         values ('new-workout', 'Client workout', $1, $2, null, now())`,
        [UNIQUE_CLIENT, PROFESSIONAL_A],
      );
      await client.query(
        `insert into public.rehab_plans
           (id, title, "clientId", "creatorId", "userId", "updatedAt")
         values ('new-rehab', 'Client rehab', $1, $2, null, now())`,
        [UNIQUE_CLIENT, PROFESSIONAL_A],
      );
      await client.query(
        `insert into public.physio_assessments
           (id, "clientId", "creatorId", "userId", "updatedAt")
         values ('new-physio', $1, $2, null, now())`,
        [UNIQUE_CLIENT, PROFESSIONAL_A],
      );
      await client.query(
        `insert into public.anamneses
           (id, "clientId", "creatorId", "patientId", "updatedAt")
         values ('new-anamnesis', $1, $2, null, now())`,
        [UNIQUE_CLIENT, PROFESSIONAL_A],
      );
      await client.query(
        `insert into public.supplement_plans
           (id, title, "clientId", "creatorId", "patientId", "updatedAt")
         values ('new-supplement', 'Client supplement', $1, $2, null, now())`,
        [UNIQUE_CLIENT, PROFESSIONAL_A],
      );
      await client.query(
        `insert into public.lab_exams
           (id, date, "clientId", "creatorId", "patientId", "updatedAt")
         values ('new-lab-exam', now(), $1, $2, null, now())`,
        [UNIQUE_CLIENT, PROFESSIONAL_A],
      );
      await client.query(
        `insert into public.consultation_notes
           (id, content, "clientId", "creatorId", "patientId", "updatedAt")
         values ('new-note', 'Client note', $1, $2, null, now())`,
        [UNIQUE_CLIENT, PROFESSIONAL_A],
      );
      await client.query(
        `insert into public."DailyTracking"
           (id, type, "itemName", "clientId", "professionalId", "patientId")
         values ('new-tracking', 'WORKOUT', 'Client tracking', $1, $2, null)`,
        [UNIQUE_CLIENT, PROFESSIONAL_A],
      );
      await client.query(
        `insert into public.patient_alerts
           (id, type, severity, message, "clientId", "professionalId", "patientId")
         values ('new-alert', 'INACTIVE_5_DAYS', 'LOW', 'Client alert', $1, $2, null)`,
        [UNIQUE_CLIENT, PROFESSIONAL_A],
      );
    });
  });

  it('creates restrictive ownership foreign keys and keeps historical schema', async () => {
    const tables = await pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_name = any($1::text[])`,
      [CLIENT_OWNED_TABLES],
    );
    expect(new Set(tables.rows.map((row) => row.table_name))).toEqual(
      new Set(CLIENT_OWNED_TABLES),
    );

    const clientForeignKeys = await pool.query<{
      table_name: string;
      delete_action: string;
    }>(
      `select rel.relname as table_name, con.confdeltype::text as delete_action
       from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_attribute attr
         on attr.attrelid = rel.oid and attr.attnum = any(con.conkey)
       where con.contype = 'f'
         and attr.attname = 'clientId'
         and rel.relname = any($1::text[])
       order by rel.relname`,
      [CLIENT_OWNED_TABLES],
    );
    expect(clientForeignKeys.rows).toHaveLength(CLIENT_OWNED_TABLES.length);
    expect(
      clientForeignKeys.rows.every(
        ({ delete_action }) => delete_action === 'r',
      ),
    ).toBe(true);

    const nullableLegacyColumns = await pool.query<{
      table_name: string;
      column_name: string;
      is_nullable: string;
    }>(
      `select table_name, column_name, is_nullable
       from information_schema.columns
       where table_schema = 'public'
         and (table_name, column_name) in (
           ('workouts', 'userId'),
           ('rehab_plans', 'userId'),
           ('physio_assessments', 'userId'),
           ('anamneses', 'patientId'),
           ('supplement_plans', 'patientId'),
           ('lab_exams', 'patientId'),
           ('consultation_notes', 'patientId'),
           ('DailyTracking', 'patientId'),
           ('patient_alerts', 'patientId')
         )`,
    );
    expect(nullableLegacyColumns.rows).toHaveLength(9);
    expect(
      nullableLegacyColumns.rows.every(
        ({ is_nullable }) => is_nullable === 'YES',
      ),
    ).toBe(true);
  });

  it('enforces one current goal per Client and stores LabOrder marker arrays', async () => {
    await withTransaction(
      pool,
      async (client) => {
        await client.query(
          `insert into public.client_goals
           (id, "clientId", "professionalId", category, status, "startDate",
            "targetDate", "waterTargetMl", "sleepTargetHours",
            "mealsAdherencePercent", "dailyStepsTarget", "updatedAt")
         values ('goal-one', $1, $2, 'WEIGHT_LOSS', 'ON_TRACK', now(),
                 now() + interval '90 days', 2500, 8, 90, 9000, now())`,
          [UNIQUE_CLIENT, PROFESSIONAL_A],
        );
        await expect(
          client.query(
            `insert into public.client_goals
             (id, "clientId", "professionalId", category, status, "startDate",
              "targetDate", "waterTargetMl", "sleepTargetHours",
              "mealsAdherencePercent", "dailyStepsTarget", "updatedAt")
           values ('goal-two', $1, $2, 'PERFORMANCE', 'PENDING', now(),
                   now() + interval '60 days', 2600, 8, 85, 8000, now())`,
            [UNIQUE_CLIENT, PROFESSIONAL_A],
          ),
        ).rejects.toMatchObject({ code: '23505' });
        await client
          .query('ROLLBACK TO SAVEPOINT goal_uniqueness')
          .catch(() => undefined);
      },
      'goal_uniqueness',
    );

    await withTransaction(pool, async (client) => {
      const order = await client.query<{ markers: string[] }>(
        `insert into public.lab_orders
           (id, "clientId", "professionalId", title, markers,
            "clinicalIndication", "preparationInstructions", "updatedAt")
         values ('lab-order-one', $1, $2, 'Metabolic panel',
                 array['Glicemia', 'Hemoglobina glicada'],
                 'Follow-up', 'Jejum de 8 horas', now())
         returning markers`,
        [UNIQUE_CLIENT, PROFESSIONAL_A],
      );
      expect(order.rows[0].markers).toEqual([
        'Glicemia',
        'Hemoglobina glicada',
      ]);
    });
  });
});

function assertSafeLocalDatabase(connectionString: string) {
  const url = new URL(connectionString);
  expect(['localhost', '127.0.0.1']).toContain(url.hostname);
  expect(url.port).toBe(String(isolationPort));
  expect(url.pathname).toBe('/postgres');
}

async function applyMigrationsBeforeTarget(pool: Pool) {
  const migrationNames = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name < TARGET_MIGRATION)
    .map((entry) => entry.name)
    .sort();

  for (const migrationName of migrationNames) {
    const migrationPath = resolve(
      MIGRATIONS_DIR,
      migrationName,
      'migration.sql',
    );
    await pool.query(readFileSync(migrationPath, 'utf8'));
  }
}

async function seedLegacyOwnershipFixtures(pool: Pool) {
  await pool.query(
    `insert into public."User" (id, name, email, password, role, "updatedAt") values
       ($1, 'Professional A', 'professional-a@migration.test', 'not-used', 'NUTRITIONIST', now()),
       ($2, 'Professional B', 'professional-b@migration.test', 'not-used', 'PERSONAL', now()),
       ($3, 'Unrelated professional', 'professional-c@migration.test', 'not-used', 'PHYSIO', now()),
       ($4, 'Unique patient', 'unique-patient@migration.test', 'not-used', 'PATIENT', now()),
       ($5, 'Ambiguous patient', 'ambiguous-patient@migration.test', 'not-used', 'PATIENT', now())`,
    [
      PROFESSIONAL_A,
      PROFESSIONAL_B,
      UNRELATED_PROFESSIONAL,
      UNIQUE_PATIENT,
      AMBIGUOUS_PATIENT,
    ],
  );

  await pool.query(
    `insert into public.professional_patient_links
       (id, "professionalId", "patientId", "updatedAt") values
       ($1, $2, $3, now()),
       ($4, $2, $5, now()),
       ($6, $7, $5, now())`,
    [
      UNIQUE_CLIENT,
      PROFESSIONAL_A,
      UNIQUE_PATIENT,
      AMBIGUOUS_CLIENT_A,
      AMBIGUOUS_PATIENT,
      AMBIGUOUS_CLIENT_B,
      PROFESSIONAL_B,
    ],
  );

  await pool.query(
    `insert into public.clients
       (id, "professionalId", name, "updatedAt") values
       ($1, $2, 'Unique Client', now()),
       ($3, $2, 'Ambiguous Client A', now()),
       ($4, $5, 'Ambiguous Client B', now())`,
    [
      UNIQUE_CLIENT,
      PROFESSIONAL_A,
      AMBIGUOUS_CLIENT_A,
      AMBIGUOUS_CLIENT_B,
      PROFESSIONAL_B,
    ],
  );

  const ownedFixtureValues = [
    UNIQUE_PATIENT,
    PROFESSIONAL_A,
    AMBIGUOUS_PATIENT,
    UNRELATED_PROFESSIONAL,
  ];
  await pool.query(
    `insert into public.workouts
       (id, title, "userId", "creatorId", "updatedAt") values
       ('workout-unique', 'Unique', $1, $2, now()),
       ('workout-ambiguous', 'Ambiguous', $3, $4, now())`,
    ownedFixtureValues,
  );
  await pool.query(
    `insert into public.rehab_plans
       (id, title, "userId", "creatorId", "updatedAt") values
       ('rehab-unique', 'Unique', $1, $2, now()),
       ('rehab-ambiguous', 'Ambiguous', $3, $4, now())`,
    ownedFixtureValues,
  );
  await pool.query(
    `insert into public.anamneses
       (id, "patientId", "creatorId", "updatedAt") values
       ('anamnesis-unique', $1, $2, now()),
       ('anamnesis-ambiguous', $3, $4, now())`,
    ownedFixtureValues,
  );
  await pool.query(
    `insert into public.supplement_plans
       (id, title, "patientId", "creatorId", "updatedAt") values
       ('supplement-unique', 'Unique', $1, $2, now()),
       ('supplement-ambiguous', 'Ambiguous', $3, $4, now())`,
    ownedFixtureValues,
  );
  await pool.query(
    `insert into public.lab_exams
       (id, date, "patientId", "creatorId", "updatedAt") values
       ('lab-exam-unique', now(), $1, $2, now()),
       ('lab-exam-ambiguous', now(), $3, $4, now())`,
    ownedFixtureValues,
  );

  const authorlessFixtureValues = [UNIQUE_PATIENT, AMBIGUOUS_PATIENT];
  await pool.query(
    `insert into public.physio_assessments (id, "userId", "updatedAt") values
       ('physio-unique', $1, now()),
       ('physio-ambiguous', $2, now())`,
    authorlessFixtureValues,
  );
  await pool.query(
    `insert into public."DailyTracking" (id, "patientId", type, "itemName") values
       ('tracking-unique', $1, 'WORKOUT', 'Unique tracking'),
       ('tracking-ambiguous', $2, 'MEAL', 'Ambiguous tracking')`,
    authorlessFixtureValues,
  );

  await pool.query(
    `insert into public.patient_alerts
       (id, type, severity, message, "patientId", "professionalId") values
       ('alert-unique', 'INACTIVE_5_DAYS', 'LOW', 'Unique alert', $1, $2),
       ('alert-ambiguous', 'PLATEAU_3_WEEKS', 'MEDIUM', 'Ambiguous alert', $3, $4)`,
    [UNIQUE_PATIENT, PROFESSIONAL_A, AMBIGUOUS_PATIENT, UNRELATED_PROFESSIONAL],
  );
}

async function withTransaction(
  pool: Pool,
  run: (client: PoolClient) => Promise<void>,
  savepoint?: string,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (savepoint) {
      await client.query(`SAVEPOINT ${savepoint}`);
    }
    await run(client);
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
