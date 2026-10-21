-- Referências lógicas opcionais: preservar fichas legadas sem backfill ou FK.
CREATE TYPE "ExerciseLibrarySource" AS ENUM ('CATALOG', 'CUSTOM');
ALTER TABLE "custom_exercises"
  ADD COLUMN "videoUrl" TEXT,
  ADD COLUMN "mediaVersion" INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT "custom_exercises_mediaVersion_positive" CHECK ("mediaVersion" > 0);
ALTER TABLE "workout_exercises"
  ADD COLUMN "librarySource" "ExerciseLibrarySource",
  ADD COLUMN "libraryExerciseId" TEXT,
  ADD COLUMN "demonstrationSnapshot" JSONB;
