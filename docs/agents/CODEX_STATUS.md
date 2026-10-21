# Codex Agent — Status

> Este arquivo é atualizado pelo agente OpenAI Codex para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- **2026-10-21 — Publicação do Personal concluída (Codex)**: [PR #30](https://github.com/Gustavo13Cs/ecossistema-resiliencia/pull/30) integrado na main `0d81b14`; CI quatro jobs aprovado e revisão independente sem achados. Três migrations aplicadas uma vez antes do merge, readback de 22 migrations/schema/RLS/ACL aprovado e Security Advisor sem lints. Vercel READY e Render live no mesmo SHA; startup sem migrations pendentes, health 200/pong, biblioteca e rascunhos 401 sem sessão. Nenhum conteúdo clínico usado no smoke. Registro final documental na branch da entrega; aplicação publicada preservada, branch/worktree mantidas. [Runbook e evidências](../runbooks/personal-release-2026-10-21.md). Sem pendência do escopo desta publicação; entradas abaixo preservam a cronologia.

- **2026-10-21 — Publicação do Personal autorizada e em andamento (Codex)**: mantenedor solicitou push da branch, PR e integração/publicação em main. Main `677eb3d` incorporada no merge `25fdf65`; web666/87, tipos/lint/builds e navegador real32/32 aprovados, API sem alterações na integração. Payload das três migrations preparado com baseline de produção preservado e rollback/replay/Prisma verificados localmente. Conexões de runtime restritas mantidas. Revisão do artefato de release, push/PR/checks, migração owner e confirmação Vercel/Render são os próximos passos. [Runbook](../runbooks/personal-release-2026-10-21.md).

- **2026-10-21 — Integração local da publicação em andamento (Codex)**: merge ordinário de `origin/main`/`677eb3d` sobre a entrega concluída em `66ff87b`; cronologias e correções do PR #29 preservadas. Verificação web completa e seis specs reais com rebuild ainda em execução; backend e arquivos protegidos sem alterações nesta integração. Nenhuma ação remota por este agente.

- **2026-10-21 — Rascunhos e biblioteca visual do Personal concluídos localmente (Codex)**: dois planos aprovados executados e revisados. Biblioteca com 148 exercícios, dos quais 20 têm 21 ilustrações licenciadas; cadastro manual com link próprio opcional, snapshots históricos e página exclusiva PERSONAL. A revisão ampla encontrou apenas F-1 (foco em busca pendente), corrigido em `2d8d803`; rerevisão Spec PASS/Quality APPROVED sem achados. Gates finais: web 657/86 arquivos, 22 focados, tipos/lint/builds novos, visual real 4/4 e bundle com 84 chunks. API 737/58 suítes, PostgreSQL 243/37, 21 probes e 28 regressões reais retidos por fontes não afetadas. O lote histórico 31/32 permanece falho e documentado. Desktop/mobile, impressão real, teclado e isolamento conferidos. Nove decisões de rascunho e cinco visuais preservadas nos runbooks; relatórios/evidências arquivados em `.superpowers/artifacts/personal-exercise-media/implementation-evidence/`. Sem pendências do escopo aprovado; branch/worktree mantidas, sem push, merge, deploy ou produção.

- **2026-10-21 — Biblioteca visual Task6 concluída/revisada; revisão ampla iniciada (Codex)**: commit `abfeaa7`, SpecPASS/QualityAPPROVED, sem achados. API737/58 suítes, PostgreSQL243/37, web655/86 arquivos, tipos/lint/builds e21 probes oficiais aprovados. Evidência real final:28/28 regressões mais4/4 visuais; lote integrado anterior31/32 permanece falho no relatório. Impressão real com detalhe aberto, foco, CSP/referrer, histórico/CAS/contaB e capturas1440×900/390×844 conferidos. Cinco decisões registradas, nove critérios de aceite mapeados. Revisão ampla do delta visual é o gate restante; branch/worktree preservadas, sem produção, push ou deploy.

- **2026-10-21 — Biblioteca visual Task6 retomada (Codex)**: tarefas1–5 e rascunhos preservados em `a08ce6f`. Subagente retoma a mesma verificação integrada, sem reiniciar a implementação. API737/58 suítes, PostgreSQL243/37 e21 probes oficiais aprovados; correção real de foco com14 testes focados e suíte web655/86 arquivos, tipos/lint aprovados. O lote real recompilou API/Next/pós-build e confirmou retorno de foco por mouse/teclado; encontrou bloqueio de interação ao adicionar o segundo exercício, ainda em diagnóstico. Não há aceite integral do navegador/print/capturas nem revisão ampla final. PostgreSQL sintético local restabelecido com22 migrations; sem produção, push ou deploy.

- **2026-10-20 — Biblioteca visual Task5 concluída/revisada; Task6 iniciada (Codex)**: página/detalhe/mídia/CSP em `54a3337`, ajuste de overlay de impressão em `ba39ea0`; rerevisão PASS/APPROVED sem achados. Web75 focados/tipos/lint/manifesto e igualdade pública aprovados; fix37 focados/tipos/lint. Ficha usa apresentação histórica, revogação com diálogo aberto remove mídia; créditos, links seguros, foco e header no-referrer conforme decisão registrada. PostgreSQL sintético restabelecido com22 migrations após reinício. Task6 verifica fluxos reais, mediafixture licenciada, builds/suítes/bundle/header/print e desktop/celular. Sem produção, push ou deploy.

- **2026-10-19 — Biblioteca visual Task4 concluída/revisada; Task5 iniciada (Codex)**: integração em `cdddb89`, correção da corrida seleção/criação em `3e581b2`; achado importante ADDRESSED e rerevisão PASS/APPROVED sem novos achados. Web118 focados/API8 antes do fix; fix com RED controlado→seletor7/7 e regressões39/39, tipos/lint aprovados. Referências explícitas, snapshot fora do payload, owner/cache/aborto e baseline preservados; código aditivo de conflito registrado no runbook. Task5 cria página/detalhe/renderizador e CSP, antes do aceite real final. Sem produção, push ou deploy.

- **2026-10-19 — Biblioteca visual Task3 concluída/revisada; Task4 iniciada (Codex)**: referências e snapshots autorizados, rascunhoV2/legado, histórico sem mídia e projeção de revogação em `2c38e4d`; revisão PASS/APPROVED sem achados. Evidência117 unitários/33PG e, após correção pontual da cópia,11/11PG/tipos/lint. Limite64KiB permanece no rascunho; criação direta legada preservada, decisão no runbook. Task4 integra referências explícitas, payload sem snapshot e cache por conta/equipamento no editor. Sem produção, push ou deploy.

- **2026-10-19 — Biblioteca visual Task2 concluída/revisada; Task3 iniciada (Codex)**: detalhe/filtro e links privados com normalização estrita e CAS em `e34e8b7`; schema/migration aditivos aplicados somente ao PostgreSQL sintético (22 migrations). API719/57, PostgreSQL232/36, tipos/lint aprovados; revisão PASS/APPROVED sem achados. Drift anterior de nome de FK Recipe comprovado por comparação de base e preservado. Task3 integra resolução de snapshots no servidor e rascunhoV2, mantendo legado e histórico autorizado. Sem produção, push ou deploy.

- **2026-10-19 — Biblioteca visual Task1 concluída/revisada; Task2 iniciada (Codex)**: catálogo preserva148 IDs; manifesto com20 exercícios/21 ilustrações de cinco grupos, autoria/licença individual e histórico/revogação explícita em `91a1006`. API681/56 suítes,21 testes focais, check e21 probes oficiais, tipos/lint/build aprovados; revisão PASS/APPROVED sem achados. Task2 adiciona detalhe privado, filtro por equipamento e links YouTube/Vimeo próprios com versão concorrente. Sem produção, push ou deploy.

- **2026-10-19 — Rascunhos concluídos; biblioteca visual iniciada (Codex)**: revisão ampla identificou dois achados de acesso/recuperação, corrigidos em `f052883` e aprovados na única rerevisão scoped (PASS/APPROVED, zero novos achados). Negação do ativo permanece bloqueada até nova sessão; Entrar novamente encerra a sessão real e limpa o cache. Correção: 97/97 testes focados, tipos/lint aprovados; browser com duas recuperações reais e baseline repetido 5/5. Não houve rodada integral9/9 posterior à correção; o resultado9/9 anterior e os gates API660/PG227/web601 permanecem discriminados no runbook. Nove decisões preservadas em `docs/runbooks/personal-workout-drafts-decisions.md`; evidências locais arquivadas em `.superpowers/artifacts/personal-workout-drafts/implementation-evidence/`. Inicia Task1 da biblioteca: manifesto, licença por arquivo e validação das 20 ilustrações aprovadas. Branch/worktree preservadas, sem produção, push ou deploy.

- **2026-10-18 — Rascunhos Task 7 concluída/revisada; revisão ampla em andamento (Codex)**: commit `b720523`, revisão específica PASS/APPROVED sem achados. API660/54 suítes, PostgreSQL227/35 suítes, web601/79 arquivos, tipos/lint e builds reais aprovados; novo Cypress9/9 e Personal P1 focado1/1 resolvem os casos do lote26/28, que permanece discriminado. Corrigidos índice ClientId, corrida ao finalizar/descartar, cache da ficha anterior e retorno de foco. Navegação SPA/confirmador nativo e troca de sessão validados no Chrome; BFCache não exercido, Windows somente seleção por helper. Inspeções desktop1440×900/mobile390×844 conferidas. Biblioteca visual licenciada segue após a revisão ampla.

- **2026-10-18 — Rascunhos Task 6 concluída/revisada; Task 7 inicia verificação real (Codex)**: integração em `fcef2b3`, correção de falha transitória em `6c72c0e`; 109 testes focados da integração e 72 da correção, tipos/lint aprovados, revisão PASS/APPROVED sem novos achados. Formulário preserva texto/baseline/guard em 503/rede; negação/404/mismatch/terminal removem a sessão. Navegadores sem Navigation API usam documento completo e beforeunload, com recarga adicional; prova real, teclado/mobile, builds e gates amplos seguem na Task 7. Sem produção, push ou deploy.

- **2026-10-18 — Retomada preservada; editor aprovado; integração de rotas iniciada (Codex)**: HEAD `41aaed0`; etapas 1–4 e implementação da Task 5 preservadas após reinício do ambiente. Os dois achados originais foram resolvidos em `1430797`; regressão de consulta deduplicada corrigida com 2 casos RED e 30 testes focados GREEN, tipos/lint aprovados. Revisão específica PASS/APPROVED sem novos achados; Task 5 concluída, Task 6 inicia a integração de rotas/listagem/histórico e proteção de saída, Task 7 fará jornada real e fechamento. PostgreSQL sintético da porta 5434 restabelecido com 20 migrations; sem produção. Escolha anterior do usuário por 20 ilustrações licenciadas permanece aprovada.

- **2026-10-17 — Editor de rascunhos implementado; revisão independente em andamento (Codex)**: `ea0d0ea`, 29 testes focados e 545 totais web, tipos/lint focado aprovados. Contratos de primeiro save, create→finalize e rebase fresco conferidos; integração de rotas e confirmação de saída por menu/histórico pendentes nas tarefas 6/7. Usuário aprovou usar as 20 ilustrações licenciadas na biblioteca visual após ver exemplos; especificação atualizada. Fonte candidata Workout Guide/Everkinetic, CC BY-SA4 por arquivo; implementação e revisão do manifesto ainda pendentes.

- **2026-10-17 — Rascunhos Task 4 concluída/revisada; Task 5 em andamento (Codex)**: sete endpoints autenticados e classificados, com 52 testes focais e 19 HTTP/domínio aprovados, tipos/lint e revisão independente PASS/APPROVED sem achados em `0053f78`. Subagente dedicado ao editor, salvamento manual e conflitos; integração de rotas e jornada real seguem pendentes. Execução na worktree `personal-workout-implementation`; sem produção, push ou deploy.

- **2026-10-17 — Rascunhos Task 3 concluída/revisada**: ciclo de vida, version/base, rebase, idempotência e finalização atômica em `6c09b1e`. 9 unitários, 29 PostgreSQL focais e 6 regressões de fixtures, tipos/lint aprovados; revisão independente PASS/APPROVED sem achados. Retomada após interrupção por limite de uso; tarefas 1/2 preservadas. Próxima: endpoints autenticados (Task 4). Acesso wger autorizado, mas política do ambiente ainda exige inclusão do domínio pelo painel. Sem produção, push ou deploy.

- **2026-10-17 — Rascunhos Task 2 concluída (Codex)**: criação direta e por rascunho compartilham escrita transacional, data do servidor e lock do Client; origem da revisão restrita ao aluno/conta. DELETE de ficha vinculada retorna 409, incluindo legado/modelo vinculado; leituras incluem metadados sem backfill. RED/GREEN: 39 unitários focais e 13 regressões PostgreSQL, tipos/lint aprovados. Papel clínico real comprova rollback de filhos e da operação externa; sem produção, push ou deploy.

- **2026-10-17 — Rascunhos Task 1**: conteúdo V1/DTO, schema/migration e delegate clínico concluídos. RED confirmado; API 52 suítes/641 testes, PostgreSQL 6/6, tipos/lint e Prisma validate/generate/deploy aprovados somente no banco sintético local. Legado comparado antes/depois, sem backfill; sem produção, push ou deploy.

- **2026-10-17 — Execução autorizada com subagentes por tarefa**: planos aprovados pelo usuário ao escolher execução por subagentes. Worktree `.worktrees/personal-workout-implementation`, branch `agent/codex/personal-workout-implementation`, base `07b611c`. Preparação da base com Prisma gerado, PostgreSQL 16 sintético na porta 5434 e testes de referência. Cada tarefa terá implementador e revisão independentes; sem produção, push ou deploy. Ledgers locais por plano em `.superpowers/sdd/`.

- **2026-10-17 — Especificações aprovadas e planos escritos**: usuário confirmou “revisei , ta aprovada” para rascunhos/revisões e biblioteca visual. Planos em `docs/superpowers/plans/2026-10-17-personal-rascunhos-revisoes.md` (7 tarefas) e `2026-10-17-personal-biblioteca-visual.md` (6 tarefas), autorrevisados contra as especificações. Aguardam revisão dos planos e escolha de execução; recomendação de execução direta com revisão independente final. A aprovação das especificações inclui o desenho proposto de schema/migrations para desenvolvimento; não representa aplicação em produção. Somente documentação nesta etapa; testes de produto não executados.

- **2026-10-17 — Proposta do Personal aprovada**: usuário aprovou a direção com biblioteca visual e cadastro manual. Especificações em `docs/superpowers/specs/2026-10-17-personal-rascunhos-revisoes-design.md` e `docs/superpowers/specs/2026-10-17-personal-biblioteca-visual-design.md`, autorrevisadas e depois aprovadas pelo usuário. Branch `agent/codex/personal-workout-design`. Somente documentação; sem schema, migration, runtime ou produção alterados. Testes de produto não executados nesta etapa.

- **2026-10-17 — Complemento de biblioteca visual**: usuário solicitou catálogo pronto com fotos/vídeos e manutenção do cadastro manual. Viabilidade pesquisada em fontes oficiais de wger, Free Exercise DB e ExerciseDB; JSON público do Free Exercise DB com 876 exercícios/873 referências de imagens. Opções, limites da verificação e comportamento proposto incorporados ao documento de próxima entrega. Sem integração de produto ou download de mídias.

- **2026-10-17 — Evolução da área do Personal**: diagnóstico do checkout `e33f9c7` concluído e proposta registrada em `docs/planning/2026-10-17-personal-proxima-entrega.md`, para definição de escopo pelo usuário. P1 e prescrição avançada já existem no código; foco recomendado em rascunhos e revisões de treino, seguidos por modelos independentes e acompanhamento. Somente documentação; sem alterações de produto ou banco. `git diff --check` aprovado; testes de produto não executados nesta análise.

- **2026-10-17 — Revisões PRs #27/#28**: correções concluídas no commit `80df49f`, branch `agent/codex/pr27-pr28-review-fixes`. Web 525/525, API 602/602, tipos/lint/builds aprovados; revisão independente sem achados. Mantenedor autorizou a publicação em 2026-10-17; branch enviada e PR #29 aberto como rascunho: https://github.com/Gustavo13Cs/ecossistema-resiliencia/pull/29. Evidências: `docs/runbooks/pr27-pr28-review-corrections.md`.

- **2026-10-08 — Remoção solicitada pelo mantenedor**: PR #25 integrado em e1b13ddd; Render live dep-db3tm7gjo6nc73bfuang e Vercel produção READY. /read-audit retorna404, /clients sem sessão401. Publicação/exclusão autorizadas pelo mantenedor após backup restaurado: novo snapshot cifrado de public+safemove_private restaurou 43 tabelas, incluindo21 acessos/outbox; contagens/owners/RLS/enums/funções conferidos e container isolado removido. Migration18 aplicada externamente pelo owner com CA pública/sslaccept=strict; SHA256 a3ead2773928767f7e7baa034e5d2051f6ad61e8b17b2e9d48255e7698134a8b. 18 migrations concluídas, zero falhas, objetos exclusivos ausentes; 40 tabelas de domínio/RLS e contagens de todos os registros preservados. PR #26 pronto: aguarda CI completo e publicação final. Revisões sem achados; web391/API485/E2E179 primeira etapa e181 PG17 armazenamento, tipos/lint/build/Prisma aprovados. Roteiro: docs/runbooks/remove-access-history.md.

- **Incidente 2026-10-07**: Recuperação autorizada concluída. Backup cifrado restaurado (41 tabelas); 17 migrations aplicadas com checksum original e cleanup sem SET/USAGE/CREATE de catálogo. Quatro LOGINs restritos, três assertDatabaseRole e checker Prisma pelo pooler aprovados. CA/TLS externo1.3 validado; API475, audit runtime0 e Docker finais aprovados. PR#24 revisado sem achados, CI completo verde e integrado; Render live em 2e504765 / dep-db3aj9u0tbcc739bo7m0 às20:23UTC. /read-audit e /clients sem sessão retornam401. Mantenedor confirmou que Histórico de acessos carregou normalmente na própria conta; limites operacionais no runbook.
- **Branch de recuperação**: agent/codex/render-tenant-migration-recovery. Roteiro: docs/runbooks/render-tenant-migration-recovery.md.


- **Tarefa**: Auditoria de leitura v3 e isolamento por profissional no banco, com correções DR-001/002/003 preservadas.
- **Status**: Implementação/prova locais concluídas e verificadas. Migration/conexões restritas e deploy com CA concluídos em produção. Mantenedor confirmou a própria interface; demais decisões operacionais pendentes.
- **Branch**: agent/codex/security-followup; base main/934e183.
- **Worktree**: .worktrees/security/security-followup.
- **Atualização**: 2026-10-07.
- **Commit técnico**: db034ed0ecfd2bba32e7be01ba79965d3194acc7.
- **Resultado**: Fronteira transacional por sessão; evento/outbox antes da resposta; RLS nas 42 tabelas; papéis clínico/auth/jobs/entrega separados; catálogo protegido; cron SYSTEM; consulta própria /read-audit e /auditoria.
- **Validação**: API 47 suítes/475 unitários; PG16.15 e PG17.11, 29 suítes/187 E2E por versão; comando padrão npm run test:e2e validado novamente com 187 testes PG16; web 59 arquivos/391 testes; Cypress real 1/1; tipos/lint/builds/Prisma aprovados; CSP/direção em 29 páginas e standalone verificado.
- **Revisão**: Um reviewer independente; compatibilidade migrada/corrida de Food/overview corrigidos por RED→GREEN, com regressões adicionais de SET ROLE e cadastro auth. Suítes completas verdes; sem segunda revisão.
- **Pendências**: Carga/TLS interno do pooler, D1/D2 retenção/base legal, D3 destino/adaptador/cópia independente, D5 homologação de indisponibilidade, D7 investigador e decisões D9/D10. Backlog de toolchain (34 alertas completos), scripts demo/seed e custódia/backup completo não encerrado. Backup public restaurado e deploy concluídos nesta recuperação.
- **Publicação**: PR#23 integrado em main/eebfab1; recuperação PR#24 integrada em 2e504765. Render live no deploy dep-db3aj9u0tbcc739bo7m0. Checks remotos completos aprovados.
- **Roteiro**: [operação e limites](C:/Users/MICRO/Documents/GitHub/ecossistema-resiliencia/.worktrees/security/security-followup/docs/runbooks/read-audit-tenant-rls.md).
- **Evidência persistente**: [verificação local](C:/Users/MICRO/.codex/state/plugins/codex-security/scans/security-followup/artifacts-d24209c2e31a8c4d3117accee187585a6b91c1cb986256d555d4f2914bd67406/artifacts/2026-10-07-read-audit-tenant-rls-verification.md).

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-10-21 | Personal: rascunhos/revisões e biblioteca visual com 148 exercícios/20 demonstrados; revisões aprovadas, web 657/API 737/PG 243 e browser visual 4 + regressões 28 | agent/codex/personal-workout-implementation |
| 2026-10-07 | Recuperação Render em produção: backup/restauração, migration original, papéis restritos, CA/TLS, proxy-addr2.0.8; PR#24/CI completos e deploy live | agent/codex/render-tenant-migration-recovery |
| 2026-10-07 | Auditoria/RLS locais v3: API475, PG16/17 E2E187 por versao, web391, Cypress real1; papéis separados, trilha antes de resposta e consulta própria; produção pendente | agent/codex/security-followup |
| 2026-10-05 | DR-001/002/003 e corrida do snapshot de receitas corrigidos localmente; 472 unitários API/150 E2E/388 web, tipos/lint/build aprovados; propostas protegidas pendentes | `agent/codex/security-followup` |
| 2026-10-02 | PR #22: cache do protocolo invalidado por profissional/Client antes de navegar; 9 testes focais com QueryClient real, tipos/lint/build aprovados | `agent/codex/security-remediation` |
| 2026-10-02 | PR #22: gate standalone compatível com o output do Vercel; 44 regressões/configuração, tipos/lint/build e CSP em 28 páginas aprovados localmente | `agent/codex/security-remediation` |
| 2026-10-02 | PR #22: índice legado com histórico preservado, refresh resiliente a 500 e cache da central de exames; 472 API/374 web/12 PostgreSQL e builds/tipos/lint aprovados | `agent/codex/security-remediation` |
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

### PR #22 — cache do protocolo de reabilitação em 2026-10-02

- Causa confirmada no HEAD `ef34f9b`: `useFisio` usa a chave `rehabPlan` com staleTime de 60 segundos; o editor fazia POST/sucesso/navegação sem invalidá-la. A correção pertence ao salvamento, mantendo o hook e a configuração global.
- Após POST concluído, aguarda invalidação exata por profissional/Client antes do toast e da navegação. Consulta inativa refaz GET ao reabrir; consulta ativa é atualizada antes de navegar. Erro no POST preserva protocolo/cache e mantém o editor.
- Três regressões falharam antes da correção e passaram depois: primeiro protocolo após cache null, substituição com exercícios/orientações novos e consumidor já montado. As duas jornadas reabrem `/reabilitacao` no mesmo QueryClient de produção, antes de 60 segundos, sem invalidar outros clientes/profissionais.
- 9/9 testes focais (6 contratos + 3 do hook), typecheck, lint e build aprovados; pós-build valida CSP nas 28 páginas e standalone sem dev packages/arquivos de ambiente. HTTP simulado nos testes de integração; nenhum comando de banco ou merge. O CI/Vercel anterior passou no commit `ef34f9b`; conferir os checks do novo HEAD após push.

### PR #22 — correção do CI Vercel em 2026-10-02

- `gh pr checks` apontou somente o Vercel como falha no HEAD `8e15c8d`; os quatro jobs Actions passaram (run `37021935878`). A CLI autenticada recuperou os logs de `dpl_61skD2NdsPS69hL5W7Acs5gL3Kn7` após o conector de build logs retornar Tool not found.
- Causa: compilação/tipos/CSP concluídos, mas `assert-standalone-runtime.mjs` exigia `server.js` no artefato gerenciado pelo Vercel. A validação agora reconhece `VERCEL=1` somente quando não há standalone nem caminho explícito; artefatos emitidos continuam inspecionados.
- Regressão reproduzida antes da correção; depois, 44/44 testes dos scripts/configuração, lint, typecheck e build aprovados. Pós-build: 28/28 páginas com CSP e 297 diretórios standalone sem dev packages/arquivos de ambiente. Sem alterações de dependências, workflow ou banco.
- Este registro acompanha o commit da correção; conferir o deployment/check do novo HEAD após push antes de considerar o gate remoto aprovado.

### PR #22 — correções de review em 2026-10-02

- Base atualizada por fast-forward até `341931e`, preservando os commits externos e trabalho anterior.
- Nova migration anterior à original: valida B-tree/colunas/ordem/tabela e renomeia índice legado; no-op se a original já constar como concluída. SQL antigo e registros/checksums intactos. Sem DROP de objetos; o legado conservado implica índice equivalente adicional e possível drift em bancos antigos.
- Refresh 401 continua limpando cookies/sessão; 500/rede preservam cookies, CSRF, usuário e cache clínico. Interceptor propaga o erro transitório e aceita uma tentativa posterior; Web Locks continua coordenando abas.
- Cadastro de laudo pelo prontuário invalida a central no mesmo QueryClient e na sessão correta; integração preserva cache de outro profissional.
- API 45 suítes/472 testes, web 57 arquivos/374 testes, PostgreSQL 12/12, tipos/lint/builds e Prisma validate aprovados. E2E geral não executado porque fixtures usam DROP DATABASE/exclusões; nenhuma escrita em produção. [Detalhes e limites](../runbooks/pr22-review-corrections.md).
- A revisão automática rejeitou uma proposta inicial com DROP INDEX. Essa operação foi retirada integralmente antes da validação final.

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

### Proposta v3 — 2026-10-05

Correções documentais da revisão v2 incorporadas; estrutura/consistência e integridade do arquivo salvo conferidas. V2 preservada. Sem código/schema/migrations ou testes novos desta proposta. Documento: [v3](C:/Users/MICRO/.codex/state/plugins/codex-security/scans/security-followup/artifacts-d24209c2e31a8c4d3117accee187585a6b91c1cb986256d555d4f2914bd67406/hardening/2026-10-05-read-audit-and-tenant-rls-proposal-v3.md). A implementação e as provas previstas não são declaradas concluídas por esta edição.

### Retomada autorizada — 2026-10-06

Worktree conferido; alterações DR preservadas. Auditoria/RLS ainda sem fonte implementada na retomada. Última tentativa anterior não executada: auto-review indisponível por limite de uso. Limite não repetido nesta retomada. Plano: docs/superpowers/plans/2026-10-06-read-audit-tenant-rls.md. Bancos sintéticos PG16/17, sem DDL remoto.
