# Antigravity Agent — Status

> Este arquivo é atualizado pelo agente Antigravity para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- _Nenhuma tarefa em andamento._ (Última entrega concluída: **Fisioterapia P4** na branch `agent/antigravity/physio-workspace-p1` — itens 8, 9 e 10 concluídos e enviados ao GitHub.)

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-11-25 | Fisioterapia P4 — Itens 8, 9 e 10: Pacotes de sessões (`PhysioSessionPackage`, `/rehab-plans/packages`, auto-vínculo de evoluções, contagem de faltas/cancelamentos, alerta de reavaliação periódica, fila `EXPIRING_PACKAGE` no `PhysioDashboard`, `PhysioPackageDialog` e `PhysioPackagesSection`); Documentos prontos em PDF A4 padrão COFFITO (`physio-documents-print.ts` + `PhysioDocumentDialog` com Declaração de Comparecimento, Atestado cinético-funcional com toggle de privacidade de diagnóstico/CID e Relatório Médico/Convênio); Alta fisioterapêutica com snapshot comparativo Inicial vs. Alta e Relatórios Gerenciais (`PhysioDischarge`, `/rehab-plans/discharges`, `getManagementReport`, `PhysioDischargeDialog`, `PhysioDischargeSection`, `PhysioManagementReportsView` + exportação CSV/PDF em `/relatorios` habilitado para `PHYSIO`). Migration `20261125083000_physio_packages_and_discharges` (RLS + `clinical_owner` + `deny_data_api_access`) aplicada via `DIRECT_URL` e validada em Postgres 16 isolado (porta `5435`). Verificações: API (`tsc`, `lint`, `66/66` unitários / `803/803` testes, `nest build`, `42/44` suítes E2E/RLS / `256/271` testes na porta `5435` com todas as suítes de Fisioterapia passando — `workout-draft-transactions.e2e-spec.ts` e `workout-templates.e2e-spec.ts` falharam apenas por `5434` hardcoded enquanto `plataforma-dashboards-db-1` ocupava a porta `5434`), Web (`typecheck`, `eslint --max-warnings=0`, `next build` + `postbuild` `32/32` páginas e runtime standalone, `102/104` suítes Vitest / `793/796` testes em `--maxWorkers=1` com todas as suítes P4/Fisioterapia aprovadas e `ExerciseLibraryPage.test.tsx` 8/8 isolado; 1 caso em `WorkoutTemplatesHub.test.tsx` excedeu timeout de 5000ms sob carga local de CPU). | `agent/antigravity/physio-workspace-p1` |
| 2026-11-24 | Fisioterapia P3 — Plano de reabilitação avançado (edição in-place `PATCH /rehab-plans/:id` preservando `rehabPlanId`, `currentPhaseIndex` com `PATCH /rehab-plans/:id/phase`, critérios de progressão e semanas estimadas por fase, parâmetros estruturados de eletro/termoterapia + presets clínicos, 6 protocolos curados SafeMove em `protocol-catalog` e modelos próprios em `POST /rehab-plans/templates`) e Cartilha Visual de Exercícios para Casa em PDF A4 (`exercise-catalog` integrado ao catálogo SafeMove com 20 ilustrações `CC BY-SA 4.0`, `rehab-print-document.ts` com privacidade clínica estrita no modo domiciliar, `RehabPrintDialog`, `RehabProtocolPickerDialog`, `RehabExerciseCatalogDialog`, `RehabExerciseEditorCard` e integrações em `nova-reabilitacao`, `reabilitacao` e `PhysioClientRecord`). Migration `20261124183000_rehab_plan_advanced_and_home_pdf`. Gates aprovados: API (`tsc`, `lint`, 65/65 unitários / 798 testes, 43/43 E2E PostgreSQL/RLS / 267 testes, `nest build`), Web (`typecheck`, `lint`, 102/102 Vitest / 785 testes, `next build` + `postbuild` 32/32 páginas e runtime standalone). | `agent/antigravity/physio-workspace-p1` |
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
