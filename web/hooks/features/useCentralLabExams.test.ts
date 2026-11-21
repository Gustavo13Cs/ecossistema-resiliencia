import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { createElement, type ReactNode } from "react"
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
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
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
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
  it("invalidates central and client-scoped exam queries in parallel on registerExam without affecting another session", async () => {
    http.onGet("/lab-exams").reply(200, [exam])
    http.onGet("/lab-orders").reply(200, [order])
    http.onGet(`/lab-exams/client/${ownClient.id}`).reply(200, [exam])
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: cache }, children)
    const { result } = renderHook(
      () => ({
        central: useCentralLabExams(),
        clientHistory: useQuery({
          queryKey: queryKeys.labExams("professional-a", ownClient.id),
          queryFn: async () => (await api.get(`/lab-exams/client/${ownClient.id}`)).data,
        }),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.central.loading).toBe(false))
    await waitFor(() => expect(result.current.clientHistory.isPending).toBe(false))

    const unrelatedCentralKey = queryKeys.centralLabExams("professional-b")
    const unrelatedClientKey = queryKeys.labExams("professional-b", ownClient.id)
    cache.setQueryData(unrelatedCentralKey, [{ id: "unrelated-exam" }])
    cache.setQueryData(unrelatedClientKey, [{ id: "unrelated-client-exam" }])

    const centralRefetch = deferred<unknown[]>()
    const clientRefetch = deferred<unknown[]>()
    let centralRefetchStarted = false
    let clientRefetchStarted = false
    http.onPost("/lab-exams").reply(201, exam)
    http.onGet("/lab-exams").reply(async () => {
      centralRefetchStarted = true
      return [200, await centralRefetch.promise]
    })
    http.onGet(`/lab-exams/client/${ownClient.id}`).reply(async () => {
      clientRefetchStarted = true
      return [200, await clientRefetch.promise]
    })

    let mutationPromise!: Promise<unknown>
    act(() => {
      mutationPromise = result.current.central.registerExam(examInput)
    })

    await waitFor(() => {
      expect(centralRefetchStarted).toBe(true)
      expect(clientRefetchStarted).toBe(true)
    })
    expect(notices.success).not.toHaveBeenCalled()

    clientRefetch.resolve([exam])
    centralRefetch.resolve([exam])
    await act(async () => {
      await mutationPromise
    })

    expect(notices.success).toHaveBeenCalledOnce()
    expect(cache.getQueryState(unrelatedCentralKey)?.isInvalidated).toBe(false)
    expect(cache.getQueryState(unrelatedClientKey)?.isInvalidated).toBe(false)
    cache.clear()
  })
  it("invalidates central and client-scoped exam queries in parallel on deleteExam without affecting another session", async () => {
    http.onGet("/lab-exams").reply(200, [exam])
    http.onGet("/lab-orders").reply(200, [order])
    http.onGet(`/lab-exams/client/${ownClient.id}`).reply(200, [exam])
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: cache }, children)
    const { result } = renderHook(
      () => ({
        central: useCentralLabExams(),
        clientHistory: useQuery({
          queryKey: queryKeys.labExams("professional-a", ownClient.id),
          queryFn: async () => (await api.get(`/lab-exams/client/${ownClient.id}`)).data,
        }),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.central.loading).toBe(false))
    await waitFor(() => expect(result.current.clientHistory.isPending).toBe(false))

    const unrelatedCentralKey = queryKeys.centralLabExams("professional-b")
    const unrelatedClientKey = queryKeys.labExams("professional-b", ownClient.id)
    cache.setQueryData(unrelatedCentralKey, [{ id: "unrelated-exam" }])
    cache.setQueryData(unrelatedClientKey, [{ id: "unrelated-client-exam" }])

    const centralRefetch = deferred<unknown[]>()
    const clientRefetch = deferred<unknown[]>()
    let centralRefetchStarted = false
    let clientRefetchStarted = false
    http.onDelete(`/lab-exams/${exam.id}`).reply(200, { deleted: true })
    http.onGet("/lab-exams").reply(async () => {
      centralRefetchStarted = true
      return [200, await centralRefetch.promise]
    })
    http.onGet(`/lab-exams/client/${ownClient.id}`).reply(async () => {
      clientRefetchStarted = true
      return [200, await clientRefetch.promise]
    })

    let mutationPromise!: Promise<unknown>
    act(() => {
      mutationPromise = result.current.central.deleteExam(exam.id)
    })

    await waitFor(() => {
      expect(centralRefetchStarted).toBe(true)
      expect(clientRefetchStarted).toBe(true)
    })
    expect(notices.success).not.toHaveBeenCalled()

    clientRefetch.resolve([])
    centralRefetch.resolve([])
    await act(async () => {
      await mutationPromise
    })

    expect(notices.success).toHaveBeenCalledOnce()
    expect(cache.getQueryState(unrelatedCentralKey)?.isInvalidated).toBe(false)
    expect(cache.getQueryState(unrelatedClientKey)?.isInvalidated).toBe(false)
    cache.clear()
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

it("uses global totals and marker names while navigating and filtering limited exams", async () => {
  http.onGet("/lab-exams").reply(config => [200,{items:[{...exam,id:`exam-${config.params.page}`}],pagination:{page:config.params.page,pageSize:25,total:50,pageCount:2},summary:{totalExams:600,clientsWithExamsCount:50,alteredMarkersCount:400,ordersIssuedCount:60},markerNames:["Marcador fora desta página"]}])
  http.onGet("/lab-orders").reply(200,[order],{"X-Pagination-Total":"60"})
  const {result}=setup()
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.exams).toHaveLength(1)
  expect(result.current.kpis).toMatchObject({totalExams:600,alteredMarkersCount:400,ordersIssuedCount:60})
  expect(result.current.allAvailableMarkers).toContain("Marcador fora desta página")
  act(() => result.current.setExamPage(2))
  await waitFor(() => expect(result.current.exams[0]?.id).toBe("exam-2"))
  act(() => {result.current.setStatusFilter("ALERT");result.current.setCategoryFilter("VITAMINS_MINERALS")})
  await waitFor(() => expect(result.current.exams[0]?.id).toBe("exam-1"))
  expect(http.history.get.filter(row => row.url === "/lab-exams").at(-1)?.params).toMatchObject({page:1,status:"ALERT",category:"VITAMINS_MINERALS"})
  expect(result.current.kpis.totalExams).toBe(600)
})
