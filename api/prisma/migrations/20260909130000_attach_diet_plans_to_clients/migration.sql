-- AttachDietPlansToClients
-- Keeps the legacy User relation temporarily while making Client the
-- professional-owned aggregate used by new prescriptions.

ALTER TABLE "diet_plans" ADD COLUMN "clientId" TEXT;
ALTER TABLE "diet_plans" ALTER COLUMN "userId" DROP NOT NULL;

UPDATE "diet_plans" AS diet
SET "clientId" = link."id"
FROM "professional_patient_links" AS link
WHERE link."professionalId" = diet."creatorId"
  AND link."patientId" = diet."userId"
  AND diet."clientId" IS NULL;

ALTER TABLE "diet_plans"
  ADD CONSTRAINT "diet_plans_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "diet_plans_creatorId_clientId_isActive_idx"
  ON "diet_plans"("creatorId", "clientId", "isActive");

-- Authentication is case-insensitive in the application. Normalize existing
-- records after the pre-deploy collision check and enforce the same invariant
-- for direct database writes.
UPDATE "User"
SET "email" = lower(btrim("email"))
WHERE "email" <> lower(btrim("email"));

UPDATE "clients"
SET "email" = lower(btrim("email"))
WHERE "email" IS NOT NULL
  AND "email" <> lower(btrim("email"));

CREATE UNIQUE INDEX "User_email_normalized_key"
  ON "User" (lower(btrim("email")));
