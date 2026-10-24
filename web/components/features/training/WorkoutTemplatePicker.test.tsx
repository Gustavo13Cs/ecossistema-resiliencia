import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Periodization } from "@/types/workout-p3"
import { api } from "@/lib/api"
import { WorkoutDraftWorkspace } from "./WorkoutDraftWorkspace"
import { makeTestClient } from "@/test/client-fixture"
import { WorkoutTemplatePicker } from "./WorkoutTemplatePicker"
const auth = vi.hoisted(() => ({ user: { sub: "a", role: "PERSONAL" } }))
const push = vi.hoisted(() => vi.fn())
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
const template = { id: "t1", title: "PPL Base", isGlobal: true, goal: "STRENGTH", level: "BEGINNER", estimatedWeeks: 6, content: { title: "Base", splits: [{ name: "Treino A", weeklyFrequency: 2, exercises: [{ name: "Supino", sets: "3+2", reps: "8–12", rest: "90s", effortType: "RIR", effortTarget: "2", tempo: "3010", method: "STANDARD", secondaryMuscles: [] }] }] } }
describe("WorkoutTemplatePicker", () => {
  let http: AxiosMockAdapter
  let cache: QueryClient
  beforeEach(() => { Object.defineProperty(window, "navigation", { configurable: true, value: new EventTarget() }); auth.user = { sub: "a", role: "PERSONAL" }; push.mockReset(); http = new AxiosMockAdapter(api); cache = new QueryClient({ defaultOptions: { queries: { retry: false } } }); http.onGet("/workouts/templates").reply(200, { items: [template], nextCursor: null }); http.onGet("/workouts/templates/t1").reply(200, template) })
  afterEach(() => { cleanup(); cache.clear(); http.restore() })
  function ui() { return <QueryClientProvider client={cache}><WorkoutTemplatePicker open clientId="c1" onClose={vi.fn()} onAccessDenied={vi.fn()} /></QueryClientProvider> }
  it("opens from empty workspace and removes the entry once a local form starts", async () => {
    http.onGet("/clients/c1").reply(200, { ...makeTestClient("c1", "Aluno", "ACTIVE"), professionalId: "a" })
    http.onGet("/workouts/client/c1/active").reply(200, null)
    http.onGet("/workouts/drafts").reply(200, { items: [], nextCursor: null })
    render(<QueryClientProvider client={cache}><WorkoutDraftWorkspace clientId="c1" /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole("button", { name: "Começar a partir de modelo" }))
    expect(await screen.findByRole("dialog", { name: "Modelos de treino" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    fireEvent.click(screen.getByRole("button", { name: "Começar do zero" }))
    expect(screen.getByLabelText("Título da prescrição")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Começar a partir de modelo" })).not.toBeInTheDocument()
  })
  it("preserves an existing OPEN and never offers import over it", async () => {
    http.onGet("/clients/c1").reply(200, { ...makeTestClient("c1", "Aluno", "ACTIVE"), professionalId: "a" })
    http.onGet("/workouts/client/c1/active").reply(200, null)
    http.onGet("/workouts/drafts").reply(200, { items: [{ id: "open", clientId: "c1", status: "OPEN", title: "Existente", updatedAt: "2026-10-23", client: { id: "c1", name: "Aluno", status: "ACTIVE" } }], nextCursor: null })
    render(<QueryClientProvider client={cache}><WorkoutDraftWorkspace clientId="c1" /></QueryClientProvider>)
    expect(await screen.findByRole("heading", { name: "Já existe um rascunho aberto" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Começar a partir de modelo" })).not.toBeInTheDocument()
    expect(http.history.post).toHaveLength(0)
  })
  it("previews distinct phase names, types, intervals and effort without the clinical start date", async () => {
    const periodization: Periodization = {
      version: 1, startsOn: "2037-05-19", timeZone: "America/Sao_Paulo", progression: null,
      phases: [
        { name: "Base técnica", type: "ADAPTATION", startWeek: 1, endWeek: 2, effortType: "RIR", effortTarget: "3–4" },
        { name: "Força progressiva", type: "OVERLOAD", startWeek: 3, endWeek: 5, effortType: "RPE", effortTarget: "7-8" },
        { name: "Auge", type: "PEAK", startWeek: 6, endWeek: 7, effortType: "RIR", effortTarget: "1" },
        { name: "Recuperação", type: "DELOAD", startWeek: 8, endWeek: 8, effortType: null, effortTarget: "" },
      ],
    }
    http.onGet("/workouts/templates/t1").reply(200, { ...template, content: { ...template.content, periodization } })
    render(ui())
    fireEvent.click(await screen.findByRole("button", { name: "Pré-visualizar PPL Base" }))
    const phases = within(await screen.findByRole("region", { name: "Fases da periodização" })).getAllByRole("listitem")
    expect(phases).toHaveLength(4)
    expect(phases[0]).toHaveTextContent("Base técnica · Adaptação")
    expect(phases[0]).toHaveTextContent("Semanas 1 a 2 · Esforço: RIR 3–4")
    expect(phases[1]).toHaveTextContent("Força progressiva · Sobrecarga")
    expect(phases[1]).toHaveTextContent("Semanas 3 a 5 · Esforço: RPE 7-8")
    expect(phases[2]).toHaveTextContent("Auge · Pico")
    expect(phases[2]).toHaveTextContent("Semanas 6 a 7 · Esforço: RIR 1")
    expect(phases[3]).toHaveTextContent("Recuperação · Deload")
    expect(phases[3]).toHaveTextContent("Semanas 8 a 8 · Esforço: Não informado")
    expect(screen.getByText(/Fuso: America\/Sao_Paulo/)).toBeInTheDocument()
    expect(screen.getByRole("dialog")).not.toHaveTextContent("2037-05-19")
    expect(screen.getByRole("dialog")).not.toHaveTextContent("19/05/2037")
  })
  it("filters, previews structured prescription and imports without activation", async () => {
    http.onPost("/workouts/templates/t1/create-draft").reply(201, { id: "d1", clientId: "c1", status: "OPEN" })
    render(ui())
    fireEvent.change(screen.getByLabelText("Origem dos modelos"), { target: { value: "global" } })
    fireEvent.change(screen.getByLabelText("Objetivo do modelo"), { target: { value: "STRENGTH" } })
    fireEvent.change(screen.getByLabelText("Nível do modelo"), { target: { value: "BEGINNER" } })
    fireEvent.click(await screen.findByRole("button", { name: "Pré-visualizar PPL Base" }))
    expect(await screen.findByText("Supino")).toBeInTheDocument()
    expect(screen.getByText(/3\+2/)).toHaveTextContent("8–12")
    expect(screen.getByText(/2 vez/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Editar|Excluir/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Usar este modelo" }))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/clientes/c1/rascunhos/d1"))
    expect(http.history.post).toHaveLength(1)
    expect(http.history.get.some(r => r.params?.origin === "global" && r.params?.goal === "STRENGTH" && r.params?.level === "BEGINNER")).toBe(true)
  })
  it("offers verified OPEN recovery without navigating automatically", async () => {
    http.onPost(/create-draft/).reply(409, { code: "DRAFT_EXISTS", id: "existing", clientId: "c1" })
    http.onGet("/workouts/drafts/existing").reply(200, { id: "existing", clientId: "c1", status: "OPEN" })
    render(ui()); fireEvent.click(await screen.findByRole("button", { name: "Pré-visualizar PPL Base" })); fireEvent.click(await screen.findByRole("button", { name: "Usar este modelo" }))
    const recover = await screen.findByRole("button", { name: "Continuar rascunho" })
    expect(push).not.toHaveBeenCalled(); fireEvent.click(recover)
    expect(push).toHaveBeenCalledWith("/clientes/c1/rascunhos/existing")
  })
  it("retries list failures", async () => {
    http.onGet("/workouts/templates").reply(503)
    http.onGet("/workouts/templates").replyOnce(503)
    render(ui()); const retry = await screen.findByRole("button", { name: "Tentar novamente" }); http.onGet("/workouts/templates").reply(200, { items: [template], nextCursor: null }); fireEvent.click(retry)
    expect(await screen.findByRole("button", { name: "Pré-visualizar PPL Base" })).toBeInTheDocument()
  })
  it("clears private preview and ignores delayed import after account change", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onPost(/create-draft/).reply(() => new Promise(resolve => { finish = resolve }))
    const { rerender } = render(ui()); fireEvent.click(await screen.findByRole("button", { name: "Pré-visualizar PPL Base" })); fireEvent.click(await screen.findByRole("button", { name: "Usar este modelo" }))
    await waitFor(() => expect(http.history.post).toHaveLength(1))
    auth.user = { sub: "b", role: "PERSONAL" }; rerender(ui())
    expect(screen.queryByText("Supino")).not.toBeInTheDocument()
    await act(async () => { finish([201, { id: "d1", clientId: "c1", status: "OPEN" }]) })
    expect(push).not.toHaveBeenCalled()
  })
})
