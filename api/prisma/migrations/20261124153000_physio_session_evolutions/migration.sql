-- Fisioterapia P1: Registro de evolução por sessão vinculado opcionalmente ao agendamento e protocolo ativo.
BEGIN;

CREATE TABLE "physio_session_evolutions" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "rehabPlanId" TEXT,
  "sessionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "painBefore" INTEGER,
  "painAfter" INTEGER,
  "proceduresApplied" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "patientResponse" TEXT NOT NULL,
  "nextSteps" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "physio_session_evolutions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "physio_session_evolutions_pain_before_check" CHECK ("painBefore" IS NULL OR "painBefore" BETWEEN 0 AND 10),
  CONSTRAINT "physio_session_evolutions_pain_after_check" CHECK ("painAfter" IS NULL OR "painAfter" BETWEEN 0 AND 10)
);

CREATE UNIQUE INDEX "physio_session_evolutions_appointmentId_key"
  ON "physio_session_evolutions"("appointmentId");

CREATE INDEX "physio_session_evolutions_professionalId_clientId_sessionDate_idx"
  ON "physio_session_evolutions"("professionalId", "clientId", "sessionDate" DESC);

CREATE INDEX "physio_session_evolutions_clientId_sessionDate_idx"
  ON "physio_session_evolutions"("clientId", "sessionDate" DESC);

CREATE INDEX "physio_session_evolutions_rehabPlanId_idx"
  ON "physio_session_evolutions"("rehabPlanId");

ALTER TABLE "physio_session_evolutions"
  ADD CONSTRAINT "physio_session_evolutions_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "physio_session_evolutions"
  ADD CONSTRAINT "physio_session_evolutions_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "physio_session_evolutions"
  ADD CONSTRAINT "physio_session_evolutions_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "physio_session_evolutions"
  ADD CONSTRAINT "physio_session_evolutions_rehabPlanId_fkey"
  FOREIGN KEY ("rehabPlanId") REFERENCES "rehab_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row Level Security & Data API Denial on physio_session_evolutions
ALTER TABLE public.physio_session_evolutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.physio_session_evolutions FROM PUBLIC, safemove_auth, safemove_jobs;
CREATE POLICY deny_data_api_access ON public.physio_session_evolutions AS RESTRICTIVE TO safemove_data_api_denied USING (false) WITH CHECK (false);
DO $$ DECLARE data_role text; BEGIN
  FOREACH data_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = data_role) THEN
      EXECUTE format('REVOKE ALL ON public.physio_session_evolutions FROM %I', data_role);
    END IF;
  END LOOP;
END $$;

CREATE POLICY clinical_owner ON public.physio_session_evolutions TO safemove_clinical
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.physio_session_evolutions TO safemove_clinical;

COMMIT;
