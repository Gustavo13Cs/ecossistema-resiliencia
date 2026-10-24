BEGIN;
-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "periodization" JSONB,
ADD COLUMN     "weeklyVolumeSnapshot" JSONB;

-- AlterTable
ALTER TABLE "workout_splits" ADD COLUMN     "weeklyFrequency" INTEGER;

-- AlterTable
ALTER TABLE "workout_exercises" ADD COLUMN     "secondaryMuscles" JSONB;

-- CreateTable
CREATE TABLE "workout_templates" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "targetAudience" TEXT,
    "estimatedWeeks" INTEGER NOT NULL DEFAULT 8,
    "schemaVersion" INTEGER NOT NULL DEFAULT 3,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_templates_professional_id_createdAt_id_idx" ON "workout_templates"("professional_id", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE workout_splits ADD CONSTRAINT workout_split_weekly_frequency_check CHECK ("weeklyFrequency" IS NULL OR "weeklyFrequency" BETWEEN 1 AND 7);
ALTER TABLE workout_templates ADD CONSTRAINT workout_template_weeks_check CHECK ("estimatedWeeks" BETWEEN 1 AND 104);
ALTER TABLE workout_templates ADD CONSTRAINT workout_template_goal_check CHECK (goal IN ('MUSCLE_GAIN','STRENGTH','WEIGHT_LOSS','CONDITIONING'));
ALTER TABLE workout_templates ADD CONSTRAINT workout_template_level_check CHECK (level IN ('BEGINNER','INTERMEDIATE','ADVANCED'));
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON workout_templates FROM PUBLIC;
CREATE POLICY deny_data_api_access ON workout_templates AS RESTRICTIVE TO safemove_data_api_denied USING(false) WITH CHECK(false);
DO $$ DECLARE data_role text; BEGIN
  FOREACH data_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT FROM pg_roles WHERE rolname=data_role) THEN
      EXECUTE format('REVOKE ALL ON public.workout_templates FROM %I',data_role);
    END IF;
  END LOOP;
END $$;
CREATE POLICY template_read ON workout_templates FOR SELECT TO safemove_clinical
  USING(safemove_private.is_clinical() AND current_setting('safemove.role',true)='PERSONAL' AND (professional_id IS NULL OR professional_id=safemove_private.professional_id()));
CREATE POLICY template_create ON workout_templates FOR INSERT TO safemove_clinical
  WITH CHECK(safemove_private.is_clinical() AND current_setting('safemove.role',true)='PERSONAL' AND professional_id=safemove_private.professional_id());
GRANT SELECT,INSERT ON workout_templates TO safemove_clinical;
COMMIT;
