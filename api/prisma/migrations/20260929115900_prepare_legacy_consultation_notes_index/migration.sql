-- Antecede a migration histórica sem modificar seu SQL/checksum. Instalações
-- já migradas são no-op; o índice legado válido é preservado sob outro nome.
-- Não remove índices/dados: a migration histórica cria o nome canônico e apenas
-- instalações com o índice prévio mantêm uma cópia equivalente adicional.
DO $prepare_legacy_index$
DECLARE
  notes_table regclass := to_regclass('consultation_notes');
  notes_schema text;
  migration_applied boolean := false;
  existing_index regclass;
BEGIN
  IF to_regclass('"_prisma_migrations"') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (
      SELECT 1 FROM "_prisma_migrations"
      WHERE migration_name = ''20260929120000_add_client_owned_clinical_resources''
        AND finished_at IS NOT NULL AND rolled_back_at IS NULL
    )' INTO migration_applied;
  END IF;
  IF migration_applied OR notes_table IS NULL THEN RETURN; END IF;

  SELECT n.nspname INTO notes_schema
  FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
  WHERE t.oid = notes_table;
  existing_index := to_regclass(format('%I.%I', notes_schema, 'consultation_notes_patientId_createdAt_idx'));
  IF existing_index IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
    JOIN pg_catalog.pg_am am ON am.oid = c.relam
    WHERE i.indexrelid = existing_index AND i.indrelid = notes_table
      AND am.amname = 'btree' AND i.indisvalid AND i.indisready
      AND NOT i.indisunique AND NOT i.indisexclusion
      AND i.indnkeyatts = 2 AND i.indnatts = 2
      AND i.indpred IS NULL AND i.indexprs IS NULL
      AND i.indoption = '0 0'::int2vector
      AND pg_catalog.pg_get_indexdef(i.indexrelid, 1, true) = '"patientId"'
      AND pg_catalog.pg_get_indexdef(i.indexrelid, 2, true) = '"createdAt"'
  ) THEN
    RAISE EXCEPTION 'consultation_notes_patientId_createdAt_idx has incompatible definition; inspect pg_get_indexdef before deployment';
  END IF;

  IF to_regclass(format('%I.%I', notes_schema, 'consultation_notes_patientId_createdAt_idx_legacy')) IS NOT NULL THEN
    RAISE EXCEPTION 'consultation notes legacy index name is already occupied; inspect before deployment';
  END IF;
  EXECUTE format('ALTER INDEX %I.%I RENAME TO %I', notes_schema,
    'consultation_notes_patientId_createdAt_idx', 'consultation_notes_patientId_createdAt_idx_legacy');
END
$prepare_legacy_index$;
