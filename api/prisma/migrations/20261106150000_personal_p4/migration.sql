-- Personal P4: Central de Modelos (edição/arquivamento/ambiente) e Anamnese de Treinamento + PAR-Q+ + Equipamentos.
BEGIN;

-- CreateEnum
CREATE TYPE "TrainingEnvironment" AS ENUM ('FULL_GYM', 'CONDO_GYM', 'STUDIO', 'HOME', 'OUTDOOR');

-- AlterTable workout_templates
ALTER TABLE "workout_templates"
  ADD COLUMN "environment" "TrainingEnvironment",
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "workout_templates_professional_id_archivedAt_createdAt_id_idx"
  ON "workout_templates"("professional_id", "archivedAt", "createdAt", "id");

-- Habilita atualização controlada somente em modelos privados do próprio PERSONAL; modelos globais (professional_id IS NULL) permanecem imutáveis e DELETE permanece revogado.
CREATE POLICY template_update ON public.workout_templates FOR UPDATE TO safemove_clinical
  USING (
    safemove_private.is_clinical()
    AND current_setting('safemove.role', true) = 'PERSONAL'
    AND professional_id = safemove_private.professional_id()
  )
  WITH CHECK (
    safemove_private.is_clinical()
    AND current_setting('safemove.role', true) = 'PERSONAL'
    AND professional_id = safemove_private.professional_id()
  );

GRANT UPDATE ON public.workout_templates TO safemove_clinical;

-- CreateTable training_anamneses
CREATE TABLE "training_anamneses" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "parqAnswers" JSONB NOT NULL,
  "hasPositiveParq" BOOLEAN NOT NULL DEFAULT false,
  "medicalClearanceNotes" TEXT,
  "musculoskeletalHistory" TEXT,
  "trainingExperience" TEXT,
  "daysPerWeek" INTEGER,
  "maxSessionMinutes" INTEGER,
  "environment" "TrainingEnvironment" NOT NULL,
  "availableEquipment" "ExerciseEquipment"[] NOT NULL DEFAULT ARRAY[]::"ExerciseEquipment"[],
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "training_anamneses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "training_anamneses_days_per_week_check" CHECK ("daysPerWeek" IS NULL OR "daysPerWeek" BETWEEN 1 AND 7),
  CONSTRAINT "training_anamneses_max_session_minutes_check" CHECK ("maxSessionMinutes" IS NULL OR "maxSessionMinutes" BETWEEN 15 AND 240),
  CONSTRAINT "training_anamneses_experience_check" CHECK ("trainingExperience" IS NULL OR "trainingExperience" IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED'))
);

-- CreateIndex
CREATE INDEX "training_anamneses_professionalId_clientId_createdAt_idx"
  ON "training_anamneses"("professionalId", "clientId", "createdAt" DESC);

CREATE INDEX "training_anamneses_clientId_createdAt_idx"
  ON "training_anamneses"("clientId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "training_anamneses"
  ADD CONSTRAINT "training_anamneses_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "training_anamneses"
  ADD CONSTRAINT "training_anamneses_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security & Data API Denial on training_anamneses
ALTER TABLE public.training_anamneses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_anamneses FROM PUBLIC, safemove_auth, safemove_jobs;
CREATE POLICY deny_data_api_access ON public.training_anamneses AS RESTRICTIVE TO safemove_data_api_denied USING (false) WITH CHECK (false);
DO $$ DECLARE data_role text; BEGIN
  FOREACH data_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = data_role) THEN
      EXECUTE format('REVOKE ALL ON public.training_anamneses FROM %I', data_role);
    END IF;
  END LOOP;
END $$;

CREATE POLICY clinical_owner ON public.training_anamneses TO safemove_clinical
  USING (
    safemove_private.is_clinical()
    AND current_setting('safemove.role', true) = 'PERSONAL'
    AND "professionalId" = safemove_private.professional_id()
    AND safemove_private.owned_client("clientId")
  )
  WITH CHECK (
    safemove_private.is_clinical()
    AND current_setting('safemove.role', true) = 'PERSONAL'
    AND "professionalId" = safemove_private.professional_id()
    AND safemove_private.owned_client("clientId")
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_anamneses TO safemove_clinical;

COMMIT;
