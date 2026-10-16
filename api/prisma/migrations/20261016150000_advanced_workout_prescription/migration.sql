-- Prescrição de treino avançada (Personal): ordem persistida, parâmetros avançados
-- por exercício e biblioteca privada de exercícios próprios do profissional.
-- Somente adições; prescrições existentes permanecem válidas e legíveis.
BEGIN;

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'CORE', 'QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'ADDUCTORS', 'CALVES', 'FULL_BODY', 'CARDIO', 'MOBILITY');

-- CreateEnum
CREATE TYPE "EffortType" AS ENUM ('RIR', 'RPE');

-- CreateEnum
CREATE TYPE "TrainingMethod" AS ENUM ('STANDARD', 'DROP_SET', 'REST_PAUSE', 'PYRAMID', 'CLUSTER', 'ISOMETRIC');

-- CreateEnum
CREATE TYPE "ExerciseEquipment" AS ENUM ('BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'SMITH', 'KETTLEBELL', 'BAND', 'BODYWEIGHT', 'OTHER');

-- AlterTable
ALTER TABLE "workout_splits" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "workout_exercises" ADD COLUMN "effortTarget" TEXT,
ADD COLUMN "effortType" "EffortType",
ADD COLUMN "load" TEXT,
ADD COLUMN "method" "TrainingMethod" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "muscleGroup" "MuscleGroup",
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tempo" TEXT;

-- Backfill: as leituras antigas não tinham ORDER BY e devolviam a ordem física
-- (ctid). Preservamos exatamente essa ordem visível, com id como desempate.
UPDATE "workout_splits" AS s SET "position" = r.rn
FROM (
  SELECT id, (ROW_NUMBER() OVER (PARTITION BY "workoutId" ORDER BY ctid, id) - 1)::int AS rn
  FROM "workout_splits"
) AS r
WHERE s.id = r.id;

UPDATE "workout_exercises" AS e SET "position" = r.rn
FROM (
  SELECT id, (ROW_NUMBER() OVER (PARTITION BY "splitId" ORDER BY ctid, id) - 1)::int AS rn
  FROM "workout_exercises"
) AS r
WHERE e.id = r.id;

-- CreateTable
CREATE TABLE "custom_exercises" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "equipment" "ExerciseEquipment",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_exercises_professionalId_muscleGroup_idx" ON "custom_exercises"("professionalId", "muscleGroup");

-- CreateIndex
CREATE UNIQUE INDEX "custom_exercises_professionalId_normalizedName_key" ON "custom_exercises"("professionalId", "normalizedName");

-- AddForeignKey
ALTER TABLE "custom_exercises" ADD CONSTRAINT "custom_exercises_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Isolamento por profissional (mesmo modelo de 20261006120000_read_audit_tenant_roles):
-- RLS ativa, Data API negada e acesso somente do papel clínico ao próprio dono.
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.custom_exercises FROM PUBLIC;
CREATE POLICY deny_data_api_access ON public.custom_exercises AS RESTRICTIVE TO safemove_data_api_denied USING(false) WITH CHECK(false);
DO $$ DECLARE data_role text; BEGIN
  FOREACH data_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT FROM pg_roles WHERE rolname=data_role) THEN
      EXECUTE format('REVOKE ALL ON public.custom_exercises FROM %I',data_role);
    END IF;
  END LOOP;
END $$;
CREATE POLICY clinical_owner ON public.custom_exercises TO safemove_clinical
  USING(safemove_private.is_clinical() AND "professionalId"=safemove_private.professional_id())
  WITH CHECK(safemove_private.is_clinical() AND "professionalId"=safemove_private.professional_id());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.custom_exercises TO safemove_clinical;

COMMIT;
