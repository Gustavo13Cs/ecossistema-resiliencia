-- Requer aprovacao operacional; owner de migration, nunca credencial de runtime.
-- PostgreSQL 16+. Preserva o arquivo e o checksum da migration publicada.
DO $$
DECLARE lookup_oid oid;
BEGIN
  IF current_user <> session_user OR NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolcreaterole
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='clients'
      AND c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)
  ) THEN
    RAISE EXCEPTION 'Use the approved migration owner directly';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='safemove_private' AND p.proname='food_in_use'
  ) THEN
    RAISE EXCEPTION 'Tenant migration is already installed';
  END IF;
  SELECT oid INTO lookup_oid FROM pg_roles WHERE rolname='safemove_catalog_lookup';
  IF lookup_oid IS NULL THEN
    CREATE ROLE safemove_catalog_lookup NOLOGIN NOSUPERUSER NOBYPASSRLS
      NOCREATEROLE NOCREATEDB NOREPLICATION;
  ELSIF EXISTS (
    SELECT 1 FROM pg_roles WHERE oid=lookup_oid
      AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)
  ) OR EXISTS (
    SELECT 1 FROM pg_auth_members WHERE member=lookup_oid
  ) OR EXISTS (
    SELECT 1 FROM pg_class WHERE relowner=lookup_oid AND relkind IN ('r','p','f')
  ) THEN
    RAISE EXCEPTION 'Unsafe catalog lookup group';
  END IF;
  -- SET permite ALTER OWNER; INHERIT permite ajustar ACLs depois da transferencia.
  -- Ambos sao temporarios e devem ser retirados pelo script de limpeza.
  EXECUTE format(
    'GRANT safemove_catalog_lookup TO %I WITH INHERIT TRUE, SET TRUE', current_user
  );
END $$;
