BEGIN;

-- Segunda etapa: aplicar somente depois da API sem gravação de acessos estar live.
-- Remove apenas metadados de Histórico de acessos. Não apaga prontuários.
-- Sem CASCADE: dependências inesperadas interrompem e revertem a transação.
DROP TABLE public.audit_delivery_states;
DROP TABLE public.client_read_audit_events;
DROP FUNCTION safemove_private.immutable_audit();
DROP TYPE public."ReadAuditDomain";
DROP TYPE public."ReadAuditAction";
DROP TYPE public."ReadAuditActor";

-- Papel exclusivo de entrega; papéis clínico/auth/jobs/catalog continuam intactos.
-- Dependências em outro database do cluster também impedem DROP ROLE.
REVOKE USAGE ON SCHEMA public, safemove_private FROM safemove_audit_delivery;
DROP ROLE safemove_audit_delivery;

COMMIT;
