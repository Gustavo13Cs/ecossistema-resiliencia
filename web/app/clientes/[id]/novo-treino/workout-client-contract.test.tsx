import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import NovoTreinoPage from "./page"
import TreinosHubPage from "@/app/treinos/page"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "client-1" }), useRouter: () => navigation }))
vi.mock("sonner", () => ({ toast: notices }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "professional-1", role: "PERSONAL" } }) }))

describe("workout Client contracts", () => {
  let http: AxiosMockAdapter
  beforeEach(() => {
    vi.clearAllMocks()
    http = new AxiosMockAdapter(api)
    http.onGet("/clients/client-1").reply(200, { id: "client-1", name: "Cliente de treino" })
    http.onGet("/workouts/client/client-1/active").reply(200, null)
    http.onGet("/clients").reply(200, [{ id: "client-1", name: "Cliente de treino", status: "ACTIVE" }])
    http.onGet("/workouts").reply(200, [{ id: "workout-1", clientId: "client-1", userId: "legacy-user", client: { name: "Cliente de treino" }, user: { name: "Legado" }, title: "Treino A", createdAt: "2026-09-30T12:00:00Z" }])
  })
  afterEach(() => { cleanup(); http.restore() })

  it("loads and saves a prescription using only the Client identifier", async () => {
    http.onPost("/workouts").reply(201, { id: "workout-1", clientId: "client-1" })
    render(<NovoTreinoPage />)
    await screen.findByText("Cliente de treino")
    fireEvent.click(screen.getByRole("button", { name: /finalizar ficha/i }))
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1"))
    const payload: Record<string, unknown> = JSON.parse(http.history.post[0].data as string)
    expect(payload.clientId).toBe("client-1")
    for (const field of ["userId", "patientId", "creatorId", "professionalId"]) expect(payload).not.toHaveProperty(field)
    expect(http.history.get.map(request => request.url)).toEqual(["/clients/client-1", "/workouts/client/client-1/active"])
  })

  it("keeps the editor open without success feedback when saving fails", async () => {
    http.onPost("/workouts").reply(503)
    render(<NovoTreinoPage />)
    await screen.findByText("Cliente de treino")
    fireEvent.click(screen.getByRole("button", { name: /finalizar ficha/i }))
    await waitFor(() => expect(notices.error).toHaveBeenCalled())
    expect(notices.success).not.toHaveBeenCalled()
    expect(navigation.push).not.toHaveBeenCalled()
  })

  it("opens a listed workout with clientId and uses the private Client directory", async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={cache}><TreinosHubPage /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole("button", { name: /abrir ficha/i }))
    expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1/novo-treino")
    expect(http.history.get.some(request => request.url === "/users")).toBe(false)
    expect(http.history.get.some(request => request.url === "/clients")).toBe(true)
  })
})
