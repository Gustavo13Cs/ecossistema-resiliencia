-- Fisioterapia P2: Exame físico estruturado em physio_assessments e escalas funcionais automáticas (physio_functional_scales).
BEGIN;

CREATE TYPE "PhysioScaleType" AS ENUM ('PSFS', 'OSWESTRY', 'NDI', 'LEFS', 'SPADI', 'TUG');

ALTER TABLE "physio_assessments"
  ADD COLUMN "bodyPainMap" JSONB,
  ADD COLUMN "goniometry" JSONB,
  ADD COLUMN "muscleStrength" JSONB,
  ADD COLUMN "orthopedicTestItems" JSONB;

CREATE TABLE "physio_functional_scales" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "scaleType" "PhysioScaleType" NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "answers" JSONB NOT NULL,
  "rawScore" DOUBLE PRECISION NOT NULL,
  "normalizedScore" DOUBLE PRECISION NOT NULL,
  "scoreUnit" TEXT NOT NULL,
  "classification" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "physio_functional_scales_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "physio_functional_scales_normalized_non_negative" CHECK ("normalizedScore" >= 0)
);

CREATE INDEX "physio_functional_scales_professionalId_clientId_evaluatedAt_idx"
  ON "physio_functional_scales"("professionalId", "clientId", "evaluatedAt" DESC);

CREATE INDEX "physio_functional_scales_clientId_evaluatedAt_idx"
  ON "physio_functional_scales"("clientId", "evaluatedAt" DESC);

ALTER TABLE "physio_functional_scales"
  ADD CONSTRAINT "physio_functional_scales_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "physio_functional_scales"
  ADD CONSTRAINT "physio_functional_scales_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security & Data API Denial on physio_functional_scales
ALTER TABLE public.physio_functional_scales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.physio_functional_scales FROM PUBLIC, safemove_auth, safemove_jobs;
CREATE POLICY deny_data_api_access ON public.physio_functional_scales AS RESTRICTIVE TO safemove_data_api_denied USING (false) WITH CHECK (false);
DO $$ DECLARE data_role text; BEGIN
  FOREACH data_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = data_role) THEN
      EXECUTE format('REVOKE ALL ON public.physio_functional_scales FROM %I', data_role);
    END IF;
  END LOOP;
END $$;

CREATE POLICY clinical_owner ON public.physio_functional_scales TO safemove_clinical
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.physio_functional_scales TO safemove_clinical;

COMMIT;
