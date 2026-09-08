-- BackfillLegacyClients
-- Copies patient data from the legacy professional_patient_links + User model
-- into the new clients table. Each active link becomes one Client record owned
-- by the corresponding professional.
--
-- Guarantees:
--   • Idempotent: ON CONFLICT DO NOTHING allows safe re-execution
--   • Privacy: password and nutritionistNotes are never copied
--   • Traceability: link.id becomes client.id
--   • Isolation: each professional gets their own snapshot of the patient data

INSERT INTO "clients" (
  "id",
  "professionalId",
  "name",
  "email",
  "phone",
  "birthDate",
  "gender",
  "goal",
  "height",
  "initialWeight",
  "allergies",
  "pathologies",
  "typicalSleep",
  "stressLevel",
  "foodRelationship",
  "psychologyHistory",
  "exerciseType",
  "exerciseFrequency",
  "exerciseDuration",
  "hasPersonal",
  "workActivityLevel",
  "professionalNotes",
  "privacyNotes",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  link."id",
  link."professionalId",
  u."name",
  u."email",
  u."phone",
  u."birthDate",
  u."gender",
  u."goal",
  u."height",
  u."initialWeight",
  u."allergies",
  u."pathologies",
  u."typicalSleep",
  u."stressLevel",
  u."foodRelationship",
  u."psychologyHistory",
  u."exerciseType",
  u."exerciseFrequency",
  u."exerciseDuration",
  u."hasPersonal",
  u."workActivityLevel",
  NULL,   -- professionalNotes: private per-professional, starts empty
  NULL,   -- privacyNotes: private per-professional, starts empty
  CASE WHEN link."isActive" THEN 'ACTIVE'::"ClientStatus"
       ELSE 'ARCHIVED'::"ClientStatus"
  END,
  link."createdAt",
  NOW()
FROM "professional_patient_links" AS link
JOIN "User" AS u ON u."id" = link."patientId"
ON CONFLICT ("id") DO NOTHING;

-- Create audit events for each backfilled client
INSERT INTO "client_audit_events" (
  "id",
  "clientId",
  "professionalId",
  "action",
  "createdAt"
)
SELECT
  link."id",
  link."id",           -- clientId = link.id (same as above)
  link."professionalId",
  'CREATED'::"ClientAuditAction",
  NOW()
FROM "professional_patient_links" AS link
JOIN "User" AS u ON u."id" = link."patientId"
WHERE EXISTS (
  SELECT 1 FROM "clients" c WHERE c."id" = link."id"
)
ON CONFLICT ("id") DO NOTHING;
