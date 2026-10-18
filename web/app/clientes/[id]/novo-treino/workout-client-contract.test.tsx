import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import NovoTreinoPage from "./page"
import TreinosHubPage from "@/app/treinos/page"

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "client-1" }), useRouter: () => navigation }))
vi.mock("sonner", () => ({ toast: notices }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "professional-1", role: "PERSONAL" } }) }))

function renderWithQuery(ui: React.ReactNode) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  return render(<QueryClientProvider client={cache}>{ui}</QueryClientProvider>)
}

async function fillRequiredPrescriptionFields() {
  fireEvent.change(await screen.findByLabelText("Título da prescrição"), { target: { value: "Força Base" } })
  fireEvent.click(screen.getByRole("button", { name: "Adicionar exercício" }))
  fireEvent.change(screen.getByLabelText("Nome do exercício"), { target: { value: "Agachamento Livre" } })
  fireEvent.change(screen.getByLabelText("Séries"), { target: { value: "4" } })
  fireEvent.change(screen.getByLabelText("Repetições"), { target: { value: "8" } })
}

describe("workout Client contracts", () => {
  let http: AxiosMockAdapter
  beforeEach(() => {
  vi.stubGlobal("navigation", Object.assign(new EventTarget(), { traverseTo: vi.fn() }))
    vi.clearAllMocks()
    http = new AxiosMockAdapter(api)
    http.onGet("/workouts/drafts").reply(200, { items: [], nextCursor: null })
    http.onGet("/clients/client-1").reply(200, { professionalId: "professional-1", id: "client-1", name: "Cliente de treino", status: "ACTIVE" })
    http.onGet("/workouts/client/client-1/active").reply(200, null)
    http.onGet("/clients").reply(200, [{ id: "client-1", name: "Cliente de treino", status: "ACTIVE" }])
    http.onGet("/workouts").reply(200, [
      {
        id: "workout-1",
        clientId: "client-1",
        client: { id: "client-1", name: "Cliente de treino", status: "ACTIVE" },
        title: "Treino A",
        goal: "Força",
        createdAt: "2026-09-30T12:00:00Z",
        updatedAt: "2026-09-30T12:00:00Z",
        isActive: true,
        isTemplate: false,
      },
    ])
  })
  afterEach(() => {
    cleanup()
    http.restore()
  })

  it("loads and saves a draft using only the owned Client identifier", async () => {
    http.onPost("/workouts/drafts").reply(config => [201, { id: "draft-1", clientId: "client-1", status: "OPEN", version: 1, content: JSON.parse(config.data).content, updatedAt: "2026-10-17T12:00:00Z" }])
    renderWithQuery(<NovoTreinoPage />)
    await screen.findByText("Cliente de treino")
    fireEvent.click(await screen.findByRole("button", { name: "Começar do zero" }))
    await fillRequiredPrescriptionFields()
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }))
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/clientes/client-1/rascunhos/draft-1"))
    const payload: Record<string, unknown> = JSON.parse(http.history.post[0].data as string)
    expect(payload.clientId).toBe("client-1")
    for (const field of ["userId", "patientId", "creatorId", "professionalId"]) expect(payload).not.toHaveProperty(field)
    expect(new Set(http.history.get.map(request => request.url))).toEqual(
      new Set(["/clients/client-1", "/workouts/client/client-1/active", "/workouts/drafts"]),
    )
  })

  it("keeps the editor open without success feedback when saving fails", async () => {
    http.onPost("/workouts/drafts").reply(503)
    renderWithQuery(<NovoTreinoPage />)
    await screen.findByText("Cliente de treino")
    fireEvent.click(await screen.findByRole("button", { name: "Começar do zero" }))
    await fillRequiredPrescriptionFields()
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível concluir")
    expect(notices.success).not.toHaveBeenCalled()
    expect(navigation.push).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue("Força Base")).toBeVisible()
  })

  it("opens a listed workout by its id and uses the private Client directory only when selecting a student", async () => {
    renderWithQuery(<TreinosHubPage />)
    fireEvent.click(await screen.findByRole("button", { name: /abrir ficha/i }))
    expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1/treinos/workout-1")
    expect(http.history.get.some(request => request.url === "/clients")).toBe(false)

    fireEvent.click(screen.getByRole("button", { name: "Nova prescrição" }))
    fireEvent.click(await screen.findByRole("button", { name: "Selecionar Cliente de treino" }))
    expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1/novo-treino")
    expect(http.history.get.some(request => request.url === "/users")).toBe(false)
    expect(http.history.get.some(request => request.url === "/clients")).toBe(true)
  })
})

afterEach(() => vi.unstubAllGlobals())
