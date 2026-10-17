import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { makeTestClient } from "@/test/client-fixture"
import { PersonalClientRecord } from "./PersonalClientRecord"

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "personal", role: "PERSONAL" } }) }))
const http = new AxiosMockAdapter(api)
const assessment = { id: "a1", clientId: "c1", userId: null, date: "2026-10-14T12:00:00Z", weight: null, bodyFat: null, muscleMass: 29, waist: 80, abdomen: null, hips: null, thorax: null, armLeft: null, armRight: null, thighLeft: null, thighRight: null, calfLeft: null, calfRight: null, skinfoldTriceps: 12, skinfoldSubscapular: null, skinfoldChest: null, skinfoldAxillary: null, skinfoldSuprailiac: null, skinfoldAbdominal: null, skinfoldThigh: null, benchPress1RM: null, squat1RM: 80, deadlift1RM: null, vo2Max: 40, notes: "Força registrada", createdAt: "2026-10-14T12:00:00Z", updatedAt: "2026-10-14T12:00:00Z" }
const overview = { client: { id: "c1", status: "ACTIVE" }, activeWorkout: { id: "w1", clientId: "c1", title: "Treino de força", goal: "Fortalecer", durationWeeks: 8, createdAt: "2026-10-14T12:00:00Z", updatedAt: "2026-10-14T12:00:00Z", isActive: true }, recentAssessments: [assessment] }
function mount(archived = false) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  return { cache, ...render(<QueryClientProvider client={cache}><PersonalClientRecord client={makeTestClient("c1", "Marina", archived ? "ARCHIVED" : "ACTIVE")} pending={false} /></QueryClientProvider>) }
}
beforeEach(() => {
  http.reset()
  http.onGet("/workouts/client/c1/overview").reply(200, overview)
  http.onGet("/assessments/client/c1").reply(200, [assessment, { ...assessment, id: "a2", squat1RM: 70, date: "2026-09-14T12:00:00Z" }])
})
afterEach(cleanup)
it("does_not_query_other_domains", async () => {
  mount()
  expect(await screen.findByText("Treino de força")).toBeVisible()
  expect(http.history.get.map(request => request.url).sort()).toEqual(["/assessments/client/c1", "/workouts/client/c1/overview"])
  expect(screen.queryByText(/em migração/i)).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Ver ficha" })).toHaveAttribute("href", "/clientes/c1/treinos/w1")
  expect(screen.getByRole("link", { name: "Criar prescrição" })).toHaveAttribute("href", "/clientes/c1/novo-treino")
})
it("archived_record_is_readable_without_creation", async () => {
  mount(true)
  expect(await screen.findByText("Treino de força")).toBeVisible()
  expect(screen.getByRole("button", { name: "Nova avaliação física" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Criar prescrição" })).toBeDisabled()
  expect(screen.getByRole("link", { name: "Ver ficha" })).toBeVisible()
  expect(screen.getByRole("link", { name: "Abrir agenda" })).toHaveAttribute("href", "/agenda")
})
it("preserves_complete_history_with_known_and_unknown_units", async () => {
  mount()
  const history = await screen.findByRole("region", { name: "Avaliações registradas" })
  expect(await within(history).findAllByText(/unidade não registrada/)).toHaveLength(4)
  expect(within(history).getAllByText("80 kg")).toHaveLength(1)
  expect(within(history).getAllByText("70 kg")).toHaveLength(1)
  expect(within(history).getAllByText("12 mm")).toHaveLength(2)
  expect(within(history).getAllByText("80 cm")).toHaveLength(2)
  expect(within(history).getAllByText("Força registrada")).toHaveLength(2)
})
it("isolates_an_overview_error_from_successful_assessment_history", async () => {
  http.onGet("/workouts/client/c1/overview").reply(503)
  mount()
  expect(await screen.findByText("Resumo de treinamento indisponível")).toBeVisible()
  expect(await screen.findByRole("region", { name: "Avaliações registradas" })).toHaveTextContent("Força registrada")
  expect(screen.queryByText("Nenhum treino ativo registrado")).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Tentar novamente o resumo" })).toBeEnabled()
})
it.each([401, 403])("removes_all_usable_content_after_assessment_denial_%s", async status => {
  const { cache } = mount()
  await screen.findByText("Treino de força")
  http.onGet("/auth/csrf").reply(401)
  http.onGet("/assessments/client/c1").reply(status)
  await act(async () => { await cache.invalidateQueries({ queryKey: queryKeys.assessments("personal", "c1") }) })
  expect(await screen.findByText("Restabeleça seu acesso")).toBeVisible()
  expect(screen.queryByText("Treino de força")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Nova avaliação física" })).not.toBeInTheDocument()
})
it("propagates_dialog_denial_and_removes_record_content", async () => {
  const user = userEvent.setup()
  http.onPost("/assessments").reply(403)
  mount()
  await screen.findByText("Treino de força")
  await user.click(screen.getByRole("button", { name: "Nova avaliação física" }))
  await user.type(screen.getByLabelText("Agachamento 1RM informado (kg)"), "80")
  await user.click(screen.getByRole("button", { name: "Salvar avaliação física" }))
  expect(await screen.findByText("Restabeleça seu acesso")).toBeVisible()
  expect(screen.queryByText("Treino de força")).not.toBeInTheDocument()
})

it("refreshes assessment history after a pending dialog save", async () => {
  const user = userEvent.setup()
  let completeSave!: (response: [number, unknown]) => void
  const created = { ...assessment, id: "a3", squat1RM: 95, notes: "Avaliação recém-salva" }
  http.onPost("/assessments").reply(() => new Promise(resolve => { completeSave = resolve }))
  mount()
  await screen.findByText("Treino de força")
  await user.click(screen.getByRole("button", { name: "Nova avaliação física" }))
  await user.type(screen.getByLabelText("Agachamento 1RM informado (kg)"), "95")
  await user.click(screen.getByRole("button", { name: "Salvar avaliação física" }))
  await screen.findByRole("button", { name: "Salvando avaliação..." })
  await waitFor(() => expect(completeSave).toBeTypeOf("function"))
  http.onGet("/assessments/client/c1").reply(200, [created, assessment])
  await act(async () => { completeSave([201, created]) })
  const history = screen.getByRole("region", { name: "Avaliações registradas" })
  expect(await within(history).findByText("Avaliação recém-salva")).toBeInTheDocument()
  expect(within(history).getByText("95 kg")).toBeInTheDocument()
  expect(screen.queryByText("Avaliações indisponíveis")).not.toBeInTheDocument()
  expect(http.history.get.filter(request => request.url === "/assessments/client/c1")).toHaveLength(2)
})
