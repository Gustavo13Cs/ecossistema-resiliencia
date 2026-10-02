import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useLabExams } from "./useLabExams"
import { useCentralLabExams } from "./useCentralLabExams"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => navigation }))
vi.mock("sonner", () => ({ toast: notices }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "professional-1", role: "NUTRITIONIST" } }) }))

describe("useLabExams Client contract", () => {
  let http: AxiosMockAdapter
  const body = { date: "2026-09-30", markers: [{ name: "Glicemia", value: 90, unit: "mg/dL" }] }
  const exam = { id: "exam-1", ...body }
  beforeEach(() => {
    vi.clearAllMocks(); http = new AxiosMockAdapter(api)
    http.onGet("/lab-exams/client/client-1").reply(200, [exam])
  })
  afterEach(() => { cleanup(); http.restore() })
  function setup() {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    return renderHook(({ id }) => useLabExams(id), { initialProps: { id: "client-1" }, wrapper })
  }
  it("loads the Client history and sends only Client identity when saving", async () => {
    http.onPost("/lab-exams").reply(201, { id: "exam-2" })
    const { result } = setup()
    await waitFor(() => expect(result.current.exams).toEqual([exam]))
    expect(result.current.chartData[0]).toMatchObject({ value: 90, unit: "mg/dL" })
    await act(() => result.current.saveExam(body))
    const payload: Record<string, unknown> = JSON.parse(http.history.post[0].data as string)
    expect(payload).toEqual({ ...body, clientId: "client-1" })
    expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1")
    expect(http.history.get.some(entry => entry.url?.includes("/user/"))).toBe(false)
  })
  it("does not mutate history or announce success on failure", async () => {
    http.onPost("/lab-exams").reply(503)
    const { result } = setup()
    await waitFor(() => expect(result.current.exams).toEqual([exam]))
    await act(() => result.current.saveExam(body))
    expect(result.current.exams).toEqual([exam])
    expect(notices.error).toHaveBeenCalled()
    expect(notices.success).not.toHaveBeenCalled()
    expect(navigation.push).not.toHaveBeenCalled()
  })
  it("clears another Client history and chart when switching", async () => {
    http.onGet("/lab-exams/client/client-2").reply(503)
    const { result, rerender } = setup()
    await waitFor(() => expect(result.current.exams).toEqual([exam]))
    rerender({ id: "client-2" })
    expect(result.current.exams).toEqual([])
    expect(result.current.chartData).toEqual([])
  })

  it("refreshes chart and central exams together through the same QueryClient after creation", async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    const client = { id: "client-1", name: "Synthetic Client" }
    const created = { id: "exam-2", ...body, clientId: client.id, client, createdAt: "2026-10-02T12:00:00.000Z" }
    let saved = false
    http.onGet("/clients").reply(200, [client])
    http.onGet("/lab-orders").reply(200, [])
    http.onGet("/lab-exams").reply(() => [200, saved ? [created] : []])
    http.onGet("/lab-exams/client/client-1").reply(() => [200, saved ? [exam, created] : [exam]])
    http.onPost("/lab-exams").reply(() => { saved = true; return [201, created] })
    const unrelatedKey = queryKeys.centralLabExams("another-professional")
    cache.setQueryData(unrelatedKey, [{ id: "unrelated-exam" }])

    const { result } = renderHook(() => ({ chart: useLabExams(client.id), central: useCentralLabExams() }), { wrapper })
    await waitFor(() => expect(result.current.central.loading).toBe(false))
    await waitFor(() => expect(result.current.chart.exams).toEqual([exam]))
    expect(result.current.central.rawExams).toEqual([])

    await act(() => result.current.chart.saveExam(body))

    await waitFor(() => expect(result.current.central.rawExams).toMatchObject([{ id: "exam-2", clientName: client.name }]))
    expect(result.current.chart.exams).toEqual([exam, created])
    expect(cache.getQueryData(queryKeys.centralLabExams("professional-1"))).toEqual([created])
    expect(cache.getQueryData(queryKeys.labExams("professional-1", client.id))).toEqual([exam, created])
    expect(http.history.get.filter(entry => entry.url === "/lab-exams")).toHaveLength(2)
    expect(http.history.get.filter(entry => entry.url === "/lab-exams/client/client-1")).toHaveLength(2)
    expect(cache.getQueryState(unrelatedKey)?.isInvalidated).toBe(false)
    expect(cache.getQueryData(unrelatedKey)).toEqual([{ id: "unrelated-exam" }])
    expect(notices.success).toHaveBeenCalledOnce()
    cache.clear()
  })
})
