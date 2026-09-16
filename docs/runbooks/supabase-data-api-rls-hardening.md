# Runbook: Supabase Data API e RLS defensivo

## Escopo

Este procedimento protege o projeto `zmjcxysenzrqycktckip` contra acesso direto
pela Data API. Ele não substitui o ownership por `professionalId` na API NestJS.
As 33 tabelas enumeradas pela migration são tabelas de aplicação;
`consultation_notes` e `_prisma_migrations` permanecem fora desse conjunto. Não
corrigir esse drift nesta fase.

## Preflight obrigatório

1. Confirmar branch e worktree limpo com `git status --short --branch`.
2. Confirmar que o projeto remoto é `zmjcxysenzrqycktckip`.
3. Executar `npx.cmd prisma migrate status` em `api` sem imprimir variáveis.
4. Confirmar que a conexão resolve para `postgres` com `BYPASSRLS`.
5. Inventariar, sem exigir que o estado anterior já esteja endurecido, os
   privilégios efetivos atuais de `anon`, `authenticated` e `service_role` sobre
   tabelas, sequences e functions públicas, além de `PUBLIC EXECUTE` sobre
   functions existentes. Registrar somente contagens por tipo e role. Grants
   encontrados compõem o baseline que a migration deve remover; projeto, roles,
   schema ou categorias de objeto inesperados interrompem o deploy.
6. Inventariar, também sem exigir zero antes da migration, as default ACLs do
   `postgres` para tabelas, sequences e functions das três roles e a default ACL
   global de `PUBLIC EXECUTE` para functions. Registrar as contagens anteriores;
   o alvo zero é obrigatório na verificação pós-deploy.
7. Rodar o gate local completo antes de qualquer escrita remota.

## Implantação

1. Obter confirmação humana final para produção.
2. Em `api`, executar `npx.cmd prisma migrate deploy` usando as variáveis já
   configuradas no ambiente seguro.
3. No Dashboard Supabase, abrir **Integrations > Data API > Settings** e desligar
   **Enable Data API**.
4. Não alterar Auth, Storage, pooling ou connection strings.

## Verificação

1. Confirmar nove migrations aplicadas em `_prisma_migrations`.
2. Consultar `pg_class` e confirmar RLS nas 33 tabelas de aplicação enumeradas
   pela migration, sem incluir `consultation_notes` ou `_prisma_migrations`.
3. Consultar `pg_policies` e confirmar 33 policies
   `deny_data_api_access`, todas `RESTRICTIVE`, `ALL`, `PUBLIC`, `false`.
4. Confirmar zero privilégios efetivos atuais das três roles da Data API sobre
   tabelas, sequences e functions públicas, e zero `PUBLIC EXECUTE` sobre
   functions existentes.
5. Confirmar as default ACLs para tabelas, sequences e functions das três roles
   e a default ACL global que revoga `PUBLIC EXECUTE` para futuras functions.
6. Usar o E2E isolado `api/test/database-security.e2e-spec.ts` como prova de
   objetos futuros: depois da migration, ele cria tabela, sequence e functions e
   confirma que não recebem privilégios das três roles nem execução pública pela
   `PUBLIC` global. Em produção, não criar DDL temporário somente para esse teste;
   confirmar as default ACLs no catálogo e vincular o resultado ao gate E2E local.
7. Confirmar que REST e GraphQL não atendem consultas com chave publicável.
8. Validar sessão, clientes, agenda, dietas e avaliações pela API NestJS.
9. Rodar o Supabase Security Advisor e registrar somente nomes e contagens.

## Falha

- Interromper a implantação no primeiro gate inconsistente.
- Nunca conceder privilégios amplos para recuperar funcionamento.
- A Data API só pode ser reativada se uma dependência legítima for descoberta,
  após nova aprovação humana explícita e registro do caso de uso.
- Nunca restaurar automaticamente grants públicos; toda reversão exige migration
  forward-only revisada.
- Migration aplicada não é editada nem removida; correções usam nova migration.
- Se a API NestJS falhar, comparar o papel efetivo do banco com o preflight e
  criar uma correção forward-only antes de retomar.

## Evidência permitida

Registrar somente commit, migration, número de tabelas, número de policies,
resultado dos testes e advisors. Nunca registrar dados clínicos, chaves ou URLs
com credenciais.
