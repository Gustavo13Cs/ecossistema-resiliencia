import { describe, expect, it } from "vitest"
import type { ConsolidatedLabExam, IssuedLabOrder } from "@/types/lab-exam"
import { buildLabExamPrintHtml, buildLabOrderPrintHtml } from "./lab-print-document"

const attacks = ['<script>alert(1)</script>', '<svg onload="alert(2)">', '</style><img src=x onerror=alert(3)>', 'quotes " & \' plus\nsecond line']
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html")
describe("escaped lab print documents", () => {
  it.each(attacks)("keeps all order fields as inert text: %s", attack => {
    const order: IssuedLabOrder = { id: "order", clientId: "client", clientName: attack, issuedAt: "2026-10-01", templateTitle: attack, markers: [attack], clinicalIndication: attack, preparationInstructions: attack }
    const document = parse(buildLabOrderPrintHtml(order, attack))
    expect(document.querySelector("script,svg,img,[onload],[onerror]")).toBeNull()
    expect(document.querySelectorAll("style")).toHaveLength(1)
    for (const selector of [".client-name", ".date", ".template", "ol li"]) expect(document.querySelector(selector)?.textContent).toBe(attack)
    for (const selector of [".indication", ".instructions"]) expect(document.querySelector(selector)?.textContent).toBe(attack.replace(/\r?\n/g, ""))
    expect(document.querySelector("title")?.textContent).toBe(`Pedido de Exames — ${attack}`)
  })
  it.each(attacks)("keeps all exam fields as inert text: %s", attack => {
    const exam: ConsolidatedLabExam = { id: "exam", clientId: "client", clientName: attack, date: "2026-10-01", createdAt: "2026-10-01", notes: attack, laboratoryName: attack, markers: [{ id: "marker", name: attack, value: 12, unit: attack, status: "OPTIMAL", reference: null }], hasAlerts: false }
    const document = parse(buildLabExamPrintHtml(exam, attack))
    expect(document.querySelector("script,svg,img,[onload],[onerror]")).toBeNull()
    for (const selector of [".client-name", ".date", ".laboratory", ".marker-name", ".marker-unit"]) expect(document.querySelector(selector)?.textContent).toBe(attack)
    expect(document.querySelector(".notes")?.textContent).toBe(attack.replace(/\r?\n/g, ""))
    expect(document.querySelector("title")?.textContent).toBe(`Exames Laboratoriais — ${attack}`)
  })
})
