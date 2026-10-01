import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../prisma/migrations/20260915133000_harden_supabase_data_api_rls/migration.sql',
);

describe('Forward-only recipe function hardening', () => {
  it('alters exactly three no-argument search paths without replacing functions', () => {
    const path = resolve(
      __dirname,
      '../../../prisma/migrations/20260929130000_harden_recipe_function_search_paths/migration.sql',
    );
    const sql = existsSync(path) ? readFileSync(path, 'utf8') : '';
    expect(sql.match(/ALTER FUNCTION/g)).toHaveLength(3);
    for (const name of [
      'prevent_recipe_version_mutation',
      'publish_recipe_version_snapshot',
      'protect_published_recipe_ingredients',
    ]) {
      expect(sql).toContain(
        `ALTER FUNCTION public.${name}() SET search_path = pg_catalog, public;`,
      );
    }
    expect(sql).not.toMatch(/CREATE|SECURITY|OWNER|VOLATILE|LANGUAGE/i);
  });
});

describe('Query-backed Client indexes', () => {
  it('adds only non-unique indexes, preserving schema and data semantics', () => {
    const path = resolve(
      __dirname,
      '../../../prisma/migrations/20260929133000_index_client_owned_foreign_keys/migration.sql',
    );
    const sql = readFileSync(path, 'utf8');
    expect(sql.match(/^CREATE INDEX /gm)).toHaveLength(20);
    expect(sql).not.toMatch(/UNIQUE|DROP|ALTER|DELETE|UPDATE|INSERT/);
    expect(sql).toContain(
      '"DailyTracking"("professionalId", "clientId", "type", "completedAt")',
    );
    expect(sql).toContain('"client_goals"("professionalId", "updatedAt")');
    expect(sql).toContain('"lab_orders"("professionalId", "issuedAt")');
  });
});

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

describe('Supabase Data API RLS hardening migration', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  it('enumerates every physical application table exactly once for RLS', () => {
    const tables = [
      ...sql.matchAll(
        /ALTER TABLE "public"\."([^"]+)" ENABLE ROW LEVEL SECURITY;/g,
      ),
    ].map((match) => match[1]);

    expect(tables).toEqual(APPLICATION_TABLES);
    expect(tables).not.toContain('_prisma_migrations');
    expect(tables).not.toContain('consultation_notes');
  });

  it('creates one restrictive deny policy for every managed table', () => {
    const policyTables = [
      ...sql.matchAll(
        /CREATE POLICY "deny_data_api_access" ON "public"\."([^"]+)" AS RESTRICTIVE FOR ALL TO PUBLIC USING \(false\) WITH CHECK \(false\);/g,
      ),
    ].map((match) => match[1]);

    expect(policyTables).toEqual(APPLICATION_TABLES);
  });

  it('revokes current and default Data API privileges without auth helpers', () => {
    expect(sql).toContain("ARRAY['anon', 'authenticated', 'service_role']");
    expect(sql).toContain(
      'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public',
    );
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES',
    );
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES',
    );
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM %I',
    );
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC',
    );
    expect(sql).not.toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC',
    );
    expect(sql).not.toMatch(/\bGRANT\b/i);
    expect(sql).not.toMatch(/auth\.(uid|jwt)\s*\(/i);
    expect(sql).not.toMatch(/SECURITY\s+DEFINER/i);
  });
});
