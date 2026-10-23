import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { WorkoutDetail } from "@/types/workout"
import { WorkoutReadView } from "./WorkoutReadView"
import { SaveWorkoutTemplateDialog } from "./SaveWorkoutTemplateDialog"
const auth = vi.hoisted(() => ({ user: { sub: "a", role: "PERSONAL" } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
const workout = { id: "w1", clientId: "c1", isActive: true, finalizedAt: "2026-10-23", title: "Base", client: { id: "c1", name: "Private Client", status: "ACTIVE" }, splits: [{ id: "s1", name: "A", weeklyFrequency: 2, exercises: [{ id: "e1", name: "Remada", sets: "4", reps: "10", load: "50kg", notes: "Private notes" }] }] } as WorkoutDetail

describe("SaveWorkoutTemplateDialog", () => {
  let http: AxiosMockAdapter
  let cache: QueryClient
  const denied = vi.fn()
  beforeEach(() => { auth.user = { sub: "a", role: "PERSONAL" }; denied.mockReset(); http = new AxiosMockAdapter(api); cache = new QueryClient({ defaultOptions: { queries: { retry: false } } }) })
  afterEach(() => { cleanup(); cache.clear(); http.restore() })
  function ui(value = workout) { return <QueryClientProvider client={cache}><SaveWorkoutTemplateDialog open workout={value} onClose={vi.fn()} onAccessDenied={denied} /></QueryClientProvider> }
  function submit() {
    fireEvent.change(screen.getByLabelText("Nome do modelo"), { target: { value: "Meu modelo" } })
    fireEvent.change(screen.getByLabelText("Objetivo do modelo"), { target: { value: "STRENGTH" } })
    fireEvent.change(screen.getByLabelText("Nível do modelo"), { target: { value: "BEGINNER" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar modelo" }))
  }
  it("opens the save dialog from the finalized read view", async () => {
    http.onGet("/workouts/drafts").reply(200, { items: [], nextCursor: null })
    render(<QueryClientProvider client={cache}><WorkoutReadView workout={workout} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole("button", { name: "Salvar como modelo" }))
    expect(await screen.findByRole("dialog", { name: "Salvar modelo de treino" })).toBeInTheDocument()
  })
  it("previews included parameters and explains privacy exclusions before saving metadata", async () => {
    http.onPost("/workouts/templates/from-workout/w1").reply(201, { clientId: "c1", template: { id: "t1", isGlobal: false } })
    render(ui()); expect(screen.getByText("Remada")).toBeInTheDocument()
    expect(screen.getByText(/Não serão incluídos/)).toHaveTextContent(/cargas.*notas.*identidade.*data inicial/)
    expect(screen.queryByText("50kg")).not.toBeInTheDocument(); expect(screen.queryByText("Private notes")).not.toBeInTheDocument()
    submit(); expect(await screen.findByRole("status")).toHaveTextContent("Modelo salvo")
    expect(JSON.parse(http.history.post[0].data)).toEqual({ title: "Meu modelo", goal: "STRENGTH", level: "BEGINNER", description: "" })
  })
  it.each([{ ...workout, finalizedAt: null }, { ...workout, client: { ...workout.client, status: "ARCHIVED" } }])("blocks unsupported source %#", value => {
    render(ui(value as WorkoutDetail)); expect(screen.getByRole("button", { name: "Salvar modelo" })).toBeDisabled()
  })
  it("preserves metadata after a transient save failure and retries", async () => {
    http.onPost(/from-workout/).reply(503)
    render(ui()); submit()
    expect(await screen.findByRole("alert")).toHaveTextContent("campos foram preservados")
    expect(screen.getByLabelText("Nome do modelo")).toHaveValue("Meu modelo")
    http.onPost(/from-workout/).reply(201, { clientId: "c1", template: { id: "t1", isGlobal: false } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar modelo" }))
    expect(await screen.findByRole("status")).toHaveTextContent("Modelo salvo")
  })
  it("hides source and invokes denial handler after 403", async () => {
    http.onPost(/from-workout/).reply(403)
    render(ui()); submit(); await waitFor(() => expect(denied).toHaveBeenCalled())
    expect(screen.queryByText("Remada")).not.toBeInTheDocument()
  })
  it("resets form scope and ignores late success after switching account", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onPost(/from-workout/).reply(() => new Promise(resolve => { finish = resolve }))
    const { rerender } = render(ui()); submit(); await waitFor(() => expect(http.history.post).toHaveLength(1))
    auth.user = { sub: "b", role: "PERSONAL" }; rerender(ui())
    expect(screen.queryByLabelText("Nome do modelo")).not.toBeInTheDocument()
    expect(screen.queryByText("Remada")).not.toBeInTheDocument()
    await act(async () => { finish([201, { clientId: "c1", template: { id: "t1", isGlobal: false } }]) })
    expect(screen.queryByText("Modelo salvo")).not.toBeInTheDocument()
  })
})
