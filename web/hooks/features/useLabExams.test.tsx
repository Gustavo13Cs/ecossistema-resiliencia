import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { useLabExams } from "./useLabExams"

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
})
