import { describe, expect, it } from "vitest"
import { buildManagementReportPrintHtml, type ManagementPrintInput } from "./management-print-document"

const attacks = ['<script>alert(1)</script>', '<svg onload="alert(2)">', '</style><img src=x onerror=alert(3)>', 'quotes " & \' plus\nsecond line']
describe("escaped management report", () => {
  it.each(attacks)("escapes dynamic text and treats runtime numeric fields as untrusted: %s", attack => {
    const input: ManagementPrintInput = {
      period: attack, dateLabel: attack,
      retention: { retentionRatePercent: 80, churnRatePercent: 20, cohortData: [{ month: attack, activeRate: 50, retainedCount: 5 }] },
      dietAdherence: { averageAdherencePercent: 80, totalMealCheckIns: 10 },
      appointments: { totalAppointments: 10, weeklyAverage: 2 },
      growth: { totalActiveClients: 10, netNewClients: 2, goalDistribution: [{ label: attack, count: 10, percent: 100 }] },
    }
    // Respostas JSON não possuem validação de tipos em runtime.
    Object.assign(input.appointments, { weeklyAverage: attack })
    const html = buildManagementReportPrintHtml(input)
    const document = new DOMParser().parseFromString(html, "text/html")
    expect(document.querySelector("script,svg,img,[onload],[onerror]")).toBeNull()
    for (const selector of [".period", ".date", ".cohort-month", ".goal-label", ".weekly-average"]) expect(document.querySelector(selector)?.textContent).toBe(attack)
    expect(document.querySelectorAll("style")).toHaveLength(1)
  })
})
