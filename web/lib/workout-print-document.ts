import {
  MUSCLE_GROUP_LABELS,
  TRAINING_METHOD_LABELS,
  type WorkoutDetail,
  type WorkoutPrescriptionExercise,
  type WorkoutPrescriptionSplit,
} from "@/types/workout"
import type { PeriodPhase, Periodization } from "@/types/workout-p3"
import { buildPrintDocument, escapeHtml, multiline } from "./print-document"
import { projectExercise, validatePeriodization } from "./workout-periodization"
import { getWorkoutWeekDates } from "./workout-week-dates"

export type WorkoutPrintMode = "gym-sheet" | "block-sheet"

export interface WorkoutPrintOptions {
  includeLoads?: boolean
  includeExerciseNotes?: boolean
  includeGeneralNotes?: boolean
  selectedWeek?: number | null
}

export interface WorkoutPrintInput {
  workout: WorkoutDetail
  professionalName?: string | null
  professionalCredential?: string | null
  dateLabel: string
  options?: WorkoutPrintOptions
}

const PHASE_TYPE_LABELS: Record<PeriodPhase["type"], string> = {
  ADAPTATION: "Adaptação",
  OVERLOAD: "Sobrecarga",
  PEAK: "Pico",
  DELOAD: "Deload",
}

const baseStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #ffffff;
    color: #0f172a;
    font-size: 12px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    border-bottom: 3px solid #0d9488;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .brand {
    font-size: 10px;
    font-weight: 800;
    color: #0d9488;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .doc-title {
    font-size: 20px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .doc-subtitle {
    font-size: 12px;
    color: #475569;
    margin-top: 4px;
    font-weight: 600;
  }
  .header-right {
    text-align: right;
    max-width: 45%;
  }
  .client-name {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
  }
  .professional-line {
    font-size: 11px;
    font-weight: 600;
    color: #334155;
    margin-top: 2px;
  }
  .meta-line {
    font-size: 10px;
    color: #64748b;
    margin-top: 2px;
  }
  .info-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 16px;
  }
  .info-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px 10px;
  }
  .info-card .label {
    font-size: 9px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 2px;
  }
  .info-card .value {
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
  }
  .split-block {
    margin-bottom: 14px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .split-header {
    background: #f1f5f9;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #cbd5e1;
  }
  .split-name {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
  }
  .split-meta {
    font-size: 11px;
    font-weight: 600;
    color: #475569;
  }
  .visually-hidden {
    position: absolute;
    clip-path: inset(50%);
    overflow: hidden;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    white-space: nowrap;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  thead th {
    background: #f8fafc;
    color: #334155;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: left;
    padding: 6px 10px;
    border-bottom: 1px solid #cbd5e1;
  }
  tbody tr {
    border-bottom: 1px solid #e2e8f0;
  }
  tbody tr:last-child {
    border-bottom: none;
  }
  tbody th, tbody td {
    padding: 7px 10px;
    vertical-align: top;
    text-align: left;
  }
  .col-num {
    width: 28px;
    color: #64748b;
    font-weight: 700;
  }
  .exercise-title {
    font-weight: 700;
    color: #0f172a;
    font-size: 12px;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 3px;
  }
  .badge {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 999px;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #334155;
  }
  .badge-method {
    background: #ccfbf1;
    border-color: #99f6e4;
    color: #115e59;
  }
  .badge-deload {
    background: #fef3c7;
    border-color: #fcd34d;
    color: #92400e;
  }
  .exercise-notes {
    margin-top: 4px;
    font-size: 10.5px;
    color: #475569;
    font-style: italic;
  }
  .cell-strong {
    font-weight: 700;
    white-space: nowrap;
  }
  .write-slot {
    display: inline-block;
    min-width: 56px;
    border-bottom: 1px dashed #94a3b8;
    color: #64748b;
    font-size: 10px;
    padding-bottom: 1px;
  }
  .week-target {
    font-size: 10.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .week-effort {
    font-size: 9.5px;
    color: #0d9488;
    font-weight: 700;
  }
  .week-log {
    margin-top: 5px;
    padding-top: 4px;
    border-top: 1px dashed #cbd5e1;
    font-size: 9.5px;
    color: #64748b;
  }
  .week-header-sub {
    display: block;
    font-size: 9px;
    font-weight: 600;
    color: #475569;
    text-transform: none;
    letter-spacing: 0;
    margin-top: 2px;
  }
  .general-notes {
    background: #f0fdfa;
    border: 1px solid #99f6e4;
    border-radius: 8px;
    padding: 10px 14px;
    margin-top: 14px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .general-notes h2 {
    font-size: 10px;
    font-weight: 800;
    color: #0f766e;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 5px;
  }
  .general-notes p {
    font-size: 11.5px;
    color: #134e4a;
    line-height: 1.55;
  }
  .footer {
    margin-top: 18px;
    padding-top: 10px;
    border-top: 1px solid #cbd5e1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: #64748b;
  }
  .footer .highlight {
    font-weight: 700;
    color: #0d9488;
  }
`

const gymSheetStyles = `
  @page { size: A4 portrait; margin: 13mm 12mm; }
  ${baseStyles}
`

const blockSheetStyles = `
  @page { size: A4 landscape; margin: 10mm 10mm; }
  ${baseStyles}
  .block-table th, .block-table td {
    border-right: 1px solid #e2e8f0;
  }
  .block-table th:last-child, .block-table td:last-child {
    border-right: none;
  }
  .exercise-col {
    width: 210px;
    min-width: 180px;
  }
`

function sortSplits(splits: readonly WorkoutPrescriptionSplit[]): WorkoutPrescriptionSplit[] {
  return [...splits].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

function sortExercises(exercises: readonly WorkoutPrescriptionExercise[]): WorkoutPrescriptionExercise[] {
  return [...exercises].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

function formatCivilDate(isoDate: string): string {
  return isoDate.split("-").reverse().join("/")
}

function validPeriodization(workout: WorkoutDetail): Periodization | null {
  if (!workout.periodization || !workout.durationWeeks) return null
  return validatePeriodization(workout.periodization, workout.durationWeeks, true).length === 0
    ? workout.periodization
    : null
}

function renderProfessionalLine(name?: string | null, credential?: string | null): string {
  const cleanName = name?.trim()
  const cleanCredential = credential?.trim()
  if (!cleanName && !cleanCredential) return ""
  const parts = [
    cleanName ? `Personal: ${escapeHtml(cleanName)}` : "",
    cleanCredential ? escapeHtml(cleanCredential) : "",
  ].filter(Boolean)
  return `<div class="professional-line">${parts.join(" · ")}</div>`
}

function renderHeader(
  input: WorkoutPrintInput,
  docTitle: string,
  subtitleSuffix?: string,
): string {
  const { workout } = input
  const goalText = workout.goal?.trim() ? ` · Objetivo: ${escapeHtml(workout.goal.trim())}` : ""
  const suffix = subtitleSuffix ? ` · ${subtitleSuffix}` : ""
  return `<header class="header">
    <div class="header-left">
      <div class="brand">SafeMove · Treinamento</div>
      <h1 class="doc-title">${escapeHtml(docTitle)}</h1>
      <div class="doc-subtitle">${escapeHtml(workout.title)}${goalText}${suffix}</div>
    </div>
    <div class="header-right">
      <div class="client-name">${escapeHtml(workout.client.name)}</div>
      ${renderProfessionalLine(input.professionalName, input.professionalCredential)}
      <div class="meta-line">Emitida em ${escapeHtml(input.dateLabel)}</div>
    </div>
  </header>`
}

function renderFooter(workout: WorkoutDetail, modeLabel: string): string {
  return `<footer class="footer">
    <div>Documento gerado pelo <span class="highlight">SafeMove</span> · ${escapeHtml(modeLabel)}</div>
    <div>Aluno: <span class="highlight">${escapeHtml(workout.client.name)}</span></div>
  </footer>`
}

function renderExerciseBadges(exercise: WorkoutPrescriptionExercise): string {
  const tags: string[] = []
  if (exercise.muscleGroup) {
    tags.push(`<span class="badge">${escapeHtml(MUSCLE_GROUP_LABELS[exercise.muscleGroup])}</span>`)
  }
  if (exercise.method && exercise.method !== "STANDARD") {
    tags.push(`<span class="badge badge-method">${escapeHtml(TRAINING_METHOD_LABELS[exercise.method])}</span>`)
  }
  return tags.length ? `<div class="badges">${tags.join("")}</div>` : ""
}

export function buildWorkoutGymSheetPrintHtml(input: WorkoutPrintInput): string {
  const { workout } = input
  const includeLoads = input.options?.includeLoads ?? true
  const includeExerciseNotes = input.options?.includeExerciseNotes ?? true
  const includeGeneralNotes = input.options?.includeGeneralNotes ?? true
  const periodization = validPeriodization(workout)
  const requestedWeek = input.options?.selectedWeek ?? null
  const activeWeek =
    periodization &&
    requestedWeek != null &&
    Number.isInteger(requestedWeek) &&
    requestedWeek >= 1 &&
    requestedWeek <= (workout.durationWeeks ?? 0)
      ? requestedWeek
      : null
  const activePhase =
    periodization && activeWeek != null
      ? periodization.phases.find(phase => activeWeek >= phase.startWeek && activeWeek <= phase.endWeek) ?? null
      : null
  const weekDates =
    periodization && activeWeek != null
      ? getWorkoutWeekDates(periodization.startsOn, activeWeek)
      : null

  const orderedSplits = sortSplits(workout.splits)
  const docTitle = activeWeek != null ? `Ficha de Treino · Semana ${activeWeek}` : "Ficha de Treino"
  const phaseValue = activePhase
    ? `${escapeHtml(activePhase.name)} (${escapeHtml(PHASE_TYPE_LABELS[activePhase.type])})`
    : periodization
      ? `${periodization.phases.length} fases programadas`
      : "Prescrição base"
  const periodLabel = weekDates
    ? `${escapeHtml(formatCivilDate(weekDates.start))} a ${escapeHtml(formatCivilDate(weekDates.end))}`
    : workout.durationWeeks != null
      ? `${workout.durationWeeks} semanas`
      : "Contínua"

  const splitBlocks = orderedSplits
    .map(split => {
      const exercises = sortExercises(split.exercises)
      const splitMeta = [
        split.focus?.trim() ? `Foco: ${escapeHtml(split.focus.trim())}` : "",
        split.weeklyFrequency != null ? `${split.weeklyFrequency}x/semana` : "",
      ]
        .filter(Boolean)
        .join(" · ")

      const rows = exercises.length
        ? exercises
            .map((exercise, index) => {
              const projected =
                periodization && activeWeek != null
                  ? projectExercise(exercise, periodization, activeWeek)
                  : null
              const sets = projected ? projected.sets : exercise.sets
              const reps = projected ? projected.reps : exercise.reps
              const effortType = projected ? projected.effortType : exercise.effortType
              const effortTarget = projected ? projected.effortTarget : exercise.effortTarget

              const effortParts = [
                effortType && effortTarget ? `${escapeHtml(effortType)} ${escapeHtml(effortTarget)}` : "",
                exercise.tempo?.trim() ? `Cad. ${escapeHtml(exercise.tempo.trim())}` : "",
              ].filter(Boolean)

              const notesHtml =
                includeExerciseNotes && exercise.notes?.trim()
                  ? `<div class="exercise-notes">${multiline(exercise.notes.trim())}</div>`
                  : ""

              const loadCell = includeLoads
                ? `<td class="cell-strong">${
                    exercise.load?.trim()
                      ? escapeHtml(exercise.load.trim())
                      : '<span class="write-slot">&nbsp;</span>'
                  }</td>`
                : ""

              return `<tr>
                <td class="col-num">${index + 1}</td>
                <th scope="row">
                  <div class="exercise-title">${escapeHtml(exercise.name)}</div>
                  ${renderExerciseBadges(exercise)}
                  ${notesHtml}
                </th>
                <td class="cell-strong">${escapeHtml(sets)} × ${escapeHtml(reps)}</td>
                ${loadCell}
                <td>${effortParts.length ? effortParts.join(" · ") : "—"}</td>
                <td class="cell-strong">${exercise.rest?.trim() ? escapeHtml(exercise.rest.trim()) : "—"}</td>
              </tr>`
            })
            .join("")
        : `<tr><td colspan="${includeLoads ? 6 : 5}">Nenhum exercício registrado nesta divisão.</td></tr>`

      return `<section class="split-block">
        <div class="split-header">
          <h2 class="split-name">${escapeHtml(split.name)}</h2>
          ${splitMeta ? `<div class="split-meta">${splitMeta}</div>` : ""}
        </div>
        <table>
          <caption class="visually-hidden">Exercícios de ${escapeHtml(split.name)}</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Exercício</th>
              <th scope="col">Séries × Reps</th>
              ${includeLoads ? '<th scope="col">Carga</th>' : ""}
              <th scope="col">Esforço / Cadência</th>
              <th scope="col">Descanso</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`
    })
    .join("")

  const generalNotesHtml =
    includeGeneralNotes && workout.notes?.trim()
      ? `<section class="general-notes"><h2>Orientações Gerais</h2><p>${multiline(workout.notes.trim())}</p></section>`
      : ""

  const body = `
    ${renderHeader(input, docTitle)}
    <div class="info-strip">
      <div class="info-card">
        <div class="label">Objetivo</div>
        <div class="value">${escapeHtml(workout.goal?.trim() || "Não informado")}</div>
      </div>
      <div class="info-card">
        <div class="label">Divisões</div>
        <div class="value">${orderedSplits.length} ${orderedSplits.length === 1 ? "divisão" : "divisões"}</div>
      </div>
      <div class="info-card">
        <div class="label">${weekDates ? "Período da Semana" : "Duração"}</div>
        <div class="value">${periodLabel}</div>
      </div>
      <div class="info-card">
        <div class="label">Estrutura</div>
        <div class="value">${phaseValue}</div>
      </div>
    </div>
    ${splitBlocks}
    ${generalNotesHtml}
    ${renderFooter(workout, "Modo Ficha de Academia")}
  `

  return buildPrintDocument({
    title: `${docTitle} — ${workout.client.name}`,
    css: gymSheetStyles,
    body,
  })
}

function chunkWeeks(totalWeeks: number, chunkSize = 6): number[][] {
  const chunks: number[][] = []
  for (let start = 1; start <= totalWeeks; start += chunkSize) {
    const end = Math.min(totalWeeks, start + chunkSize - 1)
    const weeks: number[] = []
    for (let week = start; week <= end; week += 1) weeks.push(week)
    chunks.push(weeks)
  }
  return chunks
}

export function buildWorkoutBlockSheetPrintHtml(input: WorkoutPrintInput): string {
  const { workout } = input
  const includeLoads = input.options?.includeLoads ?? true
  const includeExerciseNotes = input.options?.includeExerciseNotes ?? true
  const includeGeneralNotes = input.options?.includeGeneralNotes ?? true
  const periodization = validPeriodization(workout)
  const totalWeeks = Math.min(
    12,
    Math.max(1, workout.durationWeeks ?? periodization?.phases.at(-1)?.endWeek ?? 4),
  )
  const weekGroups = chunkWeeks(totalWeeks, 6)
  const orderedSplits = sortSplits(workout.splits)

  const splitBlocks = orderedSplits
    .flatMap(split => {
      const exercises = sortExercises(split.exercises)
      return weekGroups.map(weeks => {
        const rangeSuffix =
          weekGroups.length > 1 ? ` · Semanas ${weeks[0]} a ${weeks[weeks.length - 1]}` : ""
        const splitMeta = [
          split.focus?.trim() ? `Foco: ${escapeHtml(split.focus.trim())}` : "",
          split.weeklyFrequency != null ? `${split.weeklyFrequency}x/semana` : "",
          exerciseRestSummary(exercises),
        ]
          .filter(Boolean)
          .join(" · ")

        const weekHeaders = weeks
          .map(week => {
            const phase = periodization?.phases.find(
              item => week >= item.startWeek && week <= item.endWeek,
            )
            const dates = periodization
              ? getWorkoutWeekDates(periodization.startsOn, week)
              : null
            const phaseLabel = phase
              ? `<span class="week-header-sub">${escapeHtml(phase.name)}${
                  phase.type === "DELOAD" ? " (Deload)" : ""
                }</span>`
              : ""
            const dateLabel = dates
              ? `<span class="week-header-sub">${escapeHtml(formatCivilDate(dates.start))}–${escapeHtml(formatCivilDate(dates.end))}</span>`
              : ""
            return `<th scope="col">Semana ${week}${phaseLabel}${dateLabel}</th>`
          })
          .join("")

        const rows = exercises.length
          ? exercises
              .map((exercise, index) => {
                const baseMeta = [
                  exercise.rest?.trim() ? `Desc. ${escapeHtml(exercise.rest.trim())}` : "",
                  exercise.tempo?.trim() ? `Cad. ${escapeHtml(exercise.tempo.trim())}` : "",
                  includeLoads && exercise.load?.trim()
                    ? `Ref. ${escapeHtml(exercise.load.trim())}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")

                const notesHtml =
                  includeExerciseNotes && exercise.notes?.trim()
                    ? `<div class="exercise-notes">${multiline(exercise.notes.trim())}</div>`
                    : ""

                const weekCells = weeks
                  .map(week => {
                    const projected = periodization
                      ? projectExercise(exercise, periodization, week)
                      : null
                    const sets = projected ? projected.sets : exercise.sets
                    const reps = projected ? projected.reps : exercise.reps
                    const effortType = projected ? projected.effortType : exercise.effortType
                    const effortTarget = projected ? projected.effortTarget : exercise.effortTarget
                    const phase = periodization?.phases.find(
                      item => week >= item.startWeek && week <= item.endWeek,
                    )

                    return `<td>
                      <div class="week-target">${escapeHtml(sets)} × ${escapeHtml(reps)}</div>
                      ${
                        effortType && effortTarget
                          ? `<div class="week-effort">${escapeHtml(effortType)} ${escapeHtml(effortTarget)}</div>`
                          : ""
                      }
                      ${phase?.type === "DELOAD" ? '<span class="badge badge-deload">Deload</span>' : ""}
                      <div class="week-log">Carga: _________</div>
                    </td>`
                  })
                  .join("")

                return `<tr>
                  <th scope="row" class="exercise-col">
                    <div class="exercise-title">${index + 1}. ${escapeHtml(exercise.name)}</div>
                    ${renderExerciseBadges(exercise)}
                    ${baseMeta ? `<div class="exercise-notes">${baseMeta}</div>` : ""}
                    ${notesHtml}
                  </th>
                  ${weekCells}
                </tr>`
              })
              .join("")
          : `<tr><td colspan="${weeks.length + 1}">Nenhum exercício registrado nesta divisão.</td></tr>`

        return `<section class="split-block">
          <div class="split-header">
            <h2 class="split-name">${escapeHtml(split.name)}${rangeSuffix}</h2>
            ${splitMeta ? `<div class="split-meta">${splitMeta}</div>` : ""}
          </div>
          <table class="block-table">
            <caption class="visually-hidden">Planilha de evolução de ${escapeHtml(split.name)}${rangeSuffix}</caption>
            <thead>
              <tr>
                <th scope="col" class="exercise-col">Exercício</th>
                ${weekHeaders}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`
      })
    })
    .join("")

  const generalNotesHtml =
    includeGeneralNotes && workout.notes?.trim()
      ? `<section class="general-notes"><h2>Orientações Gerais do Bloco</h2><p>${multiline(workout.notes.trim())}</p></section>`
      : ""

  const body = `
    ${renderHeader(input, "Planilha do Bloco (Mesociclo)", `${totalWeeks} semanas`)}
    ${splitBlocks}
    ${generalNotesHtml}
    ${renderFooter(workout, "Modo Planilha do Bloco")}
  `

  return buildPrintDocument({
    title: `Planilha do Bloco — ${workout.client.name}`,
    css: blockSheetStyles,
    body,
  })
}

function exerciseRestSummary(exercises: readonly WorkoutPrescriptionExercise[]): string {
  return exercises.length ? `${exercises.length} ${exercises.length === 1 ? "exercício" : "exercícios"}` : ""
}
