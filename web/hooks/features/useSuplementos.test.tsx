import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { useSuplementos } from "./useSuplementos"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => navigation }))
vi.mock("sonner", () => ({ toast: notices }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "professional-1", role: "NUTRITIONIST" } }) }))

describe("useSuplementos Client contract", () => {
  let http: AxiosMockAdapter
  const item = { id: "item-1", name: "Suplemento", composition: "Fórmula", dosage: "1 dose", instructions: "Orientação" }
  beforeEach(() => {
    vi.clearAllMocks(); http = new AxiosMockAdapter(api)
    http.onGet("/clients/client-1").reply(200, { id: "client-1", name: "Cliente A" })
    http.onGet("/supplements/client/client-1/active").reply(200, { id: "plan-1", title: "Prescrição A", notes: "", items: [item] })
  })
  afterEach(() => { cleanup(); http.restore() })
  function setup() {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    return renderHook(({ id }) => useSuplementos(id), { initialProps: { id: "client-1" }, wrapper })
  }
  it("loads and saves only the selected Client prescription", async () => {
    http.onPost("/supplements").reply(201, { id: "new-plan" })
    const { result } = setup()
    await waitFor(() => expect(result.current.items).toEqual([item]))
    await act(() => result.current.savePlan())
    expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1")
    const payload: Record<string, unknown> = JSON.parse(http.history.post[0].data as string)
    expect(payload).toMatchObject({ clientId: "client-1", title: "Prescrição A", items: [{ name: "Suplemento", dosage: "1 dose" }] })
    for (const field of ["patientId", "userId", "creatorId", "professionalId"]) expect(payload).not.toHaveProperty(field)
    expect(http.history.get.some(entry => entry.url?.startsWith("/users"))).toBe(false)
  })
  it("does not present an invented prescription for an empty Client", async () => {
    http.onGet("/supplements/client/client-1/active").reply(200, null)
    const { result } = setup()
    await waitFor(() => expect(result.current.patientName).toBe("Cliente A"))
    expect(result.current.items).toEqual([])
    expect(result.current.planInfo.notes).toBe("")
  })
  it("keeps edits and avoids success feedback on save failure", async () => {
    http.onPost("/supplements").reply(503)
    const { result } = setup()
    await waitFor(() => expect(result.current.items).toEqual([item]))
    act(() => result.current.updateItem("item-1", "dosage", "2 doses"))
    await act(() => result.current.savePlan())
    expect(notices.error).toHaveBeenCalled()
    expect(notices.success).not.toHaveBeenCalled()
    expect(navigation.push).not.toHaveBeenCalled()
    expect(result.current.items[0].dosage).toBe("2 doses")
  })
  it("hides the prior Client draft after a switch", async () => {
    http.onGet("/clients/client-2").reply(503)
    http.onGet("/supplements/client/client-2/active").reply(503)
    const { result, rerender } = setup()
    await waitFor(() => expect(result.current.items).toEqual([item]))
    rerender({ id: "client-2" })
    expect(result.current.items).toEqual([])
    expect(result.current.patientName).not.toBe("Cliente A")
  })
})
