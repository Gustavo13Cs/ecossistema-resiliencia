import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { createElement, type ReactNode } from "react"
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest"
import { api } from "@/lib/api"
import type { AuthUser } from "@/types/auth"
import type { Client } from "@/types/client"
import { useCentralLabExams } from "./useCentralLabExams"
import {
  evaluateMarkerValue,

  LAB_ORDER_TEMPLATES,


} from "@/types/lab-exam"

const session = vi.hoisted(() => ({ user: null as AuthUser | null }))
const clientState = vi.hoisted(() => ({ data: [] as Client[] }))
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => session }))
vi.mock("@/hooks/features/useClients", () => ({ useClients: () => ({ data: clientState.data, isLoading: false, error: null }) }))
vi.mock("sonner", () => ({ toast: notices }))
const http = new AxiosMockAdapter(api)
const ownClient = { id: "client-a", name: "Synthetic Client" }
const exam = { id: "server-exam", clientId: ownClient.id, client: ownClient, date: "2026-10-01T00:00:00.000Z", notes: "Synthetic note", createdAt: "2026-10-01T12:00:00.000Z", markers: [{ id: "server-marker", name: "Glicemia de Jejum", value: 105, unit: "mg/dL" }] }
const order = { id: "server-order", clientId: ownClient.id, client: ownClient, title: "Synthetic title", issuedAt: "2026-10-01T12:00:00.000Z", markers: ["Glicemia de Jejum"], clinicalIndication: "Synthetic indication", preparationInstructions: "Synthetic instructions" }
const examInput = { clientId: ownClient.id, date: "2026-10-01", notes: "Synthetic note", markers: [{ name: "Glicemia de Jejum", value: 105, unit: "mg/dL" }] }
const orderInput = { clientId: ownClient.id, templateTitle: "Synthetic title", markers: ["Glicemia de Jejum"], clinicalIndication: "Synthetic indication", preparationInstructions: "Synthetic instructions" }
function setup() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: cache }, children)
  return { cache, ...renderHook(() => useCentralLabExams(), { wrapper }) }
}
beforeEach(() => {
  vi.clearAllMocks()
  session.user = { sub: "professional-a", role: "NUTRITIONIST", name: "Synthetic professional" }
  clientState.data = [ownClient as Client]
  http.reset()
  http.onGet("/lab-exams").reply(200, [])
  http.onGet("/lab-orders").reply(200, [])
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe("server-only central labs", () => {
  it("does not seed an empty API or read/write storage and makes one aggregate request per resource", async () => {
    const reads = vi.spyOn(Storage.prototype, "getItem")
    const writes = vi.spyOn(Storage.prototype, "setItem")
    const { result } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rawExams).toEqual([])
    expect(result.current.orders).toEqual([])
    expect(http.history.get.map(request => request.url).sort()).toEqual(["/lab-exams", "/lab-orders"])
    expect(reads).not.toHaveBeenCalled()
    expect(writes).not.toHaveBeenCalled()
  })
  it("enriches persisted markers and KPIs without inventing an attachment or laboratory", async () => {
    http.onGet("/lab-exams").reply(200, [exam])
    http.onGet("/lab-orders").reply(200, [order])
    const { result } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rawExams[0]).toMatchObject({ id: exam.id, clientId: ownClient.id, clientName: ownClient.name, markers: [{ id: "server-marker", status: "ALERT" }] })
    expect(result.current.rawExams[0].laboratoryName).toBeUndefined()
    expect(result.current.rawExams[0].pdfAttachment).toBeFalsy()
    expect(result.current.kpis).toMatchObject({ totalExams: 1, alteredMarkersCount: 1, clientsCoveragePercent: 100, ordersIssuedCount: 1 })
    expect(result.current.getMarkerLongitudinalSeries("Glicemia de Jejum", ownClient.id)).toHaveLength(1)
  })
  it("uses server IDs and names, sends only accepted fields, and refetches persisted data", async () => {
    let exams: unknown[] = [], orders: unknown[] = []
    http.onGet("/lab-exams").reply(() => [200, exams])
    http.onGet("/lab-orders").reply(() => [200, orders])
    http.onPost("/lab-exams").reply(() => { exams = [exam]; return [201, exam] })
    http.onPost("/lab-orders").reply(() => { orders = [order]; return [201, order] })
    const { result } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    const untrustedExam = { ...examInput, patientId: "foreign", clientName: "Forged", laboratoryName: "Forged", pdfAttachment: { name: "fake.pdf" } }
    const untrustedOrder = { ...orderInput, professionalId: "foreign", clientName: "Forged" }
    await act(async () => {
      expect(await result.current.registerExam(untrustedExam)).toMatchObject({ id: exam.id, clientName: ownClient.name })
      expect(await result.current.issueOrder(untrustedOrder)).toMatchObject({ id: order.id, clientName: ownClient.name })
    })
    const bodyExam: Record<string, unknown> = JSON.parse(http.history.post[0].data as string)
    const bodyOrder: Record<string, unknown> = JSON.parse(http.history.post[1].data as string)
    expect(bodyExam).toEqual({ ...examInput, date: "2026-10-01T00:00:00.000Z" })
    expect(bodyOrder).toEqual({ clientId: ownClient.id, title: orderInput.templateTitle, markers: orderInput.markers, clinicalIndication: orderInput.clinicalIndication, preparationInstructions: orderInput.preparationInstructions })
    await waitFor(() => expect(result.current.rawExams[0]?.id).toBe(exam.id))
    expect(result.current.orders[0]?.id).toBe(order.id)
  })
  it("preserves server data and never reports success for failed create or delete", async () => {
    http.onGet("/lab-exams").reply(200, [exam])
    http.onGet("/lab-orders").reply(200, [order])
    http.onPost("/lab-exams").reply(500)
    http.onPost("/lab-orders").reply(500)
    http.onDelete(`/lab-exams/${exam.id}`).reply(500)
    http.onDelete(`/lab-orders/${order.id}`).reply(500)
    const { result } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await expect(result.current.registerExam(examInput)).rejects.toThrow()
      await expect(result.current.issueOrder(orderInput)).rejects.toThrow()
      await expect(result.current.deleteExam(exam.id)).rejects.toThrow()
      await expect(result.current.deleteOrder(order.id)).rejects.toThrow()
    })
    expect(result.current.rawExams.map(row => row.id)).toEqual([exam.id])
    expect(result.current.orders.map(row => row.id)).toEqual([order.id])
    expect(notices.success).not.toHaveBeenCalled()
    expect(notices.error).toHaveBeenCalledTimes(4)
  })
  it("surfaces a query failure instead of presenting an empty successful response", async () => {
    http.onGet("/lab-orders").reply(500)
    const { result } = setup()
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(notices.success).not.toHaveBeenCalled()
  })
  it("never displays another session's cached exams or orders during an account switch", async () => {
    http.onGet("/lab-exams").replyOnce(200, [exam])
    http.onGet("/lab-orders").replyOnce(200, [order])
    const { result, rerender } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    session.user = { sub: "professional-b", role: "NUTRITIONIST", name: "Other professional" }
    clientState.data = [{ id: "client-b", name: "Other Client" } as Client]
    rerender()
    expect(result.current.rawExams).toEqual([])
    expect(result.current.orders).toEqual([])
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rawExams).toEqual([])
    expect(result.current.orders).toEqual([])
  })
})

describe("Central de Exames Laboratoriais - Regras Clínicas e Cálculos", () => {
  describe("Avaliação de Biomarcadores com Referências Clínicas (SBPC/ML)", () => {
    it("avalia Glicemia de Jejum corretamente nos intervalos ótimo, limítrofe e alerta", () => {
      expect(evaluateMarkerValue("Glicemia de Jejum", 82)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("Glicemia de Jejum", 94)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("Glicemia de Jejum", 115)).toBe("ALERT")
      expect(evaluateMarkerValue("Glicemia de Jejum", 65)).toBe("ALERT") // hipoglicemia
    })

    it("avalia Hemoglobina Glicada (HbA1c) identificando faixa de pré-diabetes como alerta", () => {
      expect(evaluateMarkerValue("Hemoglobina Glicada (HbA1c)", 5.0)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("Hemoglobina Glicada (HbA1c)", 5.5)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("Hemoglobina Glicada (HbA1c)", 6.2)).toBe("ALERT")
    })

    it("avalia Triglicerídeos e Perfil Lipídico", () => {
      expect(evaluateMarkerValue("Triglicerídeos", 85)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("Triglicerídeos", 130)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("Triglicerídeos", 190)).toBe("ALERT")
    })

    it("avalia HDL Colesterol considerando valores baixos como alerta cardiovascular", () => {
      expect(evaluateMarkerValue("HDL Colesterol", 65)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("HDL Colesterol", 48)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("HDL Colesterol", 35)).toBe("ALERT")
    })

    it("avalia 25-OH Vitamina D para suficiência óssea e imunológica", () => {
      expect(evaluateMarkerValue("25-OH Vitamina D", 40)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("25-OH Vitamina D", 25)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("25-OH Vitamina D", 15)).toBe("ALERT") // deficiência
    })

    it("avalia TSH Ultra Sensível dentro da faixa eutireoidiana ideal", () => {
      expect(evaluateMarkerValue("TSH Ultra Sensível", 1.8)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("TSH Ultra Sensível", 3.5)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("TSH Ultra Sensível", 6.0)).toBe("ALERT")
    })
  })

  describe("Templates de Pedidos de Exames Padronizados", () => {
    it("fornece protocolos clínicos padronizados bem definidos", () => {
      expect(LAB_ORDER_TEMPLATES.length).toBeGreaterThanOrEqual(4)
      const ids = LAB_ORDER_TEMPLATES.map((t: { id: string }) => t.id)
      expect(ids).toContain("routine_metabolic")
      expect(ids).toContain("weight_loss_resistance")
      expect(ids).toContain("hypertrophy_performance")
      expect(ids).toContain("thyroid_immunity")
    })

    it("cada template possui lista de biomarcadores sugeridos não-vazia", () => {
      LAB_ORDER_TEMPLATES.forEach((tmpl: { suggestedMarkers: string[]; title: string; description: string }) => {
        expect(tmpl.suggestedMarkers.length).toBeGreaterThan(0)
        expect(tmpl.title).toBeDefined()
        expect(tmpl.description).toBeDefined()
      })
    })
  })

})
