# Codex Agent — Status

> Este arquivo é atualizado pelo agente OpenAI Codex para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- **Tarefa**: Remediação ponta a ponta dos 15 achados de segurança e qualidade
- **Status**: Execução nativa concluída em 2026-10-02; Planos A-D implementados e verificados (API 470 unitários/102 E2E; web 368 testes; Cypress 31/31)
- **Branch**: `agent/codex/security-remediation`
- **Início**: 2026-09-29
- **Arquivos protegidos autorizados**: `api/prisma/schema.prisma` e migrations versionadas necessárias à remediação
- **Worktree**: `.worktrees/security/security-remediation`
- **Plano atual**: `docs/superpowers/plans/2026-09-29-security-remediation-d-operations-quality.md`
- **Próximo gate**: decisão do mantenedor sobre integração/publicação. Branch/worktree preservados; nenhuma publicação, merge ou migration em produção executada.
- **Coordenação**: o status do Antigravity ainda cita uma tarefa iniciada em 2026-09-22, mas não há branch/worktree detectável para ela; confirmar antes de alterar auth, package files ou `.gitignore` fora deste worktree

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-10-02 | Remediação dos 15 achados: Client ownership, persistência, XSS/CSP, sessões, runtime, operação e qualidade; verificação completa local | `agent/codex/security-remediation` |
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

- Nenhum gate local bloqueado na conclusão de 2026-10-02. As pendências antigas de lint em `useClientGoals.ts` e fechamento da agenda foram resolvidas; suites completas aprovadas sem adicionar supressões, force-click ou aumento de timeouts.

---

## Notes

### Remediação — conclusão local em 2026-10-02

- 45 suítes/470 unitários e 20 suítes/102 E2E API; 57 arquivos/368 testes web; Cypress configurado 17/17 e real 14/14. Typecheck estrito, lint, builds, schema/migrations e audits runtime aprovados.
- Revisão independente da branch e ajustes finais sem Critical/Important/Minor pendentes. Concorrência de planos provada em PostgreSQL e recuperação entre abas coberta por duas instâncias independentes do API client.
- 40 tabelas com RLS, 40 policies restritivas, zero grants atuais/default nas superfícies verificadas. 20 índices justificados; 17 FKs históricas residuais documentadas.
- Imagens API/web como UID 1000, sem dev packages/arquivos de ambiente; job de migration separado, assets/proxy/CSP/cookies verificados contra o banco sintético. Evidência reproduzível no [runbook](../runbooks/security-remediation-verification.md).
- Sem push, merge, deploy ou acesso ao banco de produção. Arquivos protegidos fora do schema/migrations autorizados permanecem intactos.

### Remediação — retomada em 2026-10-01

- Plano B Task 7: jornada real create/update/reload/delete de metas e create/reload/delete de exames/pedidos, erros 500 e payload malicioso inerte na impressão; Cypress 2/2 + hidratação 1/1. Chaves clínicas legadas descartadas sem leitura; 54 testes focais + 4 auth, matriz HTTP 15/15, builds API/web, typecheck e lint aprovados. Controllers novos retornam no-store para limitar cache a memória.
- Plano B Task 6: CSP com nonce de 128 bits por requisição, scripts sem unsafe-inline/eval em produção; 47/47 testes focais, typecheck/lint e build aprovados. Gate pós-build adaptado à renderização dinâmica, contrato exato e nonces validados nas 28 páginas reais.
- Plano B Task 5: builders compartilhados com escaping de títulos/texto/valores, impressão sem scripts inline e único writer revisado. 28/28 testes de impressão, typecheck e lint focal aprovados.
- Plano B Task 4: central sem storage, seeds, valores clínicos fictícios ou upload PDF simulado; listagem agregada e mutações server-only isoladas por sessão. Falhas mantêm dados/formulários; exportação somente de pedidos salvos. 18/18 testes, typecheck e lint focal aprovados.
- Plano B Task 3: metas sem storage, seed ou adesão simulada; operações assíncronas preservam cache/formulário em erro. Medidas ausentes não geram progresso/platô inventado. 12/12 testes web, typecheck e lint focal aprovados.
- Plano B Task 2: pedidos persistidos e exames agregados/listagem/exclusão por Client/autor; 39/39 testes focais e 12/12 HTTP PostgreSQL aprovados, build API e lint focal aprovados.
- Plano B Task 1: API de metas persistidas por Client/autor, hábitos aninhados e DTOs limitados; 27/27 testes, build API e lint focal aprovados.
- Task 9: matriz HTTP PostgreSQL 10/10, testes web 25/25 e Cypress 7/7 aprovados; build de produção e lint focal aprovados. Conectados modal fisioterapêutico e overview já migrado ao prontuário. Plano A concluído; B-D em andamento.
- Task 8: superfície legada retirada; 14 testes unitários focais e 15 E2E de runtime/domínios/agenda profissional aprovados; build API, typecheck web e lint aprovados.
- Task 7: suplementos/exames por Client, DTOs aninhados e hooks isolados por sessão/cliente; 34 testes API e 7 web, typecheck web e lint focal aprovados.
- Task 6: anamneses/notas por Client e autor; fallback da anamnese removido; 31 testes API e 2 web, typecheck web e lint focal aprovados.
- Task 5: PhysioAssessment corrigido, acesso por Client e autor; 24 testes API e 2 web aprovados, typecheck web e lint focal API/web aprovados.
- Task 4: reabilitação por Client com criação transacional; 26 testes API, 2 PostgreSQL de rollback e 6 web aprovados; build API, typecheck e lint API/web aprovados.
- Task 3: treinos vinculados a Client, escrita transacional e rotas legadas removidas; API 318 unitários/35 E2E, web 279 testes, typecheck, builds e lint focal aprovados.
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
