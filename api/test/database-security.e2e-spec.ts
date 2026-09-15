import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const SAFE_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test';

const MIGRATION_PATH = resolve(
  __dirname,
  '../prisma/migrations/20260915133000_harden_supabase_data_api_rls/migration.sql',
);

const APPLICATION_TABLES = [
  'User',
  'DailyTracking',
  'clients',
  'client_audit_events',
  'professional_patient_links',
  'diet_plans',
  'meals',
  'meal_items',
  'foods',
  'food_preferences',
  'meal_logs',
  'physical_assessments',
  'physio_assessments',
  'workouts',
  'workout_splits',
  'workout_exercises',
  'workout_logs',
  'workout_log_sets',
  'rehab_plans',
  'rehab_sessions',
  'rehab_exercises',
  'anamneses',
  'supplement_plans',
  'supplement_items',
  'lab_exams',
  'lab_markers',
  'patient_alerts',
  'patient_consents',
  'health_check_ins',
  'agenda_tasks',
  'agenda_task_occurrences',
  'appointments',
  'appointment_events',
] as const;

const DATA_API_ROLES = ['anon', 'authenticated', 'service_role'] as const;
const EXISTING_TABLE_FIXTURE = 'rls_hardening_existing_table';
const FUTURE_TABLE_FIXTURE = 'rls_hardening_future_table';
const EXISTING_SEQUENCE_FIXTURE = 'rls_hardening_existing_sequence';
const FUTURE_SEQUENCE_FIXTURE = 'rls_hardening_future_sequence';

type PrivilegeRow = {
  role_name: string;
  object_name: string;
  privileges: boolean[];
};

describe('Database defensive RLS hardening (e2e)', () => {
  let pool: Pool;
  let createdFixtureRoles: string[] = [];

  beforeAll(async () => {
    const url = new URL(SAFE_TEST_DATABASE_URL);
    expect(['localhost', '127.0.0.1']).toContain(url.hostname);
    expect(url.port).toBe('5434');
    expect(url.pathname).toBe('/ecossistema_resiliencia_test');
    expect(process.env.DATABASE_URL).toBe(SAFE_TEST_DATABASE_URL);
    expect(process.env.DIRECT_URL).toBe(SAFE_TEST_DATABASE_URL);

    pool = new Pool({ connectionString: SAFE_TEST_DATABASE_URL });
    const existingRoles = await pool.query<{ rolname: string }>(
      'select rolname from pg_roles where rolname = any($1::text[])',
      [DATA_API_ROLES],
    );
    createdFixtureRoles = DATA_API_ROLES.filter(
      (role) => !existingRoles.rows.some((row) => row.rolname === role),
    );

    await pool.query(`
      DO $fixtures$
      DECLARE
        fixture_role text;
      BEGIN
        FOREACH fixture_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
        LOOP
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = fixture_role) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', fixture_role);
          END IF;
        END LOOP;
      END
      $fixtures$;

      DROP SCHEMA IF EXISTS rls_hardening_future_schema CASCADE;
      DROP FUNCTION IF EXISTS public.rls_hardening_existing_function();
      DROP FUNCTION IF EXISTS public.rls_hardening_future_function();
      DROP SEQUENCE IF EXISTS public.rls_hardening_existing_sequence;
      DROP SEQUENCE IF EXISTS public.rls_hardening_future_sequence;
      DROP TABLE IF EXISTS public.rls_hardening_existing_table;
      DROP TABLE IF EXISTS public.rls_hardening_future_table;

      CREATE TABLE public.rls_hardening_existing_table (id integer);
      CREATE SEQUENCE public.rls_hardening_existing_sequence;
      CREATE FUNCTION public.rls_hardening_existing_function()
      RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$;

      GRANT ALL PRIVILEGES ON TABLE public.rls_hardening_existing_table
      TO anon, authenticated, service_role;
      GRANT ALL PRIVILEGES ON SEQUENCE public.rls_hardening_existing_sequence
      TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION public.rls_hardening_existing_function()
      TO anon, authenticated, service_role, PUBLIC;
    `);

    await pool.query(readFileSync(MIGRATION_PATH, 'utf8'));

    await pool.query(`
      CREATE TABLE public.rls_hardening_future_table (id integer);
      CREATE SEQUENCE public.rls_hardening_future_sequence;
      CREATE FUNCTION public.rls_hardening_future_function()
      RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$;
      CREATE SCHEMA rls_hardening_future_schema;
      CREATE FUNCTION rls_hardening_future_schema.rls_hardening_future_function()
      RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$;
    `);
  });

  afterAll(async () => {
    await pool.query(`
      DROP SCHEMA IF EXISTS rls_hardening_future_schema CASCADE;
      DROP FUNCTION IF EXISTS public.rls_hardening_existing_function();
      DROP FUNCTION IF EXISTS public.rls_hardening_future_function();
      DROP SEQUENCE IF EXISTS public.rls_hardening_existing_sequence;
      DROP SEQUENCE IF EXISTS public.rls_hardening_future_sequence;
      DROP TABLE IF EXISTS public.rls_hardening_existing_table;
      DROP TABLE IF EXISTS public.rls_hardening_future_table;
    `);

    for (const role of createdFixtureRoles) {
      await pool.query(
        `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
         REVOKE ALL PRIVILEGES ON TABLES FROM ${role}`,
      );
      await pool.query(
        `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
         REVOKE ALL PRIVILEGES ON SEQUENCES FROM ${role}`,
      );
      await pool.query(
        `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
         REVOKE ALL PRIVILEGES ON FUNCTIONS FROM ${role}`,
      );
      await pool.query(`DROP ROLE IF EXISTS ${role}`);
    }

    await pool.end();
  });

  it('enables RLS on every physical application table', async () => {
    const result = await pool.query<{ table_name: string; rls_enabled: boolean }>(
      `select c.relname as table_name, c.relrowsecurity as rls_enabled
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relkind = 'r'
         and c.relname = any($1::text[])
       order by array_position($1::text[], c.relname)`,
      [APPLICATION_TABLES],
    );

    expect(result.rows.map((row) => row.table_name)).toEqual(
      APPLICATION_TABLES,
    );
    expect(result.rows.every((row) => row.rls_enabled)).toBe(true);
  });

  it('installs the restrictive deny policy on every managed table', async () => {
    const result = await pool.query<{
      tablename: string;
      permissive: string;
      roles: string[];
      cmd: string;
      qual: string;
      with_check: string;
    }>(
      `select tablename, permissive, roles::text[] as roles, cmd, qual, with_check
       from pg_policies
       where schemaname = 'public'
         and policyname = 'deny_data_api_access'
         and tablename = any($1::text[])
       order by array_position($1::text[], tablename)`,
      [APPLICATION_TABLES],
    );

    expect(result.rows.map((row) => row.tablename)).toEqual(
      APPLICATION_TABLES,
    );
    for (const policy of result.rows) {
      expect(policy.permissive).toBe('RESTRICTIVE');
      expect(policy.roles).toEqual(['public']);
      expect(policy.cmd).toBe('ALL');
      expect(policy.qual).toBe('false');
      expect(policy.with_check).toBe('false');
    }
  });

  it('removes every current table privilege from each Data API role', async () => {
    const result = await pool.query<PrivilegeRow>(
      `select r.rolname as role_name,
              table_name as object_name,
              array[
                has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'SELECT'),
                has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'INSERT'),
                has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'UPDATE'),
                has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'DELETE'),
                has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'TRUNCATE'),
                has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'REFERENCES'),
                has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'TRIGGER')
              ] as privileges
       from pg_roles r
       cross join unnest($1::text[]) as table_name
       where r.rolname = any($2::text[])
       order by r.rolname, array_position($1::text[], table_name)`,
      [[...APPLICATION_TABLES, EXISTING_TABLE_FIXTURE], DATA_API_ROLES],
    );

    expect(result.rows).toHaveLength(
      DATA_API_ROLES.length * (APPLICATION_TABLES.length + 1),
    );
    expect(result.rows.every((row) => row.privileges.every((value) => !value))).toBe(
      true,
    );
  });

  it('removes every current sequence and function privilege from each Data API role', async () => {
    const sequences = await pool.query<{ sequence_name: string }>(
      `select c.relname as sequence_name
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'S'
       order by c.relname`,
    );
    const sequencePrivileges = await pool.query<PrivilegeRow>(
      `select r.rolname as role_name,
              sequence_name as object_name,
              array[
                has_sequence_privilege(r.rolname, format('%I.%I', 'public', sequence_name), 'USAGE'),
                has_sequence_privilege(r.rolname, format('%I.%I', 'public', sequence_name), 'SELECT'),
                has_sequence_privilege(r.rolname, format('%I.%I', 'public', sequence_name), 'UPDATE')
              ] as privileges
       from pg_roles r
       cross join unnest($1::text[]) as sequence_name
       where r.rolname = any($2::text[])
       order by r.rolname, sequence_name`,
      [sequences.rows.map((row) => row.sequence_name), DATA_API_ROLES],
    );
    const functionPrivileges = await pool.query<PrivilegeRow>(
      `select r.rolname as role_name,
              p.oid::regprocedure::text as object_name,
              array[has_function_privilege(r.rolname, p.oid, 'EXECUTE')] as privileges
       from pg_roles r
       cross join pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where r.rolname = any($1::text[])
         and n.nspname = 'public'
         and p.prokind in ('f', 'p')
       order by r.rolname, p.oid::regprocedure::text`,
      [DATA_API_ROLES],
    );

    expect(sequences.rows.map((row) => row.sequence_name)).toContain(
      EXISTING_SEQUENCE_FIXTURE,
    );
    expect(sequencePrivileges.rows).not.toHaveLength(0);
    expect(functionPrivileges.rows).not.toHaveLength(0);
    expect(
      [...sequencePrivileges.rows, ...functionPrivileges.rows].every((row) =>
        row.privileges.every((value) => !value),
      ),
    ).toBe(true);
  });

  it('denies every Data API role through current and future default ACLs', async () => {
    const futureTables = await pool.query<PrivilegeRow>(
      `select r.rolname as role_name,
              $1::text as object_name,
              array[
                has_table_privilege(r.rolname, 'public.rls_hardening_future_table', 'SELECT'),
                has_table_privilege(r.rolname, 'public.rls_hardening_future_table', 'INSERT'),
                has_table_privilege(r.rolname, 'public.rls_hardening_future_table', 'UPDATE'),
                has_table_privilege(r.rolname, 'public.rls_hardening_future_table', 'DELETE'),
                has_table_privilege(r.rolname, 'public.rls_hardening_future_table', 'TRUNCATE'),
                has_table_privilege(r.rolname, 'public.rls_hardening_future_table', 'REFERENCES'),
                has_table_privilege(r.rolname, 'public.rls_hardening_future_table', 'TRIGGER')
              ] as privileges
       from pg_roles r
       where r.rolname = any($2::text[])
       order by r.rolname`,
      [FUTURE_TABLE_FIXTURE, DATA_API_ROLES],
    );
    const futureSequences = await pool.query<PrivilegeRow>(
      `select r.rolname as role_name,
              $1::text as object_name,
              array[
                has_sequence_privilege(r.rolname, 'public.rls_hardening_future_sequence', 'USAGE'),
                has_sequence_privilege(r.rolname, 'public.rls_hardening_future_sequence', 'SELECT'),
                has_sequence_privilege(r.rolname, 'public.rls_hardening_future_sequence', 'UPDATE')
              ] as privileges
       from pg_roles r
       where r.rolname = any($2::text[])
       order by r.rolname`,
      [FUTURE_SEQUENCE_FIXTURE, DATA_API_ROLES],
    );
    const futureFunctions = await pool.query<PrivilegeRow>(
      `select r.rolname as role_name,
              p.oid::regprocedure::text as object_name,
              array[has_function_privilege(r.rolname, p.oid, 'EXECUTE')] as privileges
       from pg_roles r
       cross join pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where r.rolname = any($1::text[])
         and ((n.nspname = 'public' and p.proname = 'rls_hardening_future_function')
           or (n.nspname = 'rls_hardening_future_schema' and p.proname = 'rls_hardening_future_function'))
       order by r.rolname, p.oid::regprocedure::text`,
      [DATA_API_ROLES],
    );
    const defaultAclPrivileges = await pool.query<{ privilege_count: string }>(
      `select count(*)::text as privilege_count
       from pg_default_acl d
       cross join lateral aclexplode(d.defaclacl) as acl
       left join pg_roles grantee on grantee.oid = acl.grantee
       where d.defaclrole = (select oid from pg_roles where rolname = 'postgres')
         and (acl.grantee = 0 or grantee.rolname = any($1::text[]))`,
      [DATA_API_ROLES],
    );

    expect(futureTables.rows).toHaveLength(DATA_API_ROLES.length);
    expect(futureSequences.rows).toHaveLength(DATA_API_ROLES.length);
    expect(futureFunctions.rows).toHaveLength(DATA_API_ROLES.length * 2);
    expect(
      [...futureTables.rows, ...futureSequences.rows, ...futureFunctions.rows].every(
        (row) => row.privileges.every((value) => !value),
      ),
    ).toBe(true);
    expect(defaultAclPrivileges.rows[0]?.privilege_count).toBe('0');
  });
});
