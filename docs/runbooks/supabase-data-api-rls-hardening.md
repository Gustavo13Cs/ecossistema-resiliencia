# Runbook: Supabase Data API e RLS defensivo

## Escopo

Este procedimento protege o projeto `zmjcxysenzrqycktckip` contra acesso direto
pela Data API. Ele não substitui o ownership por `professionalId` na API NestJS.

## Preflight obrigatório

1. Confirmar branch e worktree limpo com `git status --short --branch`.
2. Confirmar que o projeto remoto é `zmjcxysenzrqycktckip`.
3. Executar `npx.cmd prisma migrate status` em `api` sem imprimir variáveis.
4. Confirmar que a conexão resolve para `postgres` com `BYPASSRLS`.
5. Confirmar zero privilégios efetivos para `anon`, `authenticated` e
   `service_role` sobre tabelas públicas.
6. Rodar o gate local completo antes de qualquer escrita remota.

## Implantação

1. Obter confirmação humana final para produção.
2. Em `api`, executar `npx.cmd prisma migrate deploy` usando as variáveis já
   configuradas no ambiente seguro.
3. No Dashboard Supabase, abrir **Integrations > Data API > Settings** e desligar
   **Enable Data API**.
4. Não alterar Auth, Storage, pooling ou connection strings.

## Verificação

1. Confirmar nove migrations aplicadas em `_prisma_migrations`.
2. Consultar `pg_class` e confirmar RLS nas 33 tabelas enumeradas pela migration.
3. Consultar `pg_policies` e confirmar 33 policies
   `deny_data_api_access`, todas `RESTRICTIVE`, `ALL`, `PUBLIC`, `false`.
4. Confirmar zero tabelas alcançáveis pelas três roles da Data API.
5. Confirmar que REST e GraphQL não atendem consultas com chave publicável.
6. Validar sessão, clientes, agenda, dietas e avaliações pela API NestJS.
7. Rodar o Supabase Security Advisor e registrar somente nomes e contagens.

## Falha

- Interromper a implantação no primeiro gate inconsistente.
- Nunca conceder privilégios amplos para recuperar funcionamento.
- A Data API pode ser reativada se uma dependência legítima for descoberta.
- Migration aplicada não é editada nem removida; correções usam nova migration.
- Se a API NestJS falhar, comparar o papel efetivo do banco com o preflight e
  criar uma correção forward-only antes de retomar.

## Evidência permitida

Registrar somente commit, migration, número de tabelas, número de policies,
resultado dos testes e advisors. Nunca registrar dados clínicos, chaves ou URLs
com credenciais.
