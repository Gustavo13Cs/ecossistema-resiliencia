-- Fecha a exceção histórica de RLS das notas clínicas sem alterar dados ou grants da aplicação.
ALTER TABLE public.consultation_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_data_api_access ON public.consultation_notes
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
REVOKE ALL ON TABLE public.consultation_notes FROM PUBLIC;

DO $private_notes$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.consultation_notes FROM %I', api_role);
    END IF;
  END LOOP;
END
$private_notes$;
