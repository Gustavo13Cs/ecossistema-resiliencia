import type {
  PhysioDischargeReason,
  PhysioManagementReport,
  PhysioReportPeriod,
} from "@/types/physio"
import { PHYSIO_DISCHARGE_REASON_LABELS } from "./physio-documents-print"
import { buildPrintDocument, escapeHtml } from "./print-document"

export const PHYSIO_REPORT_PERIOD_LABELS: Record<PhysioReportPeriod, string> = {
  "30_DAYS": "Últimos 30 dias",
  "90_DAYS": "Últimos 90 dias",
  "180_DAYS": "Últimos 180 dias",
  "365_DAYS": "Último ano (365 dias)",
}

const reportStyles = `
  @page { size: A4 portrait; margin: 14mm 14mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #ffffff;
    color: #0f172a;
    font-size: 12px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 3px solid #7c3aed;
    padding-bottom: 12px;
    margin-bottom: 18px;
  }
  .logo { font-size: 11px; font-weight: 800; color: #6d28d9; letter-spacing: 0.08em; text-transform: uppercase; }
  .title { font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 2px; }
  .meta { text-align: right; font-size: 11px; color: #475569; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 20px; }
  .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; }
  .card-label { font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #64748b; }
  .card-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .card-sub { font-size: 10px; color: #475569; margin-top: 2px; }
  h2 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #5b21b6; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 18px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; font-variant-numeric: tabular-nums; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; color: #334155; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
`

export function buildPhysioManagementReportPrintHtml(input: {
  report: PhysioManagementReport
  professionalName?: string | null
  dateLabel: string
}): string {
  const { report } = input
  const c = report.counts
  const reasons = (
    Object.entries(report.dischargesByReason) as Array<
      [PhysioDischargeReason, number]
    >
  ).filter(([, count]) => count > 0)

  const body = `
    <header class="header">
      <div>
        <div class="logo">SafeMove · Gestão em Fisioterapia</div>
        <h1 class="title">Relatório Gerencial de Reabilitação</h1>
      </div>
      <div class="meta">
        <div><strong>Período:</strong> ${escapeHtml(PHYSIO_REPORT_PERIOD_LABELS[report.period])}</div>
        ${input.professionalName?.trim() ? `<div>Fisioterapeuta: ${escapeHtml(input.professionalName.trim())}</div>` : ""}
        <div>Emitido em ${escapeHtml(input.dateLabel)}</div>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-label">Sessões Realizadas</div>
        <div class="card-val">${escapeHtml(c.completedSessions)}</div>
        <div class="card-sub">${escapeHtml(c.completedAppointments)} atendimentos concluídos</div>
      </div>
      <div class="card">
        <div class="card-label">Faltas (No-show)</div>
        <div class="card-val">${escapeHtml(c.noShowCount)} (${escapeHtml(c.noShowRatePct)}%)</div>
        <div class="card-sub">${escapeHtml(c.cancelledCount)} cancelamentos</div>
      </div>
      <div class="card">
        <div class="card-label">Altas / Média de Sessões</div>
        <div class="card-val">${escapeHtml(c.dischargesCount)}</div>
        <div class="card-sub">Média até alta: ${c.avgSessionsToDischarge != null ? `${escapeHtml(c.avgSessionsToDischarge)} sessões` : "—"}</div>
      </div>
      <div class="card">
        <div class="card-label">Redução Média EVA</div>
        <div class="card-val">${c.avgPainReduction != null ? `${c.avgPainReduction >= 0 ? "-" : "+"}${escapeHtml(Math.abs(c.avgPainReduction))}` : "—"}</div>
        <div class="card-sub">${escapeHtml(c.expiringPackagesCount)} pacotes perto do fim</div>
      </div>
    </div>

    <h2>Desfechos e Motivos de Alta</h2>
    ${
      reasons.length > 0
        ? `<table>
            <thead>
              <tr><th>Motivo de Alta</th><th>Quantidade</th></tr>
            </thead>
            <tbody>
              ${reasons
                .map(
                  ([reason, count]) => `<tr>
                    <td>${escapeHtml(PHYSIO_DISCHARGE_REASON_LABELS[reason])}</td>
                    <td><strong>${escapeHtml(count)}</strong></td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>`
        : `<p>Nenhuma alta registrada no período selecionado.</p>`
    }

    <h2>Resumo por Paciente no Período</h2>
    ${
      report.items.length > 0
        ? `<table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Sessões</th>
                <th>Faltas</th>
                <th>Pacote Ativo</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
              ${report.items
                .map(
                  item => `<tr>
                    <td><strong>${escapeHtml(item.name)}</strong></td>
                    <td>${escapeHtml(item.completedSessions)}</td>
                    <td>${escapeHtml(item.noShowCount)}</td>
                    <td>${
                      item.activePackageTitle
                        ? `${escapeHtml(item.activePackageTitle)} (${escapeHtml(item.packageCompletedSessions ?? 0)}/${escapeHtml(item.packageTotalSessions ?? 0)})`
                        : "—"
                    }</td>
                    <td>${item.latestDischargeReason ? escapeHtml(PHYSIO_DISCHARGE_REASON_LABELS[item.latestDischargeReason]) : "—"}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>`
        : `<p>Sem movimentação registrada no período.</p>`
    }

    <footer class="footer">
      <div>SafeMove · Uso exclusivo do profissional</div>
      <div>${escapeHtml(c.activePatients)} pacientes ativos</div>
    </footer>
  `

  return buildPrintDocument({
    title: `Relatório de Gestão · Fisioterapia`,
    css: reportStyles,
    body,
  })
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value)
  // Mitiga formula injection em planilhas caso o campo comece com =, +, - ou @
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}

export function buildPhysioManagementCsv(report: PhysioManagementReport): string {
  const header = [
    "Paciente",
    "Status",
    "Sessoes_Realizadas",
    "Faltas",
    "Cancelamentos",
    "Pacote_Ativo",
    "Sessoes_Pacote",
    "Motivo_Alta",
  ]
  const rows = report.items.map(item => [
    escapeCsvCell(item.name),
    escapeCsvCell(item.status),
    escapeCsvCell(item.completedSessions),
    escapeCsvCell(item.noShowCount),
    escapeCsvCell(item.cancelledCount),
    escapeCsvCell(item.activePackageTitle ?? ""),
    escapeCsvCell(
      item.packageTotalSessions != null
        ? `${item.packageCompletedSessions ?? 0}/${item.packageTotalSessions}`
        : "",
    ),
    escapeCsvCell(
      item.latestDischargeReason
        ? PHYSIO_DISCHARGE_REASON_LABELS[item.latestDischargeReason]
        : "",
    ),
  ])

  return [header.join(","), ...rows.map(r => r.join(","))].join("\n")
}
