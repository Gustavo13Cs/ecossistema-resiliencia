# Codex Agent — Status

> Este arquivo é atualizado pelo agente OpenAI Codex para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

_Nenhuma tarefa em andamento._

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-09-03 | Dashboard profissional com dados reais, terminologia por profissão e filtro de arquivados | `codex/safemove-professional-frontend-phase-1` |
| 2026-09-04 | Diretório responsivo e cadastro de prontuário orientado por profissão | `codex/safemove-professional-frontend-phase-1` |
| 2026-09-04 | Prontuário modular por profissão e remoção segura de rascunhos clínicos locais | `codex/safemove-professional-frontend-phase-1` |
| 2026-09-08 | E2E real, isolamento profissional, headers de segurança e acabamento visual final | `codex/safemove-professional-frontend-phase-1` |
| 2026-09-08 | Diagnóstico P2021: aplicou migration `add_client_foundation` no Supabase, criou teste e2e do backfill | `codex/fix-production-client-data` |

---

## Blocked

_Nenhum impedimento._

---

## Notes

- Rotas clínicas legadas fora do novo prontuário ainda exigem migração de ownership por tenant
- Consultar `AGENTS.md` na raiz para orientação geral
- Consultar `docs/TASKS.md` para o backlog de tarefas
- Marcar tarefas como 🔄 em TASKS.md ao iniciar trabalho
- Usar branches no formato `agent/codex/<feature-name>`
