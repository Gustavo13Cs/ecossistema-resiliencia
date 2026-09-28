# Antigravity Agent — Status

> Este arquivo é atualizado pelo agente Antigravity para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- **Tarefa**: Mitigação de vulnerabilidades da Auditoria de Segurança (C-01, C-02, A-05)
- **Status**: Em andamento (C-01 e C-02 mitigados localmente com .gitignore e rotação de JWT_SECRET; testes em execução)
- **Início**: 2026-09-22

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-09-22 | Refatoração dos PDFs de Dieta e Lista de Compras: janelas dedicadas com HTML/CSS limpo, layout profissional A4, sem dados clínicos internos para o paciente | `main` |
| 2026-09-17 | Implementação do módulo de Relatórios & Métricas de Gestão concluído | `main` |
| 2026-09-15 | Implementação do módulo de Modelos de Planos Alimentares (templates pré-configurados SafeMove, auto-scaling de porções e macros, versionamento, arquivamento e importação para prontuário) | `main` |
| 2026-09-08 | Corrigir 500/429 em `/clients`: throttler 20→60, Dockerfile com migrate deploy, backfill de dados legados | `codex/fix-production-client-data` |

---

## Blocked

_Nenhum impedimento._

---

## Notes

- Migration `20260908194000_backfill_legacy_clients` copia dados de `professional_patient_links` + `User` para `clients`
- O Dockerfile agora roda `prisma migrate deploy` antes de iniciar o servidor
- Consultar `AGENTS.md` na raiz para orientação geral
- Consultar `docs/TASKS.md` para o backlog de tarefas
