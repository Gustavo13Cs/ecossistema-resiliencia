BEGIN;

-- O diagnóstico de legado não inclui identificadores clínicos no log.
LOCK TABLE "appointments", "physio_session_evolutions" IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "physio_session_evolutions" e
    JOIN "appointments" a ON a.id = e."appointmentId"
    WHERE a."clientId" <> e."clientId"
  ) THEN
    RAISE EXCEPTION 'Há evoluções e atendimentos com pacientes divergentes. É necessária revisão clínica antes da migração.';
  END IF;
END $$;

CREATE UNIQUE INDEX "appointments_id_clientId_key"
  ON "appointments" ("id", "clientId");

CREATE UNIQUE INDEX "physio_session_evolutions_appointmentId_clientId_key"
  ON "physio_session_evolutions" ("appointmentId", "clientId");

-- A validação inclui o histórico. Uma divergência interrompe a migration
-- inteira para revisão clínica, sem escolher automaticamente um paciente.
ALTER TABLE "physio_session_evolutions"
  DROP CONSTRAINT "physio_session_evolutions_appointmentId_fkey",
  ADD CONSTRAINT "physio_evolution_appointment_patient_fkey"
    FOREIGN KEY ("appointmentId", "clientId")
    REFERENCES "appointments" ("id", "clientId")
    ON UPDATE RESTRICT ON DELETE SET NULL ("appointmentId");

COMMIT;
