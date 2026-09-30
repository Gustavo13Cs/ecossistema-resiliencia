# Codex Agent — Status

> Este arquivo é atualizado pelo agente OpenAI Codex para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- **Tarefa**: Remediação ponta a ponta dos 15 achados de segurança e qualidade
- **Status**: Execução nativa retomada em 2026-09-30; Plano A Tasks 1-2 validadas; próxima etapa: Task 3, treinos atômicos por Client
- **Branch**: `agent/codex/security-remediation`
- **Início**: 2026-09-29
- **Arquivos protegidos autorizados**: `api/prisma/schema.prisma` e migrations versionadas necessárias à remediação
- **Worktree**: `.worktrees/security/security-remediation`
- **Plano atual**: `docs/superpowers/plans/2026-09-29-security-remediation-a-ownership-schema.md`
- **Próximo gate**: testes RED de ownership, DTOs e transação de treinos; migração das telas para Client
- **Coordenação**: o status do Antigravity ainda cita uma tarefa iniciada em 2026-09-22, mas não há branch/worktree detectável para ela; confirmar antes de alterar auth, package files ou `.gitignore` fora deste worktree

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-09-03 | Dashboard profissional com dados reais, terminologia por profissão e filtro de arquivados | `codex/safemove-professional-frontend-phase-1` |
| 2026-09-04 | Diretório responsivo e cadastro de prontuário orientado por profissão | `codex/safemove-professional-frontend-phase-1` |
| 2026-09-04 | Prontuário modular por profissão e remoção segura de rascunhos clínicos locais | `codex/safemove-professional-frontend-phase-1` |
| 2026-09-08 | E2E real, isolamento profissional, headers de segurança e acabamento visual final | `codex/safemove-professional-frontend-phase-1` |
| 2026-09-08 | Diagnóstico P2021: aplicou migration `add_client_foundation` no Supabase, criou teste e2e do backfill | `codex/fix-production-client-data` |
| 2026-09-10 | Produção professional-first corrigida: dados e dietas migrados para Client, sessão same-origin segura e E2E real aprovado | `codex/fix-production-professional-data` |
| 2026-09-14 | Avaliações migradas para prontuários Client e integradas em `main` | `codex/fix-assessments-client-flow` |
| 2026-09-14 | Agenda profissional vinculada a Client: calendário dia/semana/mês, lifecycle auditável, conflitos, ownership e E2E real | `agent/codex/professional-agenda-phase-1` |
| 2026-09-16 | Endurecimento da Data API, grants e RLS defensivo verificado em produção | `agent/codex/supabase-rls-hardening` |
| 2026-09-28 | Banco privado de receitas versionadas, macros por porção, restrições, prescrição com snapshot, modelos e impressão/lista de compras | `codex/BancodeReceitas` |

---

## Blocked

- Gates globais do frontend têm pendências preexistentes fora do Banco de Receitas: ESLint em `useClientGoals.ts` (`react-hooks/preserve-manual-memoization`) e Cypress de `professional-agenda.cy.ts` (botão de fechamento recortado pelo overflow). Não foram adicionadas supressões nem alterados esses fluxos nesta entrega.

---

## Notes

### Remediação — retomada em 2026-09-30

- Task 1 preservada no commit `8f2c26b`; nenhuma migration aplicada em produção.
- Task 2: overview por Client, perfil próprio e remoção das rotas legadas de pacientes; 26 suítes/292 unitários API, 11 suítes/33 E2E API, 40 arquivos/276 testes web, typecheck web e builds API/web aprovados. Lint focal API/web sem erros ou warnings.
- Corrigido teardown do E2E da aplicação: `app.close()` encerra conexões/jobs, sem `forceExit`. A repetição completa encerrou com exit 0.
- Banco temporário recriado pelo Docker: 11 migrations reaplicadas somente em `localhost:5434/ecossistema_resiliencia_test`.
- Execução dos planos A-D ainda em andamento; nenhum push ou deploy realizado.

### Banco de Receitas — evidência local de 2026-09-28

- Implementado: criação, edição versionada, categorias, busca, arquivamento/restauração e filtros manuais sem glúten, sem lactose e vegano. Fotos fora do escopo aprovado.
- Nutrientes calculados no backend a partir de alimentos persistidos. Prescrições e modelos mantêm a versão selecionada até atualização explícita e salvamento pelo nutricionista; impressão e compras preservam esse conteúdo.
- API: 24 suítes/279 unitários e 10 suítes/28 E2E aprovados; build aprovado. Prisma validate/generate e deploy/status das 10 migrations aprovados somente no banco isolado de teste da porta 5434.
- Frontend: suíte completa com 39 arquivos/273 testes aprovada em execução isolada; regressão adicional do seletor assíncrono aprovada em 7/7 casos focais. Typecheck e build aprovados. A primeira execução concorrente teve timeouts; a mesma suíte passou sem alterar limites ou configuração.
- Cypress da funcionalidade: 1/1 aprovado na execução final (1m26s), em desktop 1280px e mobile 390px, com criação/refetch, erro 503/retry, receitas e alimentos, liberação de pointer/scroll e payload XOR. Sincronização por respostas específicas e pós-condições reais, sem force-click, aumento de timeout, screenshots ou vídeo.
- Revisões independentes aprovaram a integração, a preservação dos snapshots e o delta dos testes. Validação visual final aprovada, sem overflow, com seletor acessível e alvos de toque de ao menos 44px.
- Limites: nenhum push, deploy ou acesso ao banco de produção nesta conclusão. A migration `20260921193053_add_versioned_recipe_bank` ainda precisa de aplicação controlada em produção antes da publicação da API. As pendências globais antigas estão listadas em Blocked.

### Hardening anterior — evidência de 2026-09-16

- Produção: migration `20260915133000_harden_supabase_data_api_rls` aplicada uma vez; 33 tabelas de aplicação com RLS, 33 policies restritivas e zero privilégios atuais ou default ACLs nas superfícies verificadas.
- Gate local: Prisma validate/deploy/status/generate, build NestJS, 218/218 casos unitários em 21/21 suites e 8 suites E2E concluídos sem falhas.
- Data API: desativação confirmada visualmente; probes REST (`401`) e GraphQL (`503`) negaram consultas sem retornar dados.
- Smokes: sessão, clientes, agenda, dietas, alimentos e avaliações carregaram; uma escrita autorizada salvou os mesmos valores, sem criar, excluir ou alterar conteúdo clínico.
- Advisors: Security Advisor com 0 lints; o único aviso agregado `rls_disabled` é `_prisma_migrations`, esperado e fora das 33 tabelas de aplicação.
- Limites: o RLS protege a Data API, não isola tenants nas consultas Prisma feitas como `postgres` com `BYPASSRLS`; ownership por `professionalId`, guards e testes negativos permanecem obrigatórios. `consultation_notes` e `_prisma_migrations` seguem fora das 33 tabelas.
- Limite histórico: o preflight anterior ao deploy não inventariou sequences, functions, `PUBLIC EXECUTE` nem default ACLs e esse estado não pode ser reconstruído; o runbook foi corrigido e o pós-deploy confirmou zero em toda a superfície atual e futura verificada.
