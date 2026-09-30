import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import NovaReabilitacaoPage from "./page"
import ReabilitacaoPage from "@/app/reabilitacao/page"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "client-1" }), useRouter: () => navigation }))
vi.mock("sonner", () => ({ toast: notices }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "professional-1", role: "PHYSIO" } }) }))

describe("rehab Client contracts", () => {
  let http: AxiosMockAdapter
  beforeEach(() => {
    vi.clearAllMocks()
    http = new AxiosMockAdapter(api)
    http.onGet("/clients/client-1").reply(200, { id: "client-1", name: "Cliente de reabilitação" })
    http.onGet("/rehab-plans/client/client-1/active").reply(200, null)
    http.onGet("/clients").reply(200, [{ id: "client-1", name: "Cliente de reabilitação", status: "ACTIVE" }])
    http.onGet("/rehab-plans").reply(200, [{ id: "rehab-1", clientId: "client-1", userId: "legacy-user", client: { name: "Cliente de reabilitação" }, user: { name: "Legado" }, title: "Treino A", createdAt: "2026-09-30T12:00:00Z" }])
  })
  afterEach(() => { cleanup(); http.restore() })

  it("loads and saves a prescription using only the Client identifier", async () => {
    http.onPost("/rehab-plans").reply(201, { id: "rehab-1", clientId: "client-1" })
    render(<NovaReabilitacaoPage />)
    await screen.findByText("Cliente de reabilitação")
    fireEvent.click(screen.getByRole("button", { name: /finalizar protocolo/i }))
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1"))
    const payload: Record<string, unknown> = JSON.parse(http.history.post[0].data as string)
    expect(payload.clientId).toBe("client-1")
    for (const field of ["userId", "patientId", "creatorId", "professionalId"]) expect(payload).not.toHaveProperty(field)
    expect(http.history.get.map(request => request.url)).toEqual(["/clients/client-1", "/rehab-plans/client/client-1/active"])
  })

  it("keeps the editor open without success feedback when saving fails", async () => {
    http.onPost("/rehab-plans").reply(503)
    render(<NovaReabilitacaoPage />)
    await screen.findByText("Cliente de reabilitação")
    fireEvent.click(screen.getByRole("button", { name: /finalizar protocolo/i }))
    await waitFor(() => expect(notices.error).toHaveBeenCalled())
    expect(notices.success).not.toHaveBeenCalled()
    expect(navigation.push).not.toHaveBeenCalled()
  })

  it("queries the selected Client instead of the signed-in professional", async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={cache}><ReabilitacaoPage /></QueryClientProvider>)
    await screen.findByRole("option", { name: "Cliente de reabilitação" })
    expect(http.history.get.some(request => request.url?.includes("/active"))).toBe(false)
    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "client-1" } })
    await waitFor(() => expect(http.history.get.some(request => request.url === "/rehab-plans/client/client-1/active")).toBe(true))
    expect(http.history.get.some(request => request.url?.includes("professional-1"))).toBe(false)
    expect(screen.getByRole("link", { name: /prescrever protocolo/i })).toHaveAttribute("href", "/clientes/client-1/nova-reabilitacao")
  })
})
