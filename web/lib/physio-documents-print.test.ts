import { describe, expect, it } from "vitest"
import {
  PHYSIO_DISCHARGE_REASON_LABELS,
  buildAttendanceCertificatePrintHtml,
  buildMedicalReferralReportPrintHtml,
  buildPhysioCertificatePrintHtml,
  buildPhysioDischargePrintHtml,
} from "./physio-documents-print"
import {
  buildPhysioManagementCsv,
  buildPhysioManagementReportPrintHtml,
} from "./physio-reports-print"
import type {
  PhysioDischargeRecord,
  PhysioManagementReport,
} from "@/types/physio"

describe("physio COFFITO A4 clinical documents print builders", () => {
  it("builds Attendance Certificate and escapes XSS payloads", () => {
    const html = buildAttendanceCertificatePrintHtml({
      patientName: 'Ana <script>alert("xss")</script>',
      attendanceDateLabel: "25 de novembro de 2026",
      startTime: "14:00",
      endTime: "14:50",
      companionName: "Maria & José",
      clinicName: "Clínica Vida",
      city: "São Paulo - SP",
      professionalName: "Dra. Camila",
      professionalCredential: "CREFITO-3/123456-F",
      notes: "Compareceu acompanhada.",
      issueDateLabel: "25 de novembro de 2026",
    })

    expect(html).toContain("Declaração de Comparecimento")
    expect(html).toContain("14:00")
    expect(html).toContain("14:50")
    expect(html).toContain("Maria &amp; José")
    expect(html).toContain("CREFITO-3/123456-F")
    expect(html).not.toContain("<script>alert")
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;")
  })

  it("enforces CID/diagnosis opt-in privacy toggle on Physio Certificate", () => {
    const withoutCid = buildPhysioCertificatePrintHtml({
      patientName: "Carlos Souza",
      kineticFunctionalFinding: "Déficit de extensão de joelho.",
      activityRecommendation: "afastamento de atividades com impacto",
      recommendationDays: 7,
      includeDiagnosisCode: false,
      diagnosisOrCid: "CID S83.5",
      professionalName: "Dra. Camila",
      professionalCredential: "CREFITO-3/123456-F",
      issueDateLabel: "25 de novembro de 2026",
    })

    expect(withoutCid).toContain("Atestado Fisioterapêutico")
    expect(withoutCid).toContain("7 dias")
    expect(withoutCid).not.toContain("CID S83.5")
    expect(withoutCid).not.toContain("Autorizo o registro e a divulgação")

    const withCid = buildPhysioCertificatePrintHtml({
      patientName: "Carlos Souza",
      kineticFunctionalFinding: "Déficit de extensão de joelho.",
      activityRecommendation: "afastamento de atividades com impacto",
      recommendationDays: 7,
      includeDiagnosisCode: true,
      diagnosisOrCid: "CID S83.5",
      professionalName: "Dra. Camila",
      professionalCredential: "CREFITO-3/123456-F",
      issueDateLabel: "25 de novembro de 2026",
    })

    expect(withCid).toContain("CID S83.5")
    expect(withCid).toContain("Autorizo o registro e a divulgação")
  })

  it("builds Medical Referral Report with clinical KPIs and objective data", () => {
    const html = buildMedicalReferralReportPrintHtml({
      patientName: "Bruno Dias",
      recipientName: "Dr. Ricardo (Ortopedia)",
      chiefComplaint: "Dor em tendão patelar",
      initialPainLevel: 8,
      currentPainLevel: 3,
      sessionsCompleted: 10,
      romAndScalesSummary: "Flexão joelho 128°; LEFS = 68/80",
      conductSummary: "Analgesia e fortalecimento excêntrico.",
      clinicalOpinion: "Boa evolução; apto para retorno gradual ao esporte.",
      issueDateLabel: "25 de novembro de 2026",
    })

    expect(html).toContain("Relatório Fisioterapêutico")
    expect(html).toContain("Dr. Ricardo (Ortopedia)")
    expect(html).toContain("8/10")
    expect(html).toContain("3/10")
    expect(html).toContain("LEFS = 68/80")
  })

  it("builds Discharge Report with initial vs final comparison snapshot", () => {
    const discharge: PhysioDischargeRecord = {
      id: "d-1",
      clientId: "c-1",
      rehabPlanId: "p-1",
      initialAssessmentId: "a-1",
      finalAssessmentId: "a-2",
      dischargedAt: "2026-11-25T12:00:00.000Z",
      reason: "GOALS_MET",
      sessionsCompleted: 12,
      initialPainLevel: 8,
      finalPainLevel: 2,
      clinicalSummary: "Recuperação completa de ADM e retorno às AVDs.",
      recommendations: "Manter programa preventivo 2x/semana.",
      comparisonSnapshot: {
        initialPainLevel: 8,
        finalPainLevel: 2,
        painDelta: 6,
        sessionsCompleted: 12,
        romComparisons: [
          {
            joint: "Joelho",
            movement: "Flexão",
            side: "RIGHT",
            initialDeg: 105,
            finalDeg: 132,
            gainDeg: 27,
          },
        ],
        scaleComparisons: [
          {
            scaleType: "OSWESTRY",
            scoreUnit: "%",
            initialScore: 44,
            finalScore: 14,
            delta: -30,
            initialClassification: "Incapacidade intensa",
            finalClassification: "Incapacidade mínima",
          },
        ],
      },
      createdAt: "2026-11-25T12:00:00.000Z",
      updatedAt: "2026-11-25T12:00:00.000Z",
      rehabPlan: { id: "p-1", title: "Protocolo LCA" },
    }

    const html = buildPhysioDischargePrintHtml({
      patientName: "Marina Silva",
      discharge,
      professionalName: "Dra. Camila",
      professionalCredential: "CREFITO-3/123456-F",
      issueDateLabel: "25 de novembro de 2026",
    })

    expect(html).toContain("Relatório de Alta Fisioterapêutica")
    expect(html).toContain(PHYSIO_DISCHARGE_REASON_LABELS.GOALS_MET)
    expect(html).toContain("-6 pts")
    expect(html).toContain("Joelho · Flexão")
    expect(html).toContain("+27°")
    expect(html).toContain("OSWESTRY")
    expect(html).toContain("Manter programa preventivo")
  })
})

describe("physio management report print and CSV builders", () => {
  const report: PhysioManagementReport = {
    period: "90_DAYS",
    fromDate: "2026-08-27T00:00:00.000Z",
    toDate: "2026-11-25T23:59:59.000Z",
    counts: {
      activePatients: 14,
      archivedPatients: 3,
      completedSessions: 86,
      completedAppointments: 90,
      noShowCount: 4,
      cancelledCount: 6,
      attendanceRatePct: 95.6,
      noShowRatePct: 4.4,
      dischargesCount: 5,
      avgSessionsToDischarge: 10.4,
      avgPainReduction: 4.8,
      activePackagesCount: 6,
      expiringPackagesCount: 2,
    },
    dischargesByReason: {
      GOALS_MET: 3,
      PARTIAL_IMPROVEMENT: 2,
      MEDICAL_REFERRAL: 0,
      TREATMENT_ABANDONMENT: 0,
      PATIENT_REQUEST: 0,
    },
    items: [
      {
        clientId: "c-1",
        name: "=SUM(A1)",
        status: "ACTIVE",
        completedSessions: 9,
        noShowCount: 1,
        cancelledCount: 0,
        activePackageTitle: "Pacote 10 sessões",
        packageCompletedSessions: 9,
        packageTotalSessions: 10,
        latestDischargeReason: "GOALS_MET",
        dischargedAt: "2026-11-20T12:00:00.000Z",
      },
    ],
  }

  it("builds HTML report and protects CSV from formula injection", () => {
    const html = buildPhysioManagementReportPrintHtml({
      report,
      professionalName: "Dra. Camila",
      dateLabel: "25 de novembro de 2026",
    })
    expect(html).toContain("Relatório Gerencial de Reabilitação")
    expect(html).toContain("86")
    expect(html).toContain("-4.8")
    expect(html).toContain("Pacote 10 sessões (9/10)")

    const csv = buildPhysioManagementCsv(report)
    expect(csv).toContain(`"'=SUM(A1)"`)
    expect(csv).toContain(`"9/10"`)
    expect(csv).toContain(`"Objetivos terapêuticos atingidos"`)
  })
})
