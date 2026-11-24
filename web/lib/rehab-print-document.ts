import {
  REHAB_ITEM_CATEGORY_LABELS,
  type RehabExercise,
  type RehabModalityParams,
  type RehabPlan,
  type RehabSession,
} from "@/hooks/features/useFisio"
import { isExerciseMediaUrl, safeCreditUrl } from "./exercise-media-policy"
import { buildPrintDocument, escapeHtml, multiline } from "./print-document"

export type RehabPrintMode = "home-program" | "clinical-protocol"

export interface RehabPrintOptions {
  selectedSessionIndex?: number | null
  includeAllKinesiotherapyIfNoHomeFlag?: boolean
  includeIllustrations?: boolean
  includeGeneralNotes?: boolean
}

export interface RehabPrintInput {
  plan: RehabPlan
  patientName: string
  professionalName?: string | null
  professionalCredential?: string | null
  dateLabel: string
  options?: RehabPrintOptions
}

const commonStyles = `
  @page { size: A4 portrait; margin: 13mm 12mm; }
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
    border-bottom: 3px solid #7c3aed;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .brand {
    font-size: 10px;
    font-weight: 800;
    color: #6d28d9;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .doc-title {
    font-size: 20px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: -0.03em;
    line-height: 1.15;
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
  .patient-name {
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
  .phase-block {
    margin-bottom: 14px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
  }
  .phase-header {
    background: #f5f3ff;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #ddd6fe;
  }
  .phase-name {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
  }
  .phase-meta {
    font-size: 11px;
    font-weight: 600;
    color: #5b21b6;
  }
  .criteria-box {
    padding: 8px 12px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 11px;
    color: #334155;
  }
  .criteria-label {
    font-weight: 800;
    color: #4c1d95;
    text-transform: uppercase;
    font-size: 9.5px;
    letter-spacing: 0.05em;
    margin-right: 6px;
  }
  .exercise-grid {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .exercise-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    break-inside: avoid;
    page-break-inside: avoid;
    background: #ffffff;
  }
  .home-card-body {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
  }
  .home-card-body.no-media {
    grid-template-columns: minmax(0, 1fr);
  }
  .illustration-frame {
    background: #1e293b;
    border-radius: 6px;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 4 / 3;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .illustration-frame img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .illustration-credits {
    margin-top: 4px;
    font-size: 8.5px;
    line-height: 1.3;
    color: #64748b;
  }
  .illustration-credits a {
    color: #5b21b6;
    text-decoration: underline;
  }
  .exercise-title {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
  }
  .badge {
    display: inline-block;
    font-size: 9.5px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #334155;
  }
  .badge-brand {
    background: #ede9fe;
    border-color: #c4b5fd;
    color: #5b21b6;
  }
  .badge-current {
    background: #dcfce7;
    border-color: #86efac;
    color: #166534;
  }
  .dosage-line {
    font-size: 11.5px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 5px;
    font-variant-numeric: tabular-nums;
  }
  .patient-instructions {
    font-size: 11.5px;
    color: #334155;
    line-height: 1.5;
  }
  .clinical-notes {
    margin-top: 5px;
    padding: 5px 8px;
    border-left: 3px solid #94a3b8;
    background: #f8fafc;
    font-size: 10.5px;
    color: #475569;
  }
  .modality-box {
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: 6px;
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    font-size: 10.5px;
    color: #4c1d95;
  }
  .safety-banner {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: 8px;
    padding: 10px 12px;
    margin-top: 12px;
    font-size: 11px;
    color: #78350f;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .general-notes {
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    border-radius: 8px;
    padding: 10px 14px;
    margin-top: 12px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .general-notes h2 {
    font-size: 10px;
    font-weight: 800;
    color: #5b21b6;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 4px;
  }
  .general-notes p {
    font-size: 11.5px;
    color: #3b0764;
    line-height: 1.5;
  }
  .empty-state {
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    padding: 18px;
    text-align: center;
    color: #475569;
    font-size: 12px;
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
    color: #6d28d9;
  }
`

function sortSessions(sessions: readonly RehabSession[]): RehabSession[] {
  return [...sessions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

function sortExercises(exercises: readonly RehabExercise[]): RehabExercise[] {
  return [...exercises].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

function selectSessions(plan: RehabPlan, selectedSessionIndex?: number | null): Array<{ session: RehabSession; originalIndex: number }> {
  const ordered = sortSessions(plan.sessions)
  const indexed = ordered.map((session, idx) => ({ session, originalIndex: idx }))
  if (
    selectedSessionIndex != null &&
    Number.isInteger(selectedSessionIndex) &&
    selectedSessionIndex >= 0 &&
    selectedSessionIndex < indexed.length
  ) {
    return [indexed[selectedSessionIndex]]
  }
  return indexed
}

function renderProfessionalLine(name?: string | null, credential?: string | null): string {
  const cleanName = name?.trim()
  const cleanCredential = credential?.trim()
  if (!cleanName && !cleanCredential) return ""
  const parts = [
    cleanName ? `Fisioterapeuta: ${escapeHtml(cleanName)}` : "",
    cleanCredential ? escapeHtml(cleanCredential) : "",
  ].filter(Boolean)
  return `<div class="professional-line">${parts.join(" · ")}</div>`
}

function renderHeader(
  input: RehabPrintInput,
  brandLabel: string,
  docTitle: string,
): string {
  const { plan, patientName } = input
  const goalText = plan.goal?.trim() ? ` · Objetivo: ${escapeHtml(plan.goal.trim())}` : ""
  return `<header class="header">
    <div>
      <div class="brand">${escapeHtml(brandLabel)}</div>
      <h1 class="doc-title">${escapeHtml(docTitle)}</h1>
      <div class="doc-subtitle">${escapeHtml(plan.title)}${goalText}</div>
    </div>
    <div class="header-right">
      <div class="patient-name">${escapeHtml(patientName)}</div>
      ${renderProfessionalLine(input.professionalName, input.professionalCredential)}
      <div class="meta-line">Emitida em ${escapeHtml(input.dateLabel)}</div>
    </div>
  </header>`
}

function renderFooter(patientName: string, modeLabel: string): string {
  return `<footer class="footer">
    <div>Documento gerado pelo <span class="highlight">SafeMove</span> · ${escapeHtml(modeLabel)}</div>
    <div>Paciente: <span class="highlight">${escapeHtml(patientName)}</span></div>
  </footer>`
}

function getApprovedImages(exercise: RehabExercise) {
  return (exercise.demonstrationSnapshot?.assets ?? []).filter(
    asset =>
      asset.type === "IMAGE" &&
      asset.displayAllowed === true &&
      isExerciseMediaUrl(asset.url),
  )
}

function renderLink(url: string, label: string): string {
  const safe = safeCreditUrl(url)
  return safe
    ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${escapeHtml(label)}</a>`
    : escapeHtml(label)
}

function renderIllustrationBlock(exercise: RehabExercise): string {
  const images = getApprovedImages(exercise)
  if (!images.length) return ""
  const primary = images[0]
  const credits = [
    `Autoria: ${escapeHtml(primary.author)}`,
    renderLink(primary.licenseUrl, primary.licenseName),
    renderLink(primary.sourcePageUrl, "Fonte"),
    primary.upstreamSourcePageUrl
      ? renderLink(primary.upstreamSourcePageUrl, "Fonte original")
      : "",
  ]
    .filter(Boolean)
    .join(" · ")

  return `<div class="illustration-column">
    <div class="illustration-frame">
      <img src="${escapeHtml(primary.url)}" alt="${escapeHtml(primary.alt)}" referrerpolicy="no-referrer">
    </div>
    <div class="illustration-credits">${credits}</div>
  </div>`
}

function formatModalitySummary(params?: RehabModalityParams | null): string {
  if (!params?.modality?.trim()) return ""
  const parts = [
    `<strong>Recurso:</strong> ${escapeHtml(params.modality.trim())}`,
    params.frequency?.trim() ? `<strong>Freq.:</strong> ${escapeHtml(params.frequency.trim())}` : "",
    params.pulseWidth?.trim() ? `<strong>Pulso:</strong> ${escapeHtml(params.pulseWidth.trim())}` : "",
    params.intensity?.trim() ? `<strong>Intensidade:</strong> ${escapeHtml(params.intensity.trim())}` : "",
    params.emissionMode?.trim() ? `<strong>Modo:</strong> ${escapeHtml(params.emissionMode.trim())}` : "",
    params.durationMinutes != null ? `<strong>Duração:</strong> ${params.durationMinutes} min` : "",
    params.applicationSite?.trim() ? `<strong>Local:</strong> ${escapeHtml(params.applicationSite.trim())}` : "",
  ].filter(Boolean)
  return parts.join(" · ")
}

export function selectHomeProgramExercises(
  session: RehabSession,
  includeAllKinesiotherapyIfNoHomeFlag = false,
): RehabExercise[] {
  return sortExercises(session.exercises).filter(exercise => {
    // Nunca incluir eletroterapia de consultório na cartilha domiciliar do paciente
    if (exercise.category === "ELECTROTHERAPY") return false
    if (exercise.isHomeExercise) return true
    if (
      includeAllKinesiotherapyIfNoHomeFlag &&
      (!exercise.category || exercise.category === "KINESIOTHERAPY")
    ) {
      return true
    }
    return false
  })
}

export function buildRehabHomeProgramPrintHtml(input: RehabPrintInput): string {
  const { plan, patientName } = input
  const includeIllustrations = input.options?.includeIllustrations ?? true
  const includeGeneralNotes = input.options?.includeGeneralNotes ?? true
  const includeFallback = input.options?.includeAllKinesiotherapyIfNoHomeFlag ?? false
  const selectedSessions = selectSessions(plan, input.options?.selectedSessionIndex)

  const blocks = selectedSessions
    .map(({ session, originalIndex }) => {
      const homeExercises = selectHomeProgramExercises(session, includeFallback)
      if (!homeExercises.length) return ""

      const isCurrent = (plan.currentPhaseIndex ?? 0) === originalIndex
      const cards = homeExercises
        .map((exercise, index) => {
          const illustrationHtml = includeIllustrations ? renderIllustrationBlock(exercise) : ""
          const dosageParts = [
            exercise.sets?.trim() ? `Séries/Duração: ${escapeHtml(exercise.sets.trim())}` : "",
            exercise.reps?.trim() ? `Repetições: ${escapeHtml(exercise.reps.trim())}` : "",
            exercise.homeFrequency?.trim()
              ? `Frequência: ${escapeHtml(exercise.homeFrequency.trim())}`
              : "",
          ].filter(Boolean)

          // Privacidade clínica estrita: nunca usar exercise.notes (anotações internas).
          const patientText =
            exercise.patientInstructions?.trim() ||
            exercise.demonstrationSnapshot?.instruction?.trim() ||
            ""

          return `<article class="exercise-card">
            <div class="home-card-body${illustrationHtml ? "" : " no-media"}">
              ${illustrationHtml}
              <div>
                <h3 class="exercise-title">${index + 1}. ${escapeHtml(exercise.name)}</h3>
                ${
                  exercise.homeFrequency?.trim()
                    ? `<div class="badges"><span class="badge badge-brand">${escapeHtml(exercise.homeFrequency.trim())}</span></div>`
                    : ""
                }
                ${
                  dosageParts.length
                    ? `<p class="dosage-line">${dosageParts.join(" · ")}</p>`
                    : ""
                }
                ${
                  patientText
                    ? `<p class="patient-instructions">${multiline(patientText)}</p>`
                    : ""
                }
              </div>
            </div>
          </article>`
        })
        .join("")

      return `<section class="phase-block">
        <div class="phase-header">
          <div class="phase-name">${escapeHtml(session.name)}${isCurrent ? ' <span class="badge badge-current">Fase atual</span>' : ""}</div>
          ${session.focus?.trim() ? `<div class="phase-meta">${escapeHtml(session.focus.trim())}</div>` : ""}
        </div>
        <div class="exercise-grid">${cards}</div>
      </section>`
    })
    .filter(Boolean)
    .join("")

  const contentHtml =
    blocks ||
    `<div class="empty-state">Nenhum exercício domiciliar selecionado nas fases exibidas. Marque os exercícios como "Exercício para casa" no editor do protocolo ou habilite a inclusão da cinesioterapia.</div>`

  const generalNotesHtml =
    includeGeneralNotes && plan.notes?.trim()
      ? `<section class="general-notes">
          <h2>Orientações para casa</h2>
          <p>${multiline(plan.notes.trim())}</p>
        </section>`
      : ""

  const safetyHtml = `<section class="safety-banner">
    <strong>Sinais de alerta:</strong> Execute os movimentos de forma controlada e sem prender a respiração. Interrompa o exercício e comunique seu fisioterapeuta caso surja dor aguda intensa, formigamento novo, tontura ou aumento importante de inchaço.
  </section>`

  const body = `${renderHeader(input, "SafeMove · Fisioterapia", "Cartilha de Exercícios para Casa")}${contentHtml}${generalNotesHtml}${safetyHtml}${renderFooter(patientName, "Cartilha de Exercícios para Casa")}`

  return buildPrintDocument({
    title: `Cartilha para Casa · ${plan.title}`,
    css: commonStyles,
    body,
  })
}

export function buildRehabClinicalProtocolPrintHtml(input: RehabPrintInput): string {
  const { plan, patientName } = input
  const includeGeneralNotes = input.options?.includeGeneralNotes ?? true
  const selectedSessions = selectSessions(plan, input.options?.selectedSessionIndex)

  const blocks = selectedSessions
    .map(({ session, originalIndex }) => {
      const isCurrent = (plan.currentPhaseIndex ?? 0) === originalIndex
      const metaParts = [
        session.focus?.trim() ? escapeHtml(session.focus.trim()) : "",
        session.estimatedWeeks != null ? `${session.estimatedWeeks} sem.` : "",
      ]
        .filter(Boolean)
        .join(" · ")

      const exercises = sortExercises(session.exercises)
      const itemsHtml = exercises
        .map((exercise, idx) => {
          const categoryLabel =
            REHAB_ITEM_CATEGORY_LABELS[exercise.category ?? "KINESIOTHERAPY"]
          const modalitySummary = formatModalitySummary(exercise.modalityParams)
          const dosage = [
            exercise.sets?.trim() ? `Séries/Duração: ${escapeHtml(exercise.sets.trim())}` : "",
            exercise.reps?.trim() ? `Reps/Regime: ${escapeHtml(exercise.reps.trim())}` : "",
          ]
            .filter(Boolean)
            .join(" · ")

          return `<article class="exercise-card">
            <h3 class="exercise-title">${idx + 1}. ${escapeHtml(exercise.name)}</h3>
            <div class="badges">
              <span class="badge badge-brand">${escapeHtml(categoryLabel)}</span>
              ${
                exercise.isHomeExercise
                  ? `<span class="badge badge-current">Domiciliar${exercise.homeFrequency?.trim() ? `: ${escapeHtml(exercise.homeFrequency.trim())}` : ""}</span>`
                  : ""
              }
            </div>
            ${dosage ? `<p class="dosage-line">${dosage}</p>` : ""}
            ${modalitySummary ? `<div class="modality-box">${modalitySummary}</div>` : ""}
            ${
              exercise.patientInstructions?.trim()
                ? `<p class="patient-instructions"><strong>Orientação ao paciente:</strong> ${multiline(exercise.patientInstructions.trim())}</p>`
                : ""
            }
            ${
              exercise.notes?.trim()
                ? `<div class="clinical-notes"><strong>Notas clínicas:</strong> ${multiline(exercise.notes.trim())}</div>`
                : ""
            }
          </article>`
        })
        .join("")

      return `<section class="phase-block">
        <div class="phase-header">
          <div class="phase-name">${escapeHtml(session.name)}${isCurrent ? ' <span class="badge badge-current">Fase atual</span>' : ""}</div>
          ${metaParts ? `<div class="phase-meta">${metaParts}</div>` : ""}
        </div>
        ${
          session.progressionCriteria?.trim()
            ? `<div class="criteria-box"><span class="criteria-label">Critérios de progressão</span>${multiline(session.progressionCriteria.trim())}</div>`
            : ""
        }
        <div class="exercise-grid">${itemsHtml}</div>
      </section>`
    })
    .join("")

  const generalNotesHtml =
    includeGeneralNotes && plan.notes?.trim()
      ? `<section class="general-notes">
          <h2>Orientações Gerais do Protocolo</h2>
          <p>${multiline(plan.notes.trim())}</p>
        </section>`
      : ""

  const body = `${renderHeader(input, "SafeMove · Fisioterapia", "Protocolo Completo de Reabilitação")}${blocks}${generalNotesHtml}${renderFooter(patientName, "Protocolo Completo de Reabilitação")}`

  return buildPrintDocument({
    title: `Protocolo de Reabilitação · ${plan.title}`,
    css: commonStyles,
    body,
  })
}
