import {
  comparePersonalAssessments,
  type PersonalAssessmentRaw,
  type PersonalClientEvolution,
} from "@/hooks/features/usePersonalEvolution"
import { buildPrintDocument, escapeHtml, openPrintWindow } from "./print-document"

export interface PersonalEvolutionPrintInput {
  evolution: PersonalClientEvolution
  firstAssessment?: PersonalAssessmentRaw
  secondAssessment?: PersonalAssessmentRaw
  professionalName?: string | null
  dateLabel?: string
}

const evolutionPrintCss = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #ffffff;
    color: #0f172a;
    font-size: 12px;
    line-height: 1.45;
    padding: 24px;
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
    margin-bottom: 18px;
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
    letter-spacing: -0.025em;
  }
  .doc-subtitle {
    font-size: 12px;
    color: #475569;
    margin-top: 2px;
  }
  .header-right {
    text-align: right;
  }
  .student-name {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
  }
  .meta-line {
    font-size: 11px;
    color: #475569;
    margin-top: 2px;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 20px;
  }
  .kpi-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 12px;
  }
  .kpi-label {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .kpi-value {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 4px;
  }
  .kpi-delta {
    font-size: 11px;
    font-weight: 700;
    color: #0d9488;
    margin-top: 2px;
  }
  .section {
    margin-bottom: 18px;
    break-inside: avoid;
  }
  .section-title {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e2e8f0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th, td {
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
  }
  th {
    background: #f1f5f9;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #334155;
  }
  td.num, th.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .delta-pos {
    font-weight: 800;
    color: #0f766e;
  }
  .delta-neg {
    font-weight: 800;
    color: #334155;
  }
  .footer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #cbd5e1;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #64748b;
  }
  @media print {
    body { padding: 0; }
    @page { size: A4 portrait; margin: 12mm; }
  }
`

function formatPtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  })
}

function formatSignedDelta(delta: number | null, unit: string): string {
  if (delta === null) return "—"
  const sign = delta > 0 ? "+" : ""
  return `${sign}${delta} ${unit}`
}

export function buildPersonalEvolutionPrintDocument({
  evolution,
  firstAssessment,
  secondAssessment,
  professionalName,
  dateLabel,
}: PersonalEvolutionPrintInput): string {
  const first = firstAssessment ?? evolution.assessments[0]
  const second =
    secondAssessment ?? evolution.assessments[evolution.assessments.length - 1]

  const firstDateText = first ? formatPtDate(first.date) : "—"
  const secondDateText = second ? formatPtDate(second.date) : "—"
  const emittedAt =
    dateLabel ??
    new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

  const comparisons =
    first && second ? comparePersonalAssessments(first, second) : []

  const groups = new Map<string, typeof comparisons>()
  for (const row of comparisons) {
    const existing = groups.get(row.groupTitle)
    if (existing) existing.push(row)
    else groups.set(row.groupTitle, [row])
  }

  const sectionsHtml = Array.from(groups.entries())
    .map(
      ([groupTitle, rows]) => `
      <section class="section">
        <h2 class="section-title">${escapeHtml(groupTitle)}</h2>
        <table>
          <thead>
            <tr>
              <th>Medida</th>
              <th class="num">Avaliação (${escapeHtml(firstDateText)})</th>
              <th class="num">Avaliação (${escapeHtml(secondDateText)})</th>
              <th class="num">Variação</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((row) => {
                const v1 =
                  row.firstValue !== null
                    ? `${escapeHtml(row.firstValue)} ${escapeHtml(row.unit)}`
                    : "—"
                const v2 =
                  row.secondValue !== null
                    ? `${escapeHtml(row.secondValue)} ${escapeHtml(row.unit)}`
                    : "—"
                const deltaText = formatSignedDelta(row.delta, row.unit)
                const deltaClass =
                  row.delta !== null && row.delta !== 0
                    ? row.delta > 0
                      ? "delta-pos"
                      : "delta-neg"
                    : ""
                return `
                  <tr>
                    <td>${escapeHtml(row.label)}</td>
                    <td class="num">${v1}</td>
                    <td class="num">${v2}</td>
                    <td class="num ${deltaClass}">${escapeHtml(deltaText)}</td>
                  </tr>
                `
              })
              .join("")}
          </tbody>
        </table>
      </section>
    `,
    )
    .join("")

  const body = `
    <header class="header">
      <div>
        <div class="brand">SafeMove · Área de Treinamento</div>
        <h1 class="doc-title">Relatório de Evolução Física &amp; Força</h1>
        <p class="doc-subtitle">Comparativo longitudinal entre ${escapeHtml(firstDateText)} e ${escapeHtml(secondDateText)}</p>
      </div>
      <div class="header-right">
        <div class="student-name">${escapeHtml(evolution.clientName)}</div>
        ${
          professionalName
            ? `<div class="meta-line">Personal Trainer: ${escapeHtml(professionalName)}</div>`
            : ""
        }
        <div class="meta-line">Emitido em ${escapeHtml(emittedAt)} · ${escapeHtml(evolution.assessmentCount)} avaliações</div>
      </div>
    </header>

    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Peso Corporal</div>
        <div class="kpi-value">${evolution.lastWeight !== null ? `${escapeHtml(evolution.lastWeight)} kg` : "—"}</div>
        <div class="kpi-delta">${escapeHtml(formatSignedDelta(evolution.weightDelta, "kg"))}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Gordura Corporal</div>
        <div class="kpi-value">${evolution.lastBodyFat !== null ? `${escapeHtml(evolution.lastBodyFat)}%` : "—"}</div>
        <div class="kpi-delta">${escapeHtml(formatSignedDelta(evolution.bodyFatDelta, "%"))}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Agachamento 1RM</div>
        <div class="kpi-value">${evolution.lastSquat1RM !== null ? `${escapeHtml(evolution.lastSquat1RM)} kg` : "—"}</div>
        <div class="kpi-delta">${escapeHtml(formatSignedDelta(evolution.squat1RMDelta, "kg"))}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Supino / Terra 1RM</div>
        <div class="kpi-value">
          ${evolution.lastBench1RM !== null ? `${escapeHtml(evolution.lastBench1RM)} kg` : "—"}
          /
          ${evolution.lastDeadlift1RM !== null ? `${escapeHtml(evolution.lastDeadlift1RM)} kg` : "—"}
        </div>
        <div class="kpi-delta">
          ${
            evolution.latestRelativeSquat !== null
              ? `Força rel. Squat: ${escapeHtml(evolution.latestRelativeSquat)}x PC`
              : "—"
          }
        </div>
      </div>
    </section>

    ${sectionsHtml || `<p>Nenhuma medida numérica comparável encontrada no período selecionado.</p>`}

    <footer class="footer">
      <span>Documento técnico de acompanhamento — SafeMove Treinamento</span>
      <span>Aluno(a): ${escapeHtml(evolution.clientName)}</span>
    </footer>
  `

  return buildPrintDocument({
    title: `Evolução Física — ${evolution.clientName}`,
    css: evolutionPrintCss,
    body,
  })
}

export function printPersonalEvolutionDocument(
  input: PersonalEvolutionPrintInput,
): Window | null {
  const html = buildPersonalEvolutionPrintDocument(input)
  return openPrintWindow(html, "width=960,height=780")
}
