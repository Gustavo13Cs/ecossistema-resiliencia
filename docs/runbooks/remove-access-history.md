# Remoção de Histórico de acessos

Solicitação do mantenedor de 2026-10-08. Preparação local; este documento não confirma publicação ou exclusão em produção.

## Escopo

Retirar /auditoria, navegação/ícone/cache/query, GET /read-audit, gravação HTTP/cron, controller/service/worker, modelos/enums/relações Prisma exclusivos, client_read_audit_events, audit_delivery_states, immutable_audit e safemove_audit_delivery. Preservar autenticação, ClientAccessService, contexto/validação clínica, RLS, catálogo, geração de alertas e históricos de alterações de clientes/agendamentos.

A migration 20261006120000_read_audit_tenant_roles permanece intacta: SHA256 66bbd17d21f8bddb4ad36df13e7e9fe2ac7cd64adb0ece2646cc659116adc407. Ela também implementa isolamento e não deve ser revertida por inteiro. Documentos anteriores são evidência histórica.

## Publicação em duas etapas

1. Publicar interface/API/schema sem nova migration pendente. O Render inicia com prisma migrate deploy usando DIRECT_URL de um checker somente leitura. A primeira versão funciona com as 17 migrations aplicadas e deixa as tabelas antigas sem novas gravações.
2. Confirmar a primeira versão live e os fluxos do mantenedor. Fazer backup novo cifrado com restauração verificada; o backup anterior à auditoria não contém os acessos atuais. Após aprovação para excluir os registros, aplicar externamente a migration 20261008120000_remove_read_access_history pelo owner usando prisma migrate deploy a partir do artefato da segunda etapa. Verificar objetos e 40 tabelas/RLS e só então publicar a segunda etapa; o checker encontrará tudo aplicado.

Nunca colocar owner no serviço HTTP. Não publicar a segunda etapa com migration pendente nem retirar as tabelas enquanto a API antiga grava. Voltar ao código antigo após a segunda etapa exigiria também restaurar objetos/dados de auditoria.

## SQL exato revisado para a segunda etapa

```sql
BEGIN;
DROP TABLE public.audit_delivery_states;
DROP TABLE public.client_read_audit_events;
DROP FUNCTION safemove_private.immutable_audit();
DROP TYPE public."ReadAuditDomain";
DROP TYPE public."ReadAuditAction";
DROP TYPE public."ReadAuditActor";
REVOKE USAGE ON SCHEMA public, safemove_private FROM safemove_audit_delivery;
DROP ROLE safemove_audit_delivery;
COMMIT;
```

A exclusão é irreversível e se limita aos metadados dos acessos. Não usar CASCADE/DROP OWNED. Dependências inesperadas, inclusive em outro database, devem abortar e reverter a transação. DROP ROLE exige CREATEROLE e ADMIN OPTION; o criador do papel recebe ADMIN. Conferir autoridade/dependências sem consultar conteúdo clínico.

## Validação

RED real: falha induzida no histórico impedia cadastro de Client (500); após separação, retorna 201 e persiste o cadastro sem gravar leitura. Regressões preservadas: resposta não autorizada não é liberada e sua mutação é revertida; endpoint removido 404; sessões, dieta Client-first, catálogo, timeout e classificação obrigatória.

Frontend aprovado: 58 arquivos/391 testes, typecheck/lint/build; /auditoria ausente das rotas e da navegação desktop/móvel para três profissões. API aprovada: 47 suítes/485 unitários, 29 suítes/179 E2E reais no PostgreSQL 17, schema validate/generate, lint e build. O aviso TS151002 preexistente do ts-jest não foi silenciado; o build TypeScript passou.

Segunda etapa comprovada localmente em PostgreSQL 17: upgrade 17→18 sob owner NOSUPERUSER/NOBYPASSRLS com CREATEROLE e ADMIN OPTION, ausência das tabelas/enums/função/papel exclusivos, 40 tabelas de domínio com RLS, prontuários e histórico de alterações preservados, leitura isolada por dois profissionais e escrita em conta alheia rejeitada. Um grant inesperado em clients fez DROP ROLE falhar e reverteu integralmente as exclusões. Suite completa após a migration: 30 suítes/181 E2E aprovados; TypeScript explícito e lint aprovados. A checagem que proíbe mistura com o antigo papel foi mantida como defesa caso ele seja recriado; ela não grava acessos.

## Estado operacional

Nenhuma operação de produção foi realizada nesta remoção. Backup atual, dependências reais do cluster e conclusão do rollout continuam pendentes. A recuperação anterior permanece em render-tenant-migration-recovery.md.
