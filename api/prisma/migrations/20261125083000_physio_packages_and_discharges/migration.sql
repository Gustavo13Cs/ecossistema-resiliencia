-- Fisioterapia P4: Pacotes de sessões (physio_session_packages) e Alta fisioterapêutica (physio_discharges).
BEGIN;

CREATE TYPE "PhysioPackageStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PhysioDischargeReason" AS ENUM (
  'GOALS_MET',
  'PARTIAL_IMPROVEMENT',
  'MEDICAL_REFERRAL',
  'TREATMENT_ABANDONMENT',
  'PATIENT_REQUEST'
);

CREATE TABLE "physio_session_packages" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "totalSessions" INTEGER NOT NULL,
  "reassessEverySessions" INTEGER,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "status" "PhysioPackageStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "physio_session_packages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "physio_session_packages_total_sessions_positive" CHECK ("totalSessions" >= 1),
  CONSTRAINT "physio_session_packages_reassess_positive" CHECK ("reassessEverySessions" IS NULL OR "reassessEverySessions" >= 1)
);

CREATE INDEX "physio_session_packages_professionalId_clientId_status_star_idx"
  ON "physio_session_packages"("professionalId", "clientId", "status", "startedAt" DESC);

CREATE INDEX "physio_session_packages_clientId_status_idx"
  ON "physio_session_packages"("clientId", "status");

ALTER TABLE "physio_session_packages"
  ADD CONSTRAINT "physio_session_packages_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "physio_session_packages"
  ADD CONSTRAINT "physio_session_packages_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "physio_session_evolutions"
  ADD COLUMN "packageId" TEXT;

CREATE INDEX "physio_session_evolutions_packageId_idx"
  ON "physio_session_evolutions"("packageId");

ALTER TABLE "physio_session_evolutions"
  ADD CONSTRAINT "physio_session_evolutions_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "physio_session_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "physio_discharges" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "rehabPlanId" TEXT,
  "initialAssessmentId" TEXT,
  "finalAssessmentId" TEXT,
  "dischargedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" "PhysioDischargeReason" NOT NULL,
  "sessionsCompleted" INTEGER NOT NULL DEFAULT 0,
  "initialPainLevel" INTEGER,
  "finalPainLevel" INTEGER,
  "clinicalSummary" TEXT NOT NULL,
  "recommendations" TEXT,
  "comparisonSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "physio_discharges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "physio_discharges_sessions_non_negative" CHECK ("sessionsCompleted" >= 0)
);

CREATE INDEX "physio_discharges_professionalId_dischargedAt_idx"
  ON "physio_discharges"("professionalId", "dischargedAt" DESC);

CREATE INDEX "physio_discharges_clientId_dischargedAt_idx"
  ON "physio_discharges"("clientId", "dischargedAt" DESC);

CREATE INDEX "physio_discharges_rehabPlanId_idx"
  ON "physio_discharges"("rehabPlanId");

CREATE INDEX "physio_discharges_initialAssessmentId_idx"
  ON "physio_discharges"("initialAssessmentId");

CREATE INDEX "physio_discharges_finalAssessmentId_idx"
  ON "physio_discharges"("finalAssessmentId");

ALTER TABLE "physio_discharges"
  ADD CONSTRAINT "physio_discharges_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "physio_discharges"
  ADD CONSTRAINT "physio_discharges_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "physio_discharges"
  ADD CONSTRAINT "physio_discharges_rehabPlanId_fkey"
  FOREIGN KEY ("rehabPlanId") REFERENCES "rehab_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "physio_discharges"
  ADD CONSTRAINT "physio_discharges_initialAssessmentId_fkey"
  FOREIGN KEY ("initialAssessmentId") REFERENCES "physio_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "physio_discharges"
  ADD CONSTRAINT "physio_discharges_finalAssessmentId_fkey"
  FOREIGN KEY ("finalAssessmentId") REFERENCES "physio_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row Level Security & Data API Denial on physio_session_packages
ALTER TABLE public.physio_session_packages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.physio_session_packages FROM PUBLIC, safemove_auth, safemove_jobs;
CREATE POLICY deny_data_api_access ON public.physio_session_packages AS RESTRICTIVE TO safemove_data_api_denied USING (false) WITH CHECK (false);
DO $$ DECLARE data_role text; BEGIN
  FOREACH data_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = data_role) THEN
      EXECUTE format('REVOKE ALL ON public.physio_session_packages FROM %I', data_role);
    END IF;
  END LOOP;
END $$;

CREATE POLICY clinical_owner ON public.physio_session_packages TO safemove_clinical
  USING (
    safemove_private.is_clinical()
    AND current_setting('safemove.role', true) = 'PHYSIO'
    AND "professionalId" = safemove_private.professional_id()
    AND safemove_private.owned_client("clientId")
  )
  WITH CHECK (
    safemove_private.is_clinical()
    AND current_setting('safemove.role', true) = 'PHYSIO'
    AND "professionalId" = safemove_private.professional_id()
    AND safemove_private.owned_client("clientId")
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.physio_session_packages TO safemove_clinical;

-- Row Level Security & Data API Denial on physio_discharges
ALTER TABLE public.physio_discharges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.physio_discharges FROM PUBLIC, safemove_auth, safemove_jobs;
CREATE POLICY deny_data_api_access ON public.physio_discharges AS RESTRICTIVE TO safemove_data_api_denied USING (false) WITH CHECK (false);
DO $$ DECLARE data_role text; BEGIN
  FOREACH data_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = data_role) THEN
      EXECUTE format('REVOKE ALL ON public.physio_discharges FROM %I', data_role);
    END IF;
  END LOOP;
END $$;

CREATE POLICY clinical_owner ON public.physio_discharges TO safemove_clinical
  USING (
    safemove_private.is_clinical()
    AND current_setting('safemove.role', true) = 'PHYSIO'
    AND "professionalId" = safemove_private.professional_id()
    AND safemove_private.owned_client("clientId")
  )
  WITH CHECK (
    safemove_private.is_clinical()
    AND current_setting('safemove.role', true) = 'PHYSIO'
    AND "professionalId" = safemove_private.professional_id()
    AND safemove_private.owned_client("clientId")
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.physio_discharges TO safemove_clinical;

COMMIT;
