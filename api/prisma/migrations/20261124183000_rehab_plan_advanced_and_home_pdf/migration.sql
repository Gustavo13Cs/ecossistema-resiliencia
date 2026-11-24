-- Fisioterapia P3: Plano de reabilitação avançado (edição, fases/critérios, eletro/termoterapia, templates) e exercícios domiciliares com biblioteca visual.
BEGIN;

CREATE TYPE "RehabItemCategory" AS ENUM (
  'KINESIOTHERAPY',
  'ELECTROTHERAPY',
  'THERMOTHERAPY',
  'MANUAL_THERAPY',
  'EDUCATION'
);

ALTER TABLE "rehab_plans"
  ADD COLUMN "currentPhaseIndex" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "rehab_plans"
  ADD CONSTRAINT "rehab_plans_current_phase_non_negative" CHECK ("currentPhaseIndex" >= 0);

ALTER TABLE "rehab_plans"
  DROP CONSTRAINT IF EXISTS "rehab_plans_subject_check";

ALTER TABLE "rehab_plans"
  ADD CONSTRAINT "rehab_plans_subject_check"
  CHECK ("clientId" IS NOT NULL OR "userId" IS NOT NULL OR ("isTemplate" = true AND "isActive" = false));

ALTER TABLE "rehab_sessions"
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "progressionCriteria" TEXT,
  ADD COLUMN "estimatedWeeks" INTEGER;

ALTER TABLE "rehab_exercises"
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "category" "RehabItemCategory" NOT NULL DEFAULT 'KINESIOTHERAPY',
  ADD COLUMN "modalityParams" JSONB,
  ADD COLUMN "isHomeExercise" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "homeFrequency" TEXT,
  ADD COLUMN "patientInstructions" TEXT,
  ADD COLUMN "catalogExerciseId" TEXT,
  ADD COLUMN "demonstrationSnapshot" JSONB;

COMMIT;
