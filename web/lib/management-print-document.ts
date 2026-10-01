import type { RetentionMetrics, DietAdherenceMetrics, AppointmentsVolumeMetrics, ClientGrowthMetrics } from "@/types/management-reports"
import { buildPrintDocument, escapeHtml } from "./print-document"

export interface ManagementPrintInput {
  period: string
  dateLabel: string
  retention: Pick<RetentionMetrics, "retentionRatePercent" | "churnRatePercent"> & { cohortData: Pick<RetentionMetrics["cohortData"][number], "month" | "activeRate" | "retainedCount">[] }
  dietAdherence: Pick<DietAdherenceMetrics, "averageAdherencePercent" | "totalMealCheckIns">
  appointments: Pick<AppointmentsVolumeMetrics, "totalAppointments" | "weeklyAverage">
  growth: Pick<ClientGrowthMetrics, "totalActiveClients" | "netNewClients"> & { goalDistribution: Pick<ClientGrowthMetrics["goalDistribution"][number], "label" | "count" | "percent">[] }
}
const styles = `
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 22px; font-weight: 800; color: #059669; }
          .sub { font-size: 13px; color: #64748b; margin-top: 4px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: left; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .card-val { font-size: 24px; font-weight: 800; margin-top: 6px; color: #0f172a; }
          .section { margin-top: 30px; margin-bottom: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
          .section-title { font-size: 16px; font-weight: 700; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; color: #334155; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        `
export function buildManagementReportPrintHtml(input: ManagementPrintInput): string {
  const report = input
  return buildPrintDocument({ title: "SafeMove — Relatório Gerencial Executivo", css: styles, body: `
        <div class="header">
          <div>
            <div class="logo">SAFEMOVE HEALTH & MANAGEMENT</div>
            <div class="sub">Relatório Gerencial Clínico • Nutrição & Consultório Privado</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            Período: <strong><span class="period">${escapeHtml(input.period)}</span></strong><br/>
            Data: <span class="date">${escapeHtml(input.dateLabel)}</span>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Taxa de Retenção</div>
            <div class="card-val">${escapeHtml(report.retention.retentionRatePercent)}%</div>
            <div style="font-size: 11px; color: #059669; margin-top: 4px;">Evasão: ${escapeHtml(report.retention.churnRatePercent)}%</div>
          </div>
          <div class="card">
            <div class="card-title">Adesão Alimentar</div>
            <div class="card-val">${escapeHtml(report.dietAdherence.averageAdherencePercent)}%</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${escapeHtml(report.dietAdherence.totalMealCheckIns)} check-ins</div>
          </div>
          <div class="card">
            <div class="card-title">Consultas Realizadas</div>
            <div class="card-val">${escapeHtml(report.appointments.totalAppointments)}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;"><span class="weekly-average">${escapeHtml(report.appointments.weeklyAverage)}</span> por semana</div>
          </div>
          <div class="card">
            <div class="card-title">Base Privada</div>
            <div class="card-val">${escapeHtml(report.growth.totalActiveClients)}</div>
            <div style="font-size: 11px; color: #059669; margin-top: 4px;">+${escapeHtml(report.growth.netNewClients)} novos clientes</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. Retenção & Continuidade do Tratamento</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Etapa do Acompanhamento</th>
              <th>Taxa de Retenção Ativa</th>
              <th>Clientes em Tratamento</th>
            </tr>
          </thead>
          <tbody>
            ${report.retention.cohortData
              .map(
                (c) => `
              <tr>
                <td><span class="cohort-month">${escapeHtml(c.month)}</span></td>
                <td><strong>${escapeHtml(c.activeRate)}%</strong></td>
                <td>${escapeHtml(c.retainedCount)} clientes</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="section">
          <div class="section-title">2. Distribuição de Objetivos Clínicos da Carteira</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Objetivo Nutricional</th>
              <th>Pacientes Ativos</th>
              <th>Participação na Carteira</th>
            </tr>
          </thead>
          <tbody>
            ${report.growth.goalDistribution
              .map(
                (g) => `
              <tr>
                <td><strong><span class="goal-label">${escapeHtml(g.label)}</span></strong></td>
                <td>${escapeHtml(g.count)} pacientes</td>
                <td>${escapeHtml(g.percent)}%</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <div>Documento gerado automaticamente pelo SafeMove SaaS</div>
          <div>Confidencial • Uso exclusivo do profissional</div>
        </div>` })
}
