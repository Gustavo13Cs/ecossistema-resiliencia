-- Executar como o mesmo owner, somente depois do commit bem-sucedido.
-- Retira SET/INHERIT; preserva o ADMIN da criacao do grupo para manutencao futura.
DO $$
BEGIN
  IF current_user <> session_user OR NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='clients'
      AND c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)
  ) THEN
    RAISE EXCEPTION 'Use the approved migration owner directly';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='safemove_private' AND p.proname='food_in_use'
      AND p.proowner=(SELECT oid FROM pg_roles WHERE rolname='safemove_catalog_lookup')
  ) THEN
    RAISE EXCEPTION 'Tenant migration must commit before cleanup';
  END IF;
  REVOKE CREATE ON SCHEMA safemove_private FROM safemove_catalog_lookup;
  EXECUTE format(
    'GRANT safemove_catalog_lookup TO %I WITH INHERIT FALSE, SET FALSE', current_user
  );
  IF pg_has_role(current_user,'safemove_catalog_lookup','SET')
    OR pg_has_role(current_user,'safemove_catalog_lookup','USAGE') THEN
    RAISE EXCEPTION 'Catalog authority remains through another membership';
  END IF;
END $$;
