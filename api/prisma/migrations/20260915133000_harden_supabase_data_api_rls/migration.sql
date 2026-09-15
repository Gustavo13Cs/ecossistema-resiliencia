-- Defensive RLS for browser-facing database roles.
-- NestJS/Prisma currently connects as postgres with BYPASSRLS; application-level
-- professional ownership remains mandatory.

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."User";
CREATE POLICY "deny_data_api_access" ON "public"."User" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."DailyTracking" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."DailyTracking";
CREATE POLICY "deny_data_api_access" ON "public"."DailyTracking" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."clients";
CREATE POLICY "deny_data_api_access" ON "public"."clients" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."client_audit_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."client_audit_events";
CREATE POLICY "deny_data_api_access" ON "public"."client_audit_events" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."professional_patient_links" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."professional_patient_links";
CREATE POLICY "deny_data_api_access" ON "public"."professional_patient_links" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."diet_plans" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."diet_plans";
CREATE POLICY "deny_data_api_access" ON "public"."diet_plans" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."meals" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."meals";
CREATE POLICY "deny_data_api_access" ON "public"."meals" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."meal_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."meal_items";
CREATE POLICY "deny_data_api_access" ON "public"."meal_items" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."foods" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."foods";
CREATE POLICY "deny_data_api_access" ON "public"."foods" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."food_preferences" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."food_preferences";
CREATE POLICY "deny_data_api_access" ON "public"."food_preferences" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."meal_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."meal_logs";
CREATE POLICY "deny_data_api_access" ON "public"."meal_logs" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."physical_assessments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."physical_assessments";
CREATE POLICY "deny_data_api_access" ON "public"."physical_assessments" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."physio_assessments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."physio_assessments";
CREATE POLICY "deny_data_api_access" ON "public"."physio_assessments" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."workouts";
CREATE POLICY "deny_data_api_access" ON "public"."workouts" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."workout_splits" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."workout_splits";
CREATE POLICY "deny_data_api_access" ON "public"."workout_splits" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."workout_exercises" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."workout_exercises";
CREATE POLICY "deny_data_api_access" ON "public"."workout_exercises" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."workout_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."workout_logs";
CREATE POLICY "deny_data_api_access" ON "public"."workout_logs" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."workout_log_sets" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."workout_log_sets";
CREATE POLICY "deny_data_api_access" ON "public"."workout_log_sets" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."rehab_plans" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."rehab_plans";
CREATE POLICY "deny_data_api_access" ON "public"."rehab_plans" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."rehab_sessions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."rehab_sessions";
CREATE POLICY "deny_data_api_access" ON "public"."rehab_sessions" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."rehab_exercises" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."rehab_exercises";
CREATE POLICY "deny_data_api_access" ON "public"."rehab_exercises" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."anamneses" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."anamneses";
CREATE POLICY "deny_data_api_access" ON "public"."anamneses" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."supplement_plans" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."supplement_plans";
CREATE POLICY "deny_data_api_access" ON "public"."supplement_plans" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."supplement_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."supplement_items";
CREATE POLICY "deny_data_api_access" ON "public"."supplement_items" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."lab_exams" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."lab_exams";
CREATE POLICY "deny_data_api_access" ON "public"."lab_exams" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."lab_markers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."lab_markers";
CREATE POLICY "deny_data_api_access" ON "public"."lab_markers" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."patient_alerts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."patient_alerts";
CREATE POLICY "deny_data_api_access" ON "public"."patient_alerts" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."patient_consents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."patient_consents";
CREATE POLICY "deny_data_api_access" ON "public"."patient_consents" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."health_check_ins" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."health_check_ins";
CREATE POLICY "deny_data_api_access" ON "public"."health_check_ins" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."agenda_tasks" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."agenda_tasks";
CREATE POLICY "deny_data_api_access" ON "public"."agenda_tasks" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."agenda_task_occurrences" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."agenda_task_occurrences";
CREATE POLICY "deny_data_api_access" ON "public"."agenda_task_occurrences" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."appointments";
CREATE POLICY "deny_data_api_access" ON "public"."appointments" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."appointment_events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_data_api_access" ON "public"."appointment_events";
CREATE POLICY "deny_data_api_access" ON "public"."appointment_events" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

DO $hardening$
DECLARE
  data_api_role text;
BEGIN
  FOREACH data_api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = data_api_role) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
        data_api_role
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',
        data_api_role
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM %I',
        data_api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I',
        data_api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
        data_api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM %I',
        data_api_role
      );
    END IF;
  END LOOP;

  EXECUTE 'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC';
END
$hardening$;
