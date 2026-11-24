# Antigravity Agent — Status

> Este arquivo é atualizado pelo agente Antigravity para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

_Nenhuma tarefa em andamento. Fisioterapia P1 e P2 (itens 1 a 5) concluídas, validadas e publicadas na branch `agent/antigravity/physio-workspace-p1`._

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-11-24 | Fisioterapia P2 — Exame físico estruturado em `PhysioAssessment` (`bodyPainMap`, `goniometry`, `muscleStrength`, `orthopedicTestItems`), mapa corporal de dor SVG interativo (`BodyPainMapEditor`), construtores de goniometria com alerta de assimetria bilateral, força MRC `0–5` e testes especiais por região em `PhysioAssessmentModal`, evolução de ADM e leitura estruturada em `PhysioClientRecord`; Escalas funcionais padronizadas com cálculo automático (`PSFS`, `OSWESTRY`, `NDI`, `LEFS`, `SPADI`, `TUG`), migration `20261124170000_physio_structured_exam_and_scales` com RLS `safemove_clinical` para `PHYSIO`, endpoints `/rehab-plans/scales` (`PhysioFunctionalScalesService`/`Controller`), modal (`PhysioFunctionalScaleDialog`) e gráfico/tabela longitudinal (`PhysioFunctionalScalesSection`). Gates aprovados: API (`tsc`, `lint`, 65/65 suítes unitárias / 793 testes, 42/42 E2E PostgreSQL/RLS / 260 testes, `nest build`), Web (`typecheck`, `lint`, 100/100 Vitest / 776 testes, `next build` + `postbuild` 32/32 páginas e runtime standalone). | `agent/antigravity/physio-workspace-p1` |
| 2026-11-24 | Fisioterapia P1 — Evolução de sessão (`PhysioSessionEvolution`, migration `20261124153000_physio_session_evolutions` com RLS `safemove_clinical` para `PHYSIO`, bloqueio de `Client` `ARCHIVED`, endpoints CRUD `/rehab-plans/evolutions`), Painel operacional do fisioterapeuta (`PhysioReadService` `GET /rehab-plans/workspace` + `PhysioDashboard` com atendimentos do dia, sessões concluídas sem evolução, pacientes com dor em piora, reavaliações pendentes e sem protocolo ativo), Prontuário próprio (`GET /rehab-plans/client/:clientId/overview`, `PhysioClientRecord` com gráfico/tabela longitudinal de EVA, linha do tempo de sessões e histórico de avaliações), integração na agenda (`AppointmentDetails`) e ajustes de terminologia em `/reabilitacao`. Gates aprovados: API (`tsc`, `lint`, 63/63 unitários / 779 testes, 41/41 E2E PostgreSQL/RLS / 257 testes, `nest build`), Web (`typecheck`, `lint`, 99/99 Vitest / 773 testes, `next build` + `postbuild` 32/32 páginas e runtime standalone). | `agent/antigravity/physio-workspace-p1` |
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
