ALTER TABLE "User" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_sessions_userId_revokedAt_expiresAt_idx"
    ON "auth_sessions"("userId", "revokedAt", "expiresAt");
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A aplicação acessa estas tabelas somente via Prisma; a Data API não recebe acesso.
-- Inclui as tabelas clínicas adicionadas pela migration anterior, sem reescrever seu histórico.
DO $private_tables$
DECLARE
  table_name text;
  api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['auth_sessions', 'client_goals', 'lab_orders'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY deny_data_api_access ON public.%I AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, api_role);
      END IF;
    END LOOP;
  END LOOP;
END
$private_tables$;
