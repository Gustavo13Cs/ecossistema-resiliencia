# Remoção de Histórico de acessos

Solicitação do mantenedor de 2026-10-08. Primeira etapa publicada e armazenamento exclusivo removido em produção após autorização e backup restaurado. Segunda etapa aguarda CI e publicação final.

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

A exclusão é irreversível e se limita aos metadados dos acessos. Não usar CASCADE/DROP OWNED. A migration usa BEGIN explícito: erro aborta a transação sem commit, mas o driver não executa ROLLBACK automaticamente. Ao falhar, encerrar a operação e executar ROLLBACK na mesma conexão ou fechá-la antes de recuperar/repetir; não continuar comandos numa transação abortada. Dependências inesperadas, inclusive em outro database, devem abortar e reverter a transação. DROP ROLE exige CREATEROLE e ADMIN OPTION; o criador do papel recebe ADMIN. Conferir autoridade/dependências sem consultar conteúdo clínico.

## Validação

RED real: falha induzida no histórico impedia cadastro de Client (500); após separação, retorna 201 e persiste o cadastro sem gravar leitura. Regressões preservadas: resposta não autorizada não é liberada e sua mutação é revertida; endpoint removido 404; sessões, dieta Client-first, catálogo, timeout e classificação obrigatória.

Frontend aprovado: 58 arquivos/391 testes, typecheck/lint/build; /auditoria ausente das rotas e da navegação desktop/móvel para três profissões. API aprovada: 47 suítes/485 unitários, 29 suítes/179 E2E reais no PostgreSQL 17, schema validate/generate, lint e build. O aviso TS151002 preexistente do ts-jest não foi silenciado; o build TypeScript passou.

Segunda etapa comprovada localmente em PostgreSQL 17: upgrade 17→18 sob owner NOSUPERUSER/NOBYPASSRLS com CREATEROLE e ADMIN OPTION, ausência das tabelas/enums/função/papel exclusivos, 40 tabelas de domínio com RLS, prontuários e histórico de alterações preservados, leitura isolada por dois profissionais e escrita em conta alheia rejeitada. Um grant inesperado em clients fez DROP ROLE falhar e reverteu integralmente as exclusões. Suite completa após a migration: 30 suítes/181 E2E aprovados; TypeScript explícito e lint aprovados. A checagem que proíbe mistura com o antigo papel foi mantida como defesa caso ele seja recriado; ela não grava acessos.

## Estado operacional

Autorização explícita do mantenedor: publicar os PRs #25/#26 e excluir registros antigos após backup com restauração verificada. A recuperação anterior permanece em render-tenant-migration-recovery.md.

- [#25 — remoção da funcionalidade](https://github.com/Gustavo13Cs/ecossistema-resiliencia/pull/25) integrado em e1b13ddd02e56401eba4fe8d148c0943d3fd2d8e. Render dep-db3tm7gjo6nc73bfuang live em2026-10-08 18:05:56UTC; deployment de produção Vercel dpl_ACHBmfL6RbuVF7oVZEZPD6hcCW1u READY. Probes /read-audit404 e /clients401 sem sessão.
- Backup novo dos schemas public+safemove_private em snapshot REPEATABLE READ exportado:43 tabelas,42 de aplicação com RLS,21 acessos e21 estados de entrega. Dump custom PG17 cifrado em fluxo AES-256-GCM; chave protegida Windows DPAPI CurrentUser e pasta com ACL exclusiva da conta local. Nenhum dump plaintext em disco.
- Restauração verificada em2026-10-08 18:16:20UTC num container PostgreSQL17 sem rede/portas, com data em tmpfs. Autenticação GCM, pg_restore em transação, todas as contagens e inventário de owners/RLS/colunas/policies/enums/funções iguais ao snapshot; chave lida do arquivo DPAPI. Container removido após a prova. Stubs NOLOGIN locais serviram apenas para recriar owners/ACLs; atributos LOGIN/segredos dos papéis não integram esse backup.
- Arquivos preservados fora do Git em C:/Users/MICRO/AppData/Local/Temp/safemove-history-removal-20261008-Tbrsa2: public-private-before-history-removal.dump.aesgcm, backup-key.dpapi, backup-manifest.json e production-removal-proof.json. Conservar o conjunto; descriptografia depende da mesma conta Windows. Backup escopado à aplicação, sem auth/storage ou credenciais globais do Supabase.
- Cifra:235498 bytes; SHA256 fbcecd3b6fb8c76e7088cbf04a9985e69e9a93f302740e2fb09c9d1e5add0f4e. Não publicar o dump/chave nem colocar o owner no serviço.
- Preflight real:17 migrations concluídas/zero falhas; owner CREATEROLE e ADMIN OPTION; seis dependências esperadas da role exclusiva, todas no database atual. Migration18 aplicada com prisma migrate deploy externo, TLS/CA pública e sslaccept=strict. Bytes LF iguais ao artefato Git/Linux, SHA256 a3ead2773928767f7e7baa034e5d2051f6ad61e8b17b2e9d48255e7698134a8b.
- Pós-exclusão:18 migrations concluídas/zero falhas; checksum17 original intacto; tabelas/enums/função/role exclusivos ausentes;41 tabelas totais,40 de domínio com owners/colunas/policies/RLS idênticos. Contagens de registros de todas as tabelas preservadas iguais imediatamente antes/depois da migration, incluindo prontuários e históricos de alterações.
- [#26 — armazenamento](https://github.com/Gustavo13Cs/ecossistema-resiliencia/pull/26) rebaseado sobre main, mantendo blobs SQL/teste revisados; aguarda CI e publicação. O checker somente leitura deve encontrar18 migrations aplicadas. Verificar a versão final live e endpoints após o merge.
