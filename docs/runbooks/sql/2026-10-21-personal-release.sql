-- Reviewed release migration artifact; execution status is recorded in the release runbook.
-- Target tool: apply_migration(project_id='zmjcxysenzrqycktckip',
--   name='personal_workout_drafts_demonstrations_prisma_sync', query=THIS_FILE).
-- One DO statement supplies atomicity independent of an API transaction wrapper.
-- The first source file's sole standalone BEGIN/COMMIT envelope is removed;
-- every DDL body remains identical. Original file SHA-256 values are recorded.
-- The 19 earlier checksums pin observed production history, including historical
-- line endings and the documented completed tenant-migration checksum; no repair.
-- Fail closed on retries: inspect committed state after ANY tool timeout/error.
DO $personal_release$
DECLARE
  migration_started_at timestamptz;
BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Unexpected migration actor/database';
  END IF;
  PERFORM pg_catalog.set_config('search_path', 'public', true);
  PERFORM pg_catalog.set_config('lock_timeout', '5s', true);
  IF NOT pg_catalog.pg_try_advisory_xact_lock(72707369::bigint) THEN
    RAISE EXCEPTION 'Prisma migration advisory lock is held; do not race deployment';
  END IF;
  LOCK TABLE public."_prisma_migrations" IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public."_prisma_migrations"
             WHERE finished_at IS NULL AND rolled_back_at IS NULL) THEN
    RAISE EXCEPTION 'Unresolved Prisma migration exists; stop and investigate';
  END IF;
  IF EXISTS (SELECT 1 FROM public."_prisma_migrations"
             WHERE migration_name IN ('20261017120000_workout_drafts', '20261017123000_workout_draft_client_index', '20261017130000_exercise_demonstrations')) THEN
    RAISE EXCEPTION 'Target migration history already exists; inspect instead of retrying';
  END IF;
  IF (SELECT count(*) FROM public."_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) <> 19
     OR EXISTS (
    WITH expected(migration_name, checksum) AS (VALUES
      ('20260813000000_baseline', '6ce679695eddaae42098b497adece191f48aa3f14071f3552f85e7e83b72fc06'),
      ('20260813120000_add_agenda_core', '418751d33c9681e6057c8ccefb8441bdc3d032000f15e42bea5b9682722c57b8'),
      ('20260821190000_add_client_foundation', '0f9f18da007f18395ba8d0e2e93d505d5c1ad8f99a991b9f7cd49796c6ec470f'),
      ('20260908194000_backfill_legacy_clients', 'cb4771a2cb2af33cccad5c9070c8b157d0795bb900b500dcb4148060d8b0ddc8'),
      ('20260909130000_attach_diet_plans_to_clients', '4ed2250c38ae16e385a3858725064b7943795d8f3c73e60395b1dc550f71efa1'),
      ('20260909165000_index_client_foreign_keys', '8962674a2f36025e82100a3692ce9daf7ee5ebfa3fcd16825225925c4c822dac'),
      ('20260911113000_attach_physical_assessments_to_clients', '5198fdad7ef7a4135ab15697bc44ea3e0a062620b39af4a7926de6063863fbf2'),
      ('20260914133000_add_professional_appointments', 'd7b75b940d1c0350cc1058ae8548955b4aab9fd0fc92eb9de34167ae12fabe3e'),
      ('20260915133000_harden_supabase_data_api_rls', '7d87e9a28b6baca25e80e094afefc44fb10e12c3628f9e44f8ef844a9213c923'),
      ('20260921193053_add_versioned_recipe_bank', '2e1c6949926609c6428d3c7bbec894b5b3b1d98730e2abcc7d8d05c13b1fe4a7'),
      ('20260929115900_prepare_legacy_consultation_notes_index', 'b37c06896fb902e4caef76a6d804b593edeb333a7855d3dd4281a0c7b3e00be1'),
      ('20260929120000_add_client_owned_clinical_resources', 'f5ffbd83141d190fb995d8b13e1498002048c14d5f593bc52e64090303357630'),
      ('20260929123000_add_revocable_auth_sessions', '875ebb013d75f05062c26148851038fda88f5652dcd746d56e9ed1f7dc89c72c'),
      ('20260929130000_harden_recipe_function_search_paths', '428a99cf17330feba1dc050af9f4961c624a28ebd0f723292812cb83c3ddbcef'),
      ('20260929133000_index_client_owned_foreign_keys', '40a3e6748e1e0670208317a80aad0e69496cdaf2afe8a8e8232a1bcf6a08cd6f'),
      ('20261001130000_harden_consultation_notes_data_api', 'd341ff0639b848d6dfe11a5317a632467ec5d945128adeaf007a5917038c5ac1'),
      ('20261006120000_read_audit_tenant_roles', '66bbd17d21f8bddb4ad36df13e7e9fe2ac7cd64adb0ece2646cc659116adc407'),
      ('20261008120000_remove_read_access_history', 'a3ead2773928767f7e7baa034e5d2051f6ad61e8b17b2e9d48255e7698134a8b'),
      ('20261016150000_advanced_workout_prescription', '9c1e41a87c1a832d8e8c774422d8bc76a7bb75a976cc213b1af467d74eb32a8a')
    ), completed AS (
      SELECT migration_name, checksum FROM public."_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    )
    SELECT 1 FROM expected e FULL JOIN completed c USING (migration_name)
    WHERE e.migration_name IS NULL OR c.migration_name IS NULL
       OR e.checksum <> c.checksum
  ) THEN
    RAISE EXCEPTION 'Prisma baseline differs from the reviewed 19 production history tuples';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES ('safemove_clinical'), ('safemove_auth'),
                         ('safemove_jobs'), ('safemove_data_api_denied')) r(role_name)
    WHERE pg_catalog.to_regrole(r.role_name) IS NULL
  ) OR pg_catalog.to_regprocedure('safemove_private.is_clinical()') IS NULL
    OR pg_catalog.to_regprocedure('safemove_private.professional_id()') IS NULL
    OR pg_catalog.to_regprocedure('safemove_private.owned_client(text)') IS NULL THEN
    RAISE EXCEPTION 'Required existing tenant roles/functions are missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES ('public.workouts'), ('public.clients'), ('public."User"'),
                         ('public.custom_exercises'), ('public.workout_exercises')) t(name)
    WHERE pg_catalog.to_regclass(t.name) IS NULL
  ) THEN
    RAISE EXCEPTION 'Required existing tables are missing';
  END IF;
  IF pg_catalog.to_regclass('public.workout_drafts') IS NOT NULL
    OR pg_catalog.to_regtype('public."WorkoutDraftStatus"') IS NOT NULL
    OR pg_catalog.to_regtype('public."ExerciseLibrarySource"') IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM (VALUES
        ('workouts', 'finalizedAt'), ('workouts', 'revisionOfId'),
        ('custom_exercises', 'videoUrl'), ('custom_exercises', 'mediaVersion'),
        ('workout_exercises', 'librarySource'), ('workout_exercises', 'libraryExerciseId'),
        ('workout_exercises', 'demonstrationSnapshot')
      ) wanted(table_name, column_name)
      JOIN information_schema.columns c ON c.table_schema='public'
       AND c.table_name=wanted.table_name AND c.column_name=wanted.column_name
    ) THEN
    RAISE EXCEPTION 'Target schema is partially/already present; inspect before proceeding';
  END IF;

  migration_started_at := pg_catalog.clock_timestamp();
  -- Original file: 20261017120000_workout_drafts; SHA256 8ed10193a00878c58abc8e54cefd343a4a458534de66e3c7f05fe571f7a8f802
  EXECUTE $source_migration_1$-- Elaboração separada da prescrição; nenhuma alteração/backfill de fichas existentes.
CREATE TYPE "WorkoutDraftStatus" AS ENUM ('OPEN', 'FINALIZED', 'DISCARDED');
ALTER TABLE "workouts" ADD COLUMN "finalizedAt" TIMESTAMP(3), ADD COLUMN "revisionOfId" TEXT;
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_revisionOfId_fkey" FOREIGN KEY ("revisionOfId") REFERENCES "workouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "workout_drafts" (
  "id" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "status" "WorkoutDraftStatus" NOT NULL DEFAULT 'OPEN',
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "content" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sourceWorkoutId" TEXT,
  "baseActiveWorkoutId" TEXT,
  "finalizedWorkoutId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "workout_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workout_drafts_positive_versions" CHECK ("version" > 0 AND "schemaVersion" > 0),
  CONSTRAINT "workout_drafts_state_shape" CHECK (
    ("status" = 'OPEN' AND "content" IS NOT NULL AND "content" <> 'null'::jsonb AND "closedAt" IS NULL AND "finalizedWorkoutId" IS NULL)
    OR ("status" = 'FINALIZED' AND "content" IS NULL AND "closedAt" IS NOT NULL AND "finalizedWorkoutId" IS NOT NULL)
    OR ("status" = 'DISCARDED' AND "content" IS NULL AND "closedAt" IS NOT NULL AND "finalizedWorkoutId" IS NULL)
  )
);
CREATE UNIQUE INDEX "workout_drafts_one_open_per_owner_client" ON "workout_drafts"("professionalId","clientId") WHERE "status" = 'OPEN';
CREATE UNIQUE INDEX "workout_drafts_finalizedWorkoutId_key" ON "workout_drafts"("finalizedWorkoutId");
CREATE INDEX "workout_drafts_professionalId_status_updatedAt_id_idx" ON "workout_drafts"("professionalId","status","updatedAt" DESC,"id");
ALTER TABLE "workout_drafts" ADD CONSTRAINT "workout_drafts_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workout_drafts" ADD CONSTRAINT "workout_drafts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workout_drafts" ADD CONSTRAINT "workout_drafts_sourceWorkoutId_fkey" FOREIGN KEY ("sourceWorkoutId") REFERENCES "workouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workout_drafts" ADD CONSTRAINT "workout_drafts_baseActiveWorkoutId_fkey" FOREIGN KEY ("baseActiveWorkoutId") REFERENCES "workouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workout_drafts" ADD CONSTRAINT "workout_drafts_finalizedWorkoutId_fkey" FOREIGN KEY ("finalizedWorkoutId") REFERENCES "workouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.workout_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workout_drafts FROM PUBLIC, safemove_auth, safemove_jobs;
CREATE POLICY deny_data_api_access ON public.workout_drafts AS RESTRICTIVE TO safemove_data_api_denied USING(false) WITH CHECK(false);
DO $$ DECLARE data_role text; BEGIN
  FOREACH data_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT FROM pg_roles WHERE rolname=data_role) THEN
      EXECUTE format('REVOKE ALL ON public.workout_drafts FROM %I',data_role);
    END IF;
  END LOOP;
END $$;
CREATE POLICY clinical_owner ON public.workout_drafts TO safemove_clinical
  USING(safemove_private.is_clinical() AND current_setting('safemove.role',true)='PERSONAL' AND "professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))
  WITH CHECK(safemove_private.is_clinical() AND current_setting('safemove.role',true)='PERSONAL' AND "professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.workout_drafts TO safemove_clinical;
$source_migration_1$;
  -- Original file: 20261017123000_workout_draft_client_index; SHA256 da03840afc89c7929d06add63e67e9fa9341bc8e218fdb5ae38909d08b5800d4
  EXECUTE $source_migration_2$-- Cobre a FK Client também fora da consulta por profissional/status.
CREATE INDEX "workout_drafts_clientId_idx" ON "workout_drafts"("clientId");
$source_migration_2$;
  -- Original file: 20261017130000_exercise_demonstrations; SHA256 08fceddf1b20acc7cfdcca7cae95664f31231d5c37975c3a40410ba90ad832d9
  EXECUTE $source_migration_3$-- Referências lógicas opcionais: preservar fichas legadas sem backfill ou FK.
CREATE TYPE "ExerciseLibrarySource" AS ENUM ('CATALOG', 'CUSTOM');
ALTER TABLE "custom_exercises"
  ADD COLUMN "videoUrl" TEXT,
  ADD COLUMN "mediaVersion" INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT "custom_exercises_mediaVersion_positive" CHECK ("mediaVersion" > 0);
ALTER TABLE "workout_exercises"
  ADD COLUMN "librarySource" "ExerciseLibrarySource",
  ADD COLUMN "libraryExerciseId" TEXT,
  ADD COLUMN "demonstrationSnapshot" JSONB;
$source_migration_3$;

  -- All three DDL bodies have now succeeded; record their original checksums.
  INSERT INTO public."_prisma_migrations"
    (id, checksum, finished_at, migration_name, logs, rolled_back_at,
     started_at, applied_steps_count)
  VALUES
    (pg_catalog.gen_random_uuid()::text, '8ed10193a00878c58abc8e54cefd343a4a458534de66e3c7f05fe571f7a8f802',
     pg_catalog.clock_timestamp(), '20261017120000_workout_drafts', NULL, NULL,
     migration_started_at, 1);

  INSERT INTO public."_prisma_migrations"
    (id, checksum, finished_at, migration_name, logs, rolled_back_at,
     started_at, applied_steps_count)
  VALUES
    (pg_catalog.gen_random_uuid()::text, 'da03840afc89c7929d06add63e67e9fa9341bc8e218fdb5ae38909d08b5800d4',
     pg_catalog.clock_timestamp(), '20261017123000_workout_draft_client_index', NULL, NULL,
     migration_started_at, 1);

  INSERT INTO public."_prisma_migrations"
    (id, checksum, finished_at, migration_name, logs, rolled_back_at,
     started_at, applied_steps_count)
  VALUES
    (pg_catalog.gen_random_uuid()::text, '08fceddf1b20acc7cfdcca7cae95664f31231d5c37975c3a40410ba90ad832d9',
     pg_catalog.clock_timestamp(), '20261017130000_exercise_demonstrations', NULL, NULL,
     migration_started_at, 1);

  -- Every target history row is inserted only after all real DDL succeeds.
  -- No exception is caught, no COMMIT occurs inside this single statement.
END
$personal_release$;
