import type { ConsolidatedLabExam, IssuedLabOrder } from "@/types/lab-exam"
import { buildPrintDocument, escapeHtml, multiline } from "./print-document"

const styles = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 40px; color: #1e293b; }
  @page { size: A4; margin: 16mm; }
  .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
  .logo { font-size: 20px; font-weight: 800; }
  .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px; }
  h2 { font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 24px; }
  ol { padding-left: 20px; font-size: 14px; line-height: 1.8; }
  .instructions, .notes { font-size: 13px; color: #475569; background: #f1f5f9; padding: 12px; border-radius: 6px; line-height: 1.5; }
  .footer { margin-top: 60px; display: flex; justify-content: space-between; font-size: 11px; }
  .signature-line { border-top: 1px solid #64748b; width: 240px; text-align: center; padding-top: 8px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
`
function header(dateLabel: string) {
  return `<div class="header"><div class="logo">SAFEMOVE</div><div>Data: <span class="date">${escapeHtml(dateLabel)}</span></div></div>`
}
export function buildLabOrderPrintHtml(order: IssuedLabOrder, dateLabel: string): string {
  return buildPrintDocument({
    title: `Pedido de Exames — ${order.clientName}`,
    css: styles,
    body: `${header(dateLabel)}<h1>Requisição Laboratorial</h1>
      <div class="patient-box"><div>Cliente: <strong class="client-name">${escapeHtml(order.clientName)}</strong></div>
      <div>Indicação clínica: <span class="indication">${multiline(order.clinicalIndication)}</span></div>
      ${order.templateTitle ? `<div>Protocolo: <span class="template">${escapeHtml(order.templateTitle)}</span></div>` : ""}</div>
      <h2>EXAMES SOLICITADOS</h2><ol>${order.markers.map(marker => `<li>${escapeHtml(marker)}</li>`).join("")}</ol>
      <h2>ORIENTAÇÕES AO CLIENTE / LABORATÓRIO</h2><div class="instructions">${multiline(order.preparationInstructions)}</div>
      <div class="footer"><span>Emitido via SafeMove</span><div class="signature-line">Assinatura / Carimbo Profissional</div></div>`,
  })
}
export function buildLabExamPrintHtml(exam: ConsolidatedLabExam, dateLabel: string): string {
  return buildPrintDocument({
    title: `Exames Laboratoriais — ${exam.clientName}`,
    css: styles,
    body: `${header(dateLabel)}<h1>Resultados Laboratoriais</h1><div class="patient-box">
      <div>Cliente: <strong class="client-name">${escapeHtml(exam.clientName)}</strong></div>
      ${exam.laboratoryName ? `<div>Laboratório: <span class="laboratory">${escapeHtml(exam.laboratoryName)}</span></div>` : ""}</div>
      <table><thead><tr><th>Marcador</th><th>Valor</th><th>Unidade</th></tr></thead><tbody>
      ${exam.markers.map(marker => `<tr><td class="marker-name">${escapeHtml(marker.name)}</td><td>${escapeHtml(marker.value)}</td><td class="marker-unit">${escapeHtml(marker.unit)}</td></tr>`).join("")}
      </tbody></table>${exam.notes ? `<h2>OBSERVAÇÕES CLÍNICAS</h2><div class="notes">${multiline(exam.notes)}</div>` : ""}`,
  })
}
