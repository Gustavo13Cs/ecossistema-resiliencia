# Codex Agent — Status

> Este arquivo é atualizado pelo agente OpenAI Codex para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- Nenhuma tarefa em andamento.

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

---

## Blocked

_Nenhum impedimento._

---

## Notes

- Agenda validada com 182 testes web, build Next, Cypress desktop/mobile, migration PostgreSQL e E2E HTTP real de ownership/lifecycle
- Rotas clínicas legadas fora do novo prontuário ainda exigem migração de ownership por tenant
- Consultar `AGENTS.md` na raiz para orientação geral
- Consultar `docs/TASKS.md` para o backlog de tarefas
- Marcar tarefas como 🔄 em TASKS.md ao iniciar trabalho
- Usar branches no formato `agent/codex/<feature-name>`
