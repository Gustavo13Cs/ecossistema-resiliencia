import { Pool } from 'pg';

const SAFE_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test';

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

describe('Database defensive RLS hardening (e2e)', () => {
  let pool: Pool;

  beforeAll(() => {
    expect(SAFE_TEST_DATABASE_URL).toMatch(/_test$/);
    expect(process.env.DATABASE_URL).toBe(SAFE_TEST_DATABASE_URL);
    expect(process.env.DIRECT_URL).toBe(SAFE_TEST_DATABASE_URL);
    pool = new Pool({ connectionString: SAFE_TEST_DATABASE_URL });
  });

  afterAll(async () => {
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

  it('leaves existing Supabase Data API roles without table privileges', async () => {
    const result = await pool.query<{ role_name: string; can_access: boolean }>(
      `select r.rolname as role_name,
              bool_or(
                has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'SELECT')
                or has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'INSERT')
                or has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'UPDATE')
                or has_table_privilege(r.rolname, format('%I.%I', 'public', table_name), 'DELETE')
              ) as can_access
       from pg_roles r
       cross join unnest($1::text[]) as table_name
       where r.rolname = any($2::text[])
       group by r.rolname
       order by r.rolname`,
      [APPLICATION_TABLES, ['anon', 'authenticated', 'service_role']],
    );

    expect(result.rows.every((row) => row.can_access === false)).toBe(true);
  });
});
