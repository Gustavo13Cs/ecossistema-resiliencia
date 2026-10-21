-- Elaboração separada da prescrição; nenhuma alteração/backfill de fichas existentes.
BEGIN;
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
COMMIT;
