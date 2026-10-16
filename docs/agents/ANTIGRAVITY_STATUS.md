# Antigravity Agent — Status

> Este arquivo é atualizado pelo agente Antigravity para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

_Nenhuma tarefa em andamento. P2 concluída e validada com sucesso._

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-10-16 | P2 — Prescrição de treino avançada (Personal): parâmetros avançados (`position`, `muscleGroup`, `load`, `effortType`, `effortTarget`, `tempo`, `method`), biblioteca de exercícios (~150 catálogo SafeMove + `custom_exercises` com RLS por profissional), reordenação persistida (↑/↓), duplicação de divisões e exercícios, `ExerciseLibraryCombobox`, `WorkoutExerciseCard`, `WorkoutSplitCard`, `WorkoutEditor`, `WorkoutReadView`, migração Prisma `20261016150000_advanced_workout_prescription` aplicada no banco de testes (porta 5434), 51/51 testes unitários API (602 testes), 32/32 testes E2E API (192 testes), 74/74 testes frontend (516 testes), typecheck, lint e builds Next.js/NestJS aprovados. | `agent/antigravity/workout-prescription-p2` |
| 2026-10-16 | P1 — Painel de trabalho e prontuário do Personal (`TrainingReadService`, bloqueio transacional em `Client` arquivado, dashboard operacional, avaliação física sem campos ambíguos, leitura de ficha por `workoutId` exato, editor sem exemplos pré-preenchidos e suíte E2E real; ver `docs/runbooks/personal-p1-verification.md`) | `agent/antigravity/personal-workspace-p1` |
| 2026-09-30 | Adição e integração do novo logotipo oficial: geração de favicons multi-tamanho (.ico, .png, .svg, apple-icon), remoção suave de fundo (transparência precisa do prato/emblema), substituição de placeholders de logo na sidebar, navegação mobile, landing page e telas de autenticação | `agent/codex/security-scan-2026-09-30` |
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
