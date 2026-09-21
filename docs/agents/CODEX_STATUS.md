# Codex Agent — Status

> Este arquivo é atualizado pelo agente OpenAI Codex para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- _Nenhuma tarefa em andamento._

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

---

## Blocked

_Nenhum impedimento._

---

## Notes

- Produção: migration `20260915133000_harden_supabase_data_api_rls` aplicada uma vez; 33 tabelas de aplicação com RLS, 33 policies restritivas e zero privilégios atuais ou default ACLs nas superfícies verificadas.
- Gate local: Prisma validate/deploy/status/generate, build NestJS, 218/218 casos unitários em 21/21 suites e 8 suites E2E concluídos sem falhas.
- Data API: desativação confirmada visualmente; probes REST (`401`) e GraphQL (`503`) negaram consultas sem retornar dados.
- Smokes: sessão, clientes, agenda, dietas, alimentos e avaliações carregaram; uma escrita autorizada salvou os mesmos valores, sem criar, excluir ou alterar conteúdo clínico.
- Advisors: Security Advisor com 0 lints; o único aviso agregado `rls_disabled` é `_prisma_migrations`, esperado e fora das 33 tabelas de aplicação.
- Limites: o RLS protege a Data API, não isola tenants nas consultas Prisma feitas como `postgres` com `BYPASSRLS`; ownership por `professionalId`, guards e testes negativos permanecem obrigatórios. `consultation_notes` e `_prisma_migrations` seguem fora das 33 tabelas.
- Limite histórico: o preflight anterior ao deploy não inventariou sequences, functions, `PUBLIC EXECUTE` nem default ACLs e esse estado não pode ser reconstruído; o runbook foi corrigido e o pós-deploy confirmou zero em toda a superfície atual e futura verificada.
