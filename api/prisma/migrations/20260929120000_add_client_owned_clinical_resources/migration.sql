-- AddClientOwnedClinicalResources
-- Transitional ownership migration: new writes use Client while legacy subject
-- identifiers remain nullable for historical rows.

CREATE TYPE "ClientGoalCategory" AS ENUM (
  'WEIGHT_LOSS',
  'HYPERTROPHY',
  'RECOMPOSITION',
  'HEALTH_MAINTENANCE',
  'PERFORMANCE'
);

CREATE TYPE "ClientGoalStatus" AS ENUM (
  'ON_TRACK',
  'AT_RISK',
  'ACHIEVED',
  'STAGNANT',
  'PENDING'
);

-- consultation_notes was present in Prisma schema without a versioned migration.
-- Create it for clean installs while preserving deployments where it already exists.
CREATE TABLE IF NOT EXISTS "consultation_notes" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tags" TEXT,
  "nextSteps" TEXT,
  "patientId" TEXT,
  "creatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "consultation_notes_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'consultation_notes_patientId_fkey'
  ) THEN
    ALTER TABLE "consultation_notes"
      ADD CONSTRAINT "consultation_notes_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'consultation_notes_creatorId_fkey'
  ) THEN
    ALTER TABLE "consultation_notes"
      ADD CONSTRAINT "consultation_notes_creatorId_fkey"
      FOREIGN KEY ("creatorId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "workouts"
  ADD COLUMN "clientId" TEXT,
  ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "rehab_plans"
  ADD COLUMN "clientId" TEXT,
  ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "physio_assessments"
  ADD COLUMN "clientId" TEXT,
  ADD COLUMN "creatorId" TEXT,
  ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "anamneses"
  ADD COLUMN "clientId" TEXT,
  ALTER COLUMN "patientId" DROP NOT NULL;

ALTER TABLE "supplement_plans"
  ADD COLUMN "clientId" TEXT,
  ALTER COLUMN "patientId" DROP NOT NULL;

ALTER TABLE "lab_exams"
  ADD COLUMN "clientId" TEXT,
  ALTER COLUMN "patientId" DROP NOT NULL;

ALTER TABLE "consultation_notes"
  ADD COLUMN "clientId" TEXT,
  ALTER COLUMN "patientId" DROP NOT NULL;

ALTER TABLE "DailyTracking"
  ADD COLUMN "clientId" TEXT,
  ADD COLUMN "professionalId" TEXT,
  ALTER COLUMN "patientId" DROP NOT NULL;

ALTER TABLE "patient_alerts"
  ADD COLUMN "clientId" TEXT,
  ALTER COLUMN "patientId" DROP NOT NULL;

-- Resources with an authenticated author can be assigned only when that author
-- owns the exact Client snapshot created from the legacy link.
WITH matches AS (
  SELECT resource.id, min(client.id) AS "clientId"
  FROM "workouts" resource
  JOIN "professional_patient_links" link
    ON link."patientId" = resource."userId"
   AND link."professionalId" = resource."creatorId"
  JOIN "clients" client
    ON client.id = link.id
   AND client."professionalId" = resource."creatorId"
  WHERE resource."clientId" IS NULL
  GROUP BY resource.id
  HAVING count(*) = 1
)
UPDATE "workouts" resource
SET "clientId" = matches."clientId"
FROM matches
WHERE resource.id = matches.id;

WITH matches AS (
  SELECT resource.id, min(client.id) AS "clientId"
  FROM "rehab_plans" resource
  JOIN "professional_patient_links" link
    ON link."patientId" = resource."userId"
   AND link."professionalId" = resource."creatorId"
  JOIN "clients" client
    ON client.id = link.id
   AND client."professionalId" = resource."creatorId"
  WHERE resource."clientId" IS NULL
  GROUP BY resource.id
  HAVING count(*) = 1
)
UPDATE "rehab_plans" resource
SET "clientId" = matches."clientId"
FROM matches
WHERE resource.id = matches.id;

WITH matches AS (
  SELECT resource.id, min(client.id) AS "clientId"
  FROM "anamneses" resource
  JOIN "professional_patient_links" link
    ON link."patientId" = resource."patientId"
   AND link."professionalId" = resource."creatorId"
  JOIN "clients" client
    ON client.id = link.id
   AND client."professionalId" = resource."creatorId"
  WHERE resource."clientId" IS NULL
  GROUP BY resource.id
  HAVING count(*) = 1
)
UPDATE "anamneses" resource
SET "clientId" = matches."clientId"
FROM matches
WHERE resource.id = matches.id;

WITH matches AS (
  SELECT resource.id, min(client.id) AS "clientId"
  FROM "supplement_plans" resource
  JOIN "professional_patient_links" link
    ON link."patientId" = resource."patientId"
   AND link."professionalId" = resource."creatorId"
  JOIN "clients" client
    ON client.id = link.id
   AND client."professionalId" = resource."creatorId"
  WHERE resource."clientId" IS NULL
  GROUP BY resource.id
  HAVING count(*) = 1
)
UPDATE "supplement_plans" resource
SET "clientId" = matches."clientId"
FROM matches
WHERE resource.id = matches.id;

WITH matches AS (
  SELECT resource.id, min(client.id) AS "clientId"
  FROM "lab_exams" resource
  JOIN "professional_patient_links" link
    ON link."patientId" = resource."patientId"
   AND link."professionalId" = resource."creatorId"
  JOIN "clients" client
    ON client.id = link.id
   AND client."professionalId" = resource."creatorId"
  WHERE resource."clientId" IS NULL
  GROUP BY resource.id
  HAVING count(*) = 1
)
UPDATE "lab_exams" resource
SET "clientId" = matches."clientId"
FROM matches
WHERE resource.id = matches.id;

WITH matches AS (
  SELECT resource.id, min(client.id) AS "clientId"
  FROM "consultation_notes" resource
  JOIN "professional_patient_links" link
    ON link."patientId" = resource."patientId"
   AND link."professionalId" = resource."creatorId"
  JOIN "clients" client
    ON client.id = link.id
   AND client."professionalId" = resource."creatorId"
  WHERE resource."clientId" IS NULL
  GROUP BY resource.id
  HAVING count(*) = 1
)
UPDATE "consultation_notes" resource
SET "clientId" = matches."clientId"
FROM matches
WHERE resource.id = matches.id;

WITH matches AS (
  SELECT resource.id, min(client.id) AS "clientId"
  FROM "patient_alerts" resource
  JOIN "professional_patient_links" link
    ON link."patientId" = resource."patientId"
   AND link."professionalId" = resource."professionalId"
  JOIN "clients" client
    ON client.id = link.id
   AND client."professionalId" = resource."professionalId"
  WHERE resource."clientId" IS NULL
  GROUP BY resource.id
  HAVING count(*) = 1
)
UPDATE "patient_alerts" resource
SET "clientId" = matches."clientId"
FROM matches
WHERE resource.id = matches.id;

-- Authorless legacy resources are assigned only when the patient maps to one
-- and only one Client across all professional accounts.
WITH matches AS (
  SELECT
    resource.id,
    min(client.id) AS "clientId",
    min(client."professionalId") AS "professionalId"
  FROM "physio_assessments" resource
  JOIN "professional_patient_links" link
    ON link."patientId" = resource."userId"
  JOIN "clients" client
    ON client.id = link.id
   AND client."professionalId" = link."professionalId"
  WHERE resource."clientId" IS NULL
  GROUP BY resource.id
  HAVING count(*) = 1
)
UPDATE "physio_assessments" resource
SET
  "clientId" = matches."clientId",
  "creatorId" = matches."professionalId"
FROM matches
WHERE resource.id = matches.id;

WITH matches AS (
  SELECT
    resource.id,
    min(client.id) AS "clientId",
    min(client."professionalId") AS "professionalId"
  FROM "DailyTracking" resource
  JOIN "professional_patient_links" link
    ON link."patientId" = resource."patientId"
  JOIN "clients" client
    ON client.id = link.id
   AND client."professionalId" = link."professionalId"
  WHERE resource."clientId" IS NULL
  GROUP BY resource.id
  HAVING count(*) = 1
)
UPDATE "DailyTracking" resource
SET
  "clientId" = matches."clientId",
  "professionalId" = matches."professionalId"
FROM matches
WHERE resource.id = matches.id;

ALTER TABLE "workouts"
  ADD CONSTRAINT "workouts_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "workouts_subject_check"
  CHECK ("clientId" IS NOT NULL OR "userId" IS NOT NULL);

ALTER TABLE "rehab_plans"
  ADD CONSTRAINT "rehab_plans_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "rehab_plans_subject_check"
  CHECK ("clientId" IS NOT NULL OR "userId" IS NOT NULL);

ALTER TABLE "physio_assessments"
  ADD CONSTRAINT "physio_assessments_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "physio_assessments_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "physio_assessments_subject_check"
  CHECK ("clientId" IS NOT NULL OR "userId" IS NOT NULL);

ALTER TABLE "anamneses"
  ADD CONSTRAINT "anamneses_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "anamneses_subject_check"
  CHECK ("clientId" IS NOT NULL OR "patientId" IS NOT NULL);

ALTER TABLE "supplement_plans"
  ADD CONSTRAINT "supplement_plans_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplement_plans_subject_check"
  CHECK ("clientId" IS NOT NULL OR "patientId" IS NOT NULL);

ALTER TABLE "lab_exams"
  ADD CONSTRAINT "lab_exams_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "lab_exams_subject_check"
  CHECK ("clientId" IS NOT NULL OR "patientId" IS NOT NULL);

ALTER TABLE "consultation_notes"
  ADD CONSTRAINT "consultation_notes_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "consultation_notes_subject_check"
  CHECK ("clientId" IS NOT NULL OR "patientId" IS NOT NULL);

ALTER TABLE "DailyTracking"
  ADD CONSTRAINT "DailyTracking_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DailyTracking_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DailyTracking_subject_check"
  CHECK ("clientId" IS NOT NULL OR "patientId" IS NOT NULL);

ALTER TABLE "patient_alerts"
  ADD CONSTRAINT "patient_alerts_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "patient_alerts_subject_check"
  CHECK ("clientId" IS NOT NULL OR "patientId" IS NOT NULL);

CREATE TABLE "client_goals" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "category" "ClientGoalCategory" NOT NULL,
  "status" "ClientGoalStatus" NOT NULL DEFAULT 'PENDING',
  "startDate" TIMESTAMP(3) NOT NULL,
  "targetDate" TIMESTAMP(3) NOT NULL,
  "targetWeightKg" DOUBLE PRECISION,
  "targetBodyFatPercent" DOUBLE PRECISION,
  "targetMuscleMassKg" DOUBLE PRECISION,
  "startWeightKg" DOUBLE PRECISION,
  "startBodyFatPercent" DOUBLE PRECISION,
  "waterTargetMl" INTEGER NOT NULL,
  "sleepTargetHours" DOUBLE PRECISION NOT NULL,
  "mealsAdherencePercent" INTEGER NOT NULL,
  "dailyStepsTarget" INTEGER NOT NULL,
  "habitsNotes" TEXT,
  "clinicalNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_goals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_goals_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "client_goals_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "lab_orders" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "title" TEXT,
  "markers" TEXT[] NOT NULL,
  "clinicalIndication" TEXT,
  "preparationInstructions" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lab_orders_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "lab_orders_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "workouts_creatorId_clientId_isActive_idx"
  ON "workouts"("creatorId", "clientId", "isActive");
CREATE INDEX "rehab_plans_creatorId_clientId_isActive_idx"
  ON "rehab_plans"("creatorId", "clientId", "isActive");
CREATE INDEX "physio_assessments_creatorId_clientId_date_idx"
  ON "physio_assessments"("creatorId", "clientId", "date");
CREATE INDEX "anamneses_creatorId_clientId_createdAt_idx"
  ON "anamneses"("creatorId", "clientId", "createdAt");
CREATE INDEX "supplement_plans_creatorId_clientId_createdAt_idx"
  ON "supplement_plans"("creatorId", "clientId", "createdAt");
CREATE INDEX "lab_exams_creatorId_clientId_date_idx"
  ON "lab_exams"("creatorId", "clientId", "date");
CREATE INDEX "consultation_notes_patientId_createdAt_idx"
  ON "consultation_notes"("patientId", "createdAt");
CREATE INDEX "consultation_notes_creatorId_clientId_createdAt_idx"
  ON "consultation_notes"("creatorId", "clientId", "createdAt");
CREATE INDEX "DailyTracking_clientId_completedAt_idx"
  ON "DailyTracking"("clientId", "completedAt");
CREATE INDEX "DailyTracking_professionalId_completedAt_idx"
  ON "DailyTracking"("professionalId", "completedAt");
CREATE INDEX "patient_alerts_clientId_createdAt_idx"
  ON "patient_alerts"("clientId", "createdAt");
CREATE UNIQUE INDEX "client_goals_clientId_key"
  ON "client_goals"("clientId");
CREATE INDEX "client_goals_professionalId_status_targetDate_idx"
  ON "client_goals"("professionalId", "status", "targetDate");
CREATE INDEX "lab_orders_professionalId_clientId_issuedAt_idx"
  ON "lab_orders"("professionalId", "clientId", "issuedAt");
