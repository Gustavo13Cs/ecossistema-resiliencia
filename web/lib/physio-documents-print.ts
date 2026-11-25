import type {
  PhysioDischargeReason,
  PhysioDischargeRecord,
} from "@/types/physio"
import { buildPrintDocument, escapeHtml, multiline } from "./print-document"

export const PHYSIO_DISCHARGE_REASON_LABELS: Record<
  PhysioDischargeReason,
  string
> = {
  GOALS_MET: "Objetivos terapêuticos atingidos",
  PARTIAL_IMPROVEMENT: "Melhora parcial / autonomia funcional",
  MEDICAL_REFERRAL: "Encaminhamento / retorno médico",
  TREATMENT_ABANDONMENT: "Desistência / abandono do tratamento",
  PATIENT_REQUEST: "Solicitação do paciente",
}

const SIDE_LABELS: Record<string, string> = {
  LEFT: "Esquerdo",
  RIGHT: "Direito",
  AXIAL: "Axial",
}

const documentStyles = `
  @page { size: A4 portrait; margin: 16mm 15mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #ffffff;
    color: #0f172a;
    font-size: 12.5px;
    line-height: 1.6;
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
    margin-bottom: 22px;
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
    letter-spacing: -0.025em;
    line-height: 1.15;
  }
  .doc-subtitle {
    font-size: 11.5px;
    color: #475569;
    margin-top: 4px;
    font-weight: 600;
  }
  .header-right {
    text-align: right;
    max-width: 45%;
    font-size: 11px;
    color: #475569;
  }
  .professional-name {
    font-weight: 800;
    color: #0f172a;
    font-size: 12.5px;
  }
  .lead-box {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #7c3aed;
    border-radius: 6px;
    padding: 16px 18px;
    margin-bottom: 18px;
    font-size: 13px;
    line-height: 1.7;
  }
  .section {
    margin-bottom: 16px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .section-title {
    font-size: 11px;
    font-weight: 800;
    color: #5b21b6;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin-bottom: 8px;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  }
  .kpi-card {
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    border-radius: 6px;
    padding: 10px 12px;
  }
  .kpi-label {
    font-size: 9.5px;
    font-weight: 700;
    color: #5b21b6;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .kpi-value {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 2px;
    font-variant-numeric: tabular-nums;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
    margin-bottom: 12px;
    font-variant-numeric: tabular-nums;
  }
  thead th {
    background: #f1f5f9;
    color: #334155;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: left;
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
  }
  tbody td {
    padding: 7px 10px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .callout {
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    border-radius: 6px;
    padding: 12px 14px;
    font-size: 12px;
    color: #2e1065;
    margin-bottom: 14px;
  }
  .auth-note {
    margin-top: 14px;
    padding: 10px 12px;
    border: 1px dashed #94a3b8;
    border-radius: 6px;
    font-size: 11px;
    color: #334155;
  }
  .signature-area {
    margin-top: 42px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .city-date {
    font-size: 12px;
    color: #334155;
  }
  .sig-block {
    min-width: 260px;
    text-align: center;
    border-top: 1px solid #0f172a;
    padding-top: 6px;
  }
  .sig-name {
    font-weight: 800;
    font-size: 12px;
    color: #0f172a;
  }
  .sig-cred {
    font-size: 11px;
    color: #475569;
  }
  .footer {
    margin-top: 26px;
    padding-top: 8px;
    border-top: 1px solid #cbd5e1;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #64748b;
  }
`

function renderDocHeader(input: {
  title: string
  subtitle?: string | null
  clinicName?: string | null
  professionalName?: string | null
  professionalCredential?: string | null
  issueDateLabel: string
}): string {
  const cleanClinic = input.clinicName?.trim()
  const cleanName = input.professionalName?.trim() || "Fisioterapeuta Responsável"
  const cleanCred = input.professionalCredential?.trim()
  return `<header class="header">
    <div>
      <div class="brand">${escapeHtml(cleanClinic || "SafeMove · Fisioterapia")}</div>
      <h1 class="doc-title">${escapeHtml(input.title)}</h1>
      ${input.subtitle?.trim() ? `<div class="doc-subtitle">${escapeHtml(input.subtitle.trim())}</div>` : ""}
    </div>
    <div class="header-right">
      <div class="professional-name">${escapeHtml(cleanName)}</div>
      ${cleanCred ? `<div>${escapeHtml(cleanCred)}</div>` : ""}
      <div>Emitido em ${escapeHtml(input.issueDateLabel)}</div>
    </div>
  </header>`
}

function renderSignatureFooter(input: {
  city?: string | null
  issueDateLabel: string
  professionalName?: string | null
  professionalCredential?: string | null
  patientName: string
  includeAuthorizationLine?: boolean
}): string {
  const cityPrefix = input.city?.trim() ? `${escapeHtml(input.city.trim())}, ` : ""
  const cleanName = input.professionalName?.trim() || "Fisioterapeuta"
  const cleanCred = input.professionalCredential?.trim()
  return `
    ${
      input.includeAuthorizationLine
        ? `<div class="auth-note">
            Autorizo o registro e a divulgação das informações diagnósticas/cinético-funcionais contidas neste documento.<br/>
            Assinatura do(a) paciente ou responsável legal: ___________________________________________
          </div>`
        : ""
    }
    <div class="signature-area">
      <div class="city-date">${cityPrefix}${escapeHtml(input.issueDateLabel)}</div>
      <div class="sig-block">
        <div class="sig-name">${escapeHtml(cleanName)}</div>
        <div class="sig-cred">${cleanCred ? escapeHtml(cleanCred) : "Fisioterapeuta"}</div>
      </div>
    </div>
    <footer class="footer">
      <div>Documento gerado pelo SafeMove</div>
      <div>Paciente: ${escapeHtml(input.patientName)}</div>
    </footer>
  `
}

export interface AttendanceCertificateInput {
  patientName: string
  attendanceDateLabel: string
  startTime: string
  endTime: string
  companionName?: string | null
  clinicName?: string | null
  city?: string | null
  professionalName?: string | null
  professionalCredential?: string | null
  notes?: string | null
  issueDateLabel: string
}

export function buildAttendanceCertificatePrintHtml(
  input: AttendanceCertificateInput,
): string {
  const companionClause = input.companionName?.trim()
    ? `, acompanhado(a) por <strong>${escapeHtml(input.companionName.trim())}</strong>,`
    : ""
  const body = `
    ${renderDocHeader({
      title: "Declaração de Comparecimento",
      subtitle: "Atendimento Fisioterapêutico",
      clinicName: input.clinicName,
      professionalName: input.professionalName,
      professionalCredential: input.professionalCredential,
      issueDateLabel: input.issueDateLabel,
    })}
    <section class="lead-box">
      Declaro, para os devidos fins, que <strong>${escapeHtml(input.patientName)}</strong>${companionClause} compareceu a atendimento fisioterapêutico sob meus cuidados profissionais no dia <strong>${escapeHtml(input.attendanceDateLabel)}</strong>, no período das <strong>${escapeHtml(input.startTime)}</strong> às <strong>${escapeHtml(input.endTime)}</strong>.
    </section>
    ${
      input.notes?.trim()
        ? `<section class="section">
            <h2 class="section-title">Observações</h2>
            <p>${multiline(input.notes.trim())}</p>
          </section>`
        : ""
    }
    ${renderSignatureFooter({
      city: input.city,
      issueDateLabel: input.issueDateLabel,
      professionalName: input.professionalName,
      professionalCredential: input.professionalCredential,
      patientName: input.patientName,
    })}
  `
  return buildPrintDocument({
    title: `Declaração de Comparecimento · ${input.patientName}`,
    css: documentStyles,
    body,
  })
}

export interface PhysioCertificateInput {
  patientName: string
  kineticFunctionalFinding: string
  activityRecommendation: string
  recommendationDays?: number | null
  includeDiagnosisCode?: boolean
  diagnosisOrCid?: string | null
  clinicName?: string | null
  city?: string | null
  professionalName?: string | null
  professionalCredential?: string | null
  issueDateLabel: string
}

export function buildPhysioCertificatePrintHtml(
  input: PhysioCertificateInput,
): string {
  const showDiagnosis = Boolean(
    input.includeDiagnosisCode && input.diagnosisOrCid?.trim(),
  )
  const daysClause =
    input.recommendationDays != null && input.recommendationDays > 0
      ? ` pelo período estimado de <strong>${input.recommendationDays} ${input.recommendationDays === 1 ? "dia" : "dias"}</strong> a partir de <strong>${escapeHtml(input.issueDateLabel)}</strong>`
      : ""

  const body = `
    ${renderDocHeader({
      title: "Atestado Fisioterapêutico",
      subtitle: "Parecer Cinético-Funcional",
      clinicName: input.clinicName,
      professionalName: input.professionalName,
      professionalCredential: input.professionalCredential,
      issueDateLabel: input.issueDateLabel,
    })}
    <section class="lead-box">
      Atesto, para os devidos fins, que <strong>${escapeHtml(input.patientName)}</strong> encontra-se em acompanhamento fisioterapêutico, necessitando de <strong>${escapeHtml(input.activityRecommendation.trim())}</strong>${daysClause}.
    </section>
    <section class="section">
      <h2 class="section-title">Parecer Cinético-Funcional</h2>
      <p>${multiline(input.kineticFunctionalFinding.trim())}</p>
    </section>
    ${
      showDiagnosis
        ? `<section class="callout">
            <strong>Diagnóstico / Código autorizado pelo paciente:</strong> ${escapeHtml(input.diagnosisOrCid!.trim())}
          </section>`
        : ""
    }
    ${renderSignatureFooter({
      city: input.city,
      issueDateLabel: input.issueDateLabel,
      professionalName: input.professionalName,
      professionalCredential: input.professionalCredential,
      patientName: input.patientName,
      includeAuthorizationLine: showDiagnosis,
    })}
  `
  return buildPrintDocument({
    title: `Atestado Fisioterapêutico · ${input.patientName}`,
    css: documentStyles,
    body,
  })
}

export interface MedicalReferralReportInput {
  patientName: string
  recipientName?: string | null
  chiefComplaint?: string | null
  initialPainLevel?: number | null
  currentPainLevel?: number | null
  sessionsCompleted?: number | null
  romAndScalesSummary?: string | null
  conductSummary: string
  clinicalOpinion: string
  clinicName?: string | null
  city?: string | null
  professionalName?: string | null
  professionalCredential?: string | null
  issueDateLabel: string
}

export function buildMedicalReferralReportPrintHtml(
  input: MedicalReferralReportInput,
): string {
  const recipient =
    input.recipientName?.trim() || "À Equipe Médica / Auditores de Convênio"
  const body = `
    ${renderDocHeader({
      title: "Relatório Fisioterapêutico",
      subtitle: recipient,
      clinicName: input.clinicName,
      professionalName: input.professionalName,
      professionalCredential: input.professionalCredential,
      issueDateLabel: input.issueDateLabel,
    })}
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Paciente</div>
        <div class="kpi-value" style="font-size: 13px;">${escapeHtml(input.patientName)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Sessões Realizadas</div>
        <div class="kpi-value">${input.sessionsCompleted != null ? escapeHtml(input.sessionsCompleted) : "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">EVA Inicial</div>
        <div class="kpi-value">${input.initialPainLevel != null ? `${escapeHtml(input.initialPainLevel)}/10` : "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">EVA Atual</div>
        <div class="kpi-value">${input.currentPainLevel != null ? `${escapeHtml(input.currentPainLevel)}/10` : "—"}</div>
      </div>
    </div>
    ${
      input.chiefComplaint?.trim()
        ? `<section class="section">
            <h2 class="section-title">Quadro Clínico / Queixa Principal</h2>
            <p>${multiline(input.chiefComplaint.trim())}</p>
          </section>`
        : ""
    }
    ${
      input.romAndScalesSummary?.trim()
        ? `<section class="section">
            <h2 class="section-title">Medidas Objetivas (ADM / Escalas Funcionais)</h2>
            <p>${multiline(input.romAndScalesSummary.trim())}</p>
          </section>`
        : ""
    }
    <section class="section">
      <h2 class="section-title">Condutas e Recursos Terapêuticos Aplicados</h2>
      <p>${multiline(input.conductSummary.trim())}</p>
    </section>
    <section class="section">
      <h2 class="section-title">Evolução Funcional e Parecer / Solicitação</h2>
      <p>${multiline(input.clinicalOpinion.trim())}</p>
    </section>
    ${renderSignatureFooter({
      city: input.city,
      issueDateLabel: input.issueDateLabel,
      professionalName: input.professionalName,
      professionalCredential: input.professionalCredential,
      patientName: input.patientName,
    })}
  `
  return buildPrintDocument({
    title: `Relatório Fisioterapêutico · ${input.patientName}`,
    css: documentStyles,
    body,
  })
}

export function buildPhysioDischargePrintHtml(input: {
  patientName: string
  discharge: PhysioDischargeRecord
  clinicName?: string | null
  city?: string | null
  professionalName?: string | null
  professionalCredential?: string | null
  issueDateLabel: string
}): string {
  const { discharge } = input
  const snapshot = discharge.comparisonSnapshot
  const painDelta =
    snapshot?.painDelta ??
    (discharge.initialPainLevel != null && discharge.finalPainLevel != null
      ? discharge.initialPainLevel - discharge.finalPainLevel
      : null)

  const romRows = snapshot?.romComparisons ?? []
  const scaleRows = snapshot?.scaleComparisons ?? []

  const dischargedDate = new Date(discharge.dischargedAt)
  const dischargedLabel = Number.isNaN(dischargedDate.getTime())
    ? input.issueDateLabel
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(dischargedDate)

  const body = `
    ${renderDocHeader({
      title: "Relatório de Alta Fisioterapêutica",
      subtitle: PHYSIO_DISCHARGE_REASON_LABELS[discharge.reason],
      clinicName: input.clinicName,
      professionalName: input.professionalName,
      professionalCredential: input.professionalCredential,
      issueDateLabel: input.issueDateLabel,
    })}
    <section class="callout">
      <strong>Data da alta:</strong> ${escapeHtml(dischargedLabel)} · <strong>Motivo:</strong> ${escapeHtml(PHYSIO_DISCHARGE_REASON_LABELS[discharge.reason])}${discharge.rehabPlan ? ` · <strong>Protocolo:</strong> ${escapeHtml(discharge.rehabPlan.title)}` : ""}
    </section>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Sessões até Alta</div>
        <div class="kpi-value">${escapeHtml(discharge.sessionsCompleted)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Dor Inicial (EVA)</div>
        <div class="kpi-value">${discharge.initialPainLevel != null ? `${escapeHtml(discharge.initialPainLevel)}/10` : "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Dor na Alta (EVA)</div>
        <div class="kpi-value">${discharge.finalPainLevel != null ? `${escapeHtml(discharge.finalPainLevel)}/10` : "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Variação de Dor</div>
        <div class="kpi-value">${painDelta != null ? (painDelta >= 0 ? `-${painDelta}` : `+${Math.abs(painDelta)}`) : "—"} pts</div>
      </div>
    </div>
    ${
      romRows.length > 0
        ? `<section class="section">
            <h2 class="section-title">Comparativo de Amplitude de Movimento (Goniometria)</h2>
            <table>
              <thead>
                <tr>
                  <th>Articulação / Movimento</th>
                  <th>Lado</th>
                  <th>Inicial</th>
                  <th>Final (Alta)</th>
                  <th>Ganho</th>
                </tr>
              </thead>
              <tbody>
                ${romRows
                  .map(
                    r => `<tr>
                      <td>${escapeHtml(r.joint)} · ${escapeHtml(r.movement)}</td>
                      <td>${escapeHtml(SIDE_LABELS[r.side] ?? r.side)}</td>
                      <td>${r.initialDeg != null ? `${r.initialDeg}°` : "—"}</td>
                      <td>${r.finalDeg != null ? `${r.finalDeg}°` : "—"}</td>
                      <td><strong>${r.gainDeg != null ? `${r.gainDeg >= 0 ? "+" : ""}${r.gainDeg}°` : "—"}</strong></td>
                    </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </section>`
        : ""
    }
    ${
      scaleRows.length > 0
        ? `<section class="section">
            <h2 class="section-title">Comparativo de Escalas Funcionais</h2>
            <table>
              <thead>
                <tr>
                  <th>Escala</th>
                  <th>Inicial</th>
                  <th>Final (Alta)</th>
                  <th>Variação</th>
                </tr>
              </thead>
              <tbody>
                ${scaleRows
                  .map(
                    s => `<tr>
                      <td><strong>${escapeHtml(s.scaleType)}</strong></td>
                      <td>${escapeHtml(s.initialScore)} (${escapeHtml(s.initialClassification)})</td>
                      <td>${s.finalScore != null ? `${escapeHtml(s.finalScore)} (${escapeHtml(s.finalClassification ?? "")})` : "—"}</td>
                      <td><strong>${s.delta != null ? `${s.delta >= 0 ? "+" : ""}${s.delta}` : "—"}</strong></td>
                    </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </section>`
        : ""
    }
    <section class="section">
      <h2 class="section-title">Desfecho Clínico e Resumo da Evolução</h2>
      <p>${multiline(discharge.clinicalSummary)}</p>
    </section>
    ${
      discharge.recommendations?.trim()
        ? `<section class="section">
            <h2 class="section-title">Orientações e Manutenção Pós-Alta</h2>
            <p>${multiline(discharge.recommendations.trim())}</p>
          </section>`
        : ""
    }
    ${renderSignatureFooter({
      city: input.city,
      issueDateLabel: input.issueDateLabel,
      professionalName: input.professionalName,
      professionalCredential: input.professionalCredential,
      patientName: input.patientName,
    })}
  `
  return buildPrintDocument({
    title: `Resumo de Alta · ${input.patientName}`,
    css: documentStyles,
    body,
  })
}
