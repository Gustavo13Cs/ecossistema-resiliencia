# Antigravity Agent — Status

> Este arquivo é atualizado pelo agente Antigravity para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- **2026-11-06 — Personal P4 concluído localmente na branch `agent/antigravity/personal-p4`**:
  - ✅ **6. Gerador Tipográfico de PDF A4 ("Modo Ficha de Academia" & "Planilha do Bloco")**: Concluído no frontend (`workout-print-document.ts`, `WorkoutPrintDialog.tsx`, `WorkoutReadView.tsx`), 22/22 testes unitários e de UI, formatação A4 sem dados clínicos internos nem dependências de browser storage.
  - ✅ **5. Anamnese de Treinamento, PAR-Q+ & Mapeamento de Ambiente/Equipamentos do Aluno**: Schema Prisma + migration versionada com RLS defensivo (`safemove_clinical`), DTOs com class-validator/SanitizeHtml, service e controller REST com `@Roles('PERSONAL')` e `@ClinicalResponse()`. Frontend com tipagem, hook TanStack Query com isolamento de observer, formulário dialog com 7 perguntas PAR-Q+ e chips interativos de equipamentos. Integração no editor de prescrições e biblioteca de exercícios (`ExerciseLibraryCombobox` com aviso "Fora do ambiente do aluno" e filtro "Somente equipamentos mapeados").
  - ✅ **4. Central Dedicada de Modelos de Treino (`/modelos-treinos`)**: Suporte a ambiente e arquivamento no banco de dados e API. Hub com tabs ("Todos ativos", "Meus modelos", "SafeMove", "Arquivados"), busca e filtros avançados (objetivo, nível, ambiente), prévia em modal, duplicação profunda, edição isolada, arquivamento/restauração, e modal para aplicar modelo a aluno ativo com resolução segura de rascunhos concorrentes (409 Conflict).
  - ✅ **Gates de Qualidade**: API unit tests (61/61 suites, 646 tests), API lint e build NestJS aprovados. Frontend `tsc --noEmit` (0 erros), `eslint . --max-warnings=0` (0 erros), build Next.js 16 (Turbopack) com rotas estáticas/dinâmicas incluindo `/modelos-treinos`, e validações de pós-build (`assert-direction-contract.mjs` 32/32 páginas e `assert-standalone-runtime.mjs`). Nota: Testes E2E contra PostgreSQL 5434 necessitam do daemon Docker local iniciado.

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-11-06 | Personal P4 — Gerador de PDF A4 tipográfico (Ficha de Academia e Planilha do Bloco), Anamnese de Treino/PAR-Q+ e Mapeamento de Ambiente/Equipamentos com aviso na biblioteca de exercícios, e Central Dedicada de Modelos de Treino (`/modelos-treinos`) com RBAC `PERSONAL`, cópia profunda, aplicação a aluno e ciclo de vida de modelos. | `agent/antigravity/personal-p4` |
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

- Migration `20261106150000_personal_p4` adiciona `TrainingEnvironment`, campos em `WorkoutTemplate` (`environment`, `archivedAt`) e modelo `TrainingAnamnesis` com RLS defensivo (`safemove_clinical`).
- Migration `20260908194000_backfill_legacy_clients` copia dados de `professional_patient_links` + `User` para `clients`
- O Dockerfile agora roda `prisma migrate deploy` antes de iniciar o servidor
- Consultar `AGENTS.md` na raiz para orientação geral
- Consultar `docs/TASKS.md` para o backlog de tarefas
