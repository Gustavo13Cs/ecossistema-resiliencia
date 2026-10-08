# Codex Agent — Status

> Este arquivo é atualizado pelo agente OpenAI Codex para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- **2026-10-08 — Remoção solicitada pelo mantenedor**: implementação e revisão concluídas em dois PRs em rascunho: #25 retira UI/API/coleta/worker/modelos (968d282), todos os checks remotos verdes; #26 retira armazenamento (5b8b402), revisão sem achados, 30 suítes/181 E2E PG17 e TypeScript/lint aprovados. Web 391, API 485 unitários, primeira etapa 179 E2E e tipos/lint/build/schema aprovados. Contexto/validação clínica, RLS/auth/ownership e históricos de alterações preservados. Produção e dados reais não alterados; publicação, backup atual restaurado e aprovação específica da exclusão de registros são a etapa final. Roteiro: docs/runbooks/remove-access-history.md. Autorização explícita recebida para publicação e exclusão após backup restaurado; rollout iniciado em 2026-10-08, sem DDL de produção executada até este registro.

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
