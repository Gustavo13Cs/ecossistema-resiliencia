import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { makeTestClient } from "@/test/client-fixture"
import NovoTreinoPage from "@/app/clientes/[id]/novo-treino/page"
import DraftPage from "@/app/clientes/[id]/rascunhos/[draftId]/page"
import TreinosHubPage from "@/app/treinos/page"
import * as editorNavigation from "@/lib/workout-editor-navigation"
import { queryKeys } from "@/lib/query-keys"

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
const auth = vi.hoisted(() => ({ user: { sub: "personal", role: "PERSONAL" } }))
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "c1", draftId: "d1" }), useRouter: () => nav }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))
vi.mock("./ExerciseLibraryCombobox", () => ({ ExerciseLibraryCombobox: () => null }))
const http = new AxiosMockAdapter(api)
const content = { title: "Elaboração", goal: "", notes: "", durationWeeks: null, splits: [] }
const draft = { id: "d1", clientId: "c1", status: "OPEN", version: 1, schemaVersion: 1, content, sourceWorkoutId: null, baseActiveWorkoutId: null, finalizedWorkoutId: null, createdAt: "2026-10-17T12:00:00Z", updatedAt: "2026-10-17T12:00:00Z", closedAt: null }
const summary = { ...draft, title: "Elaboração", content: undefined, client: { id: "c1", name: "Ana", status: "ACTIVE" } }
function mount(ui: React.ReactNode) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  return { cache, ...render(<QueryClientProvider client={cache}>{ui}</QueryClientProvider>) }
}
beforeEach(() => {
  vi.stubGlobal("navigation", Object.assign(new EventTarget(), { traverseTo: vi.fn() }))
  http.reset(); nav.push.mockReset(); nav.replace.mockReset()
  auth.user = { sub: "personal", role: "PERSONAL" }
  http.onGet("/clients/c1").reply(200, makeTestClient("c1", "Ana", "ACTIVE"))
  http.onGet("/workouts/client/c1/active").reply(200, null)
  http.onGet("/workouts/drafts").reply(200, { items: [], nextCursor: null })
  http.onGet("/workouts/drafts/d1").reply(200, draft)
  http.onGet("/workouts").reply(200, [])
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
it("existing_draft_requires_continue_or_discard", async () => {
  http.onGet("/workouts/drafts").reply(200, { items: [summary], nextCursor: null })
  mount(<NovoTreinoPage />)
  fireEvent.click(await screen.findByRole("button", { name: "Descartar rascunho" }))
  expect(http.history.post).toHaveLength(0)
  expect(screen.getByRole("alertdialog")).toHaveTextContent("Descartar rascunho?")
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
  fireEvent.click(screen.getByRole("button", { name: "Continuar rascunho" }))
  expect(nav.push).toHaveBeenCalledWith("/clientes/c1/rascunhos/d1")
  expect(screen.queryByLabelText("Título da prescrição")).not.toBeInTheDocument()
  expect(http.history.post).toHaveLength(0)
})
it("archived_draft_is_read_only", async () => {
  http.onGet("/clients/c1").reply(200, makeTestClient("c1", "Ana", "ARCHIVED"))
  mount(<DraftPage />)
  expect(await screen.findByLabelText("Título da prescrição")).toBeDisabled()
  expect(screen.getByRole("button", { name: "Salvar rascunho" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Finalizar prescrição" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Descartar rascunho" })).toBeDisabled()
})
it("draft_does_not_offer_print", async () => {
  mount(<DraftPage />)
  await screen.findByLabelText("Título da prescrição")
  expect(screen.queryByRole("button", { name: /imprimir/i })).not.toBeInTheDocument()
})
it("invalidated_cursor_restarts_first_page", async () => {
  http.onGet("/workouts/drafts").reply(config => config.params.cursor ? [400, {}] : [200, { items: [summary], nextCursor: "old-anchor" }])
  mount(<TreinosHubPage />)
  fireEvent.click(await screen.findByRole("button", { name: "Próxima página de rascunhos" }))
  fireEvent.click(await screen.findByRole("button", { name: "Voltar à primeira página" }))
  expect(await screen.findByText("Elaboração")).toBeVisible()
  expect(screen.queryByRole("button", { name: "Voltar à primeira página" })).not.toBeInTheDocument()
})
it("first_save_handoff_preserves_latest_edits", async () => {
  let resolve!: (value: [number, unknown]) => void
  http.onPost("/workouts/drafts").reply(() => new Promise(done => { resolve = done }))
  mount(<NovoTreinoPage />)
  fireEvent.click(await screen.findByRole("button", { name: "Começar do zero" }))
  fireEvent.change(screen.getByLabelText("Título da prescrição"), { target: { value: "Última edição" } })
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }))
  await waitFor(() => expect(http.history.post).toHaveLength(1))
  expect(screen.getByLabelText("Título da prescrição")).toBeDisabled()
  http.onGet("/workouts/drafts").reply(200, { items: [summary], nextCursor: null })
  await act(async () => resolve([201, { ...draft, content: { ...content, title: "Última edição" } }]))
  await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/clientes/c1/rascunhos/d1"))
  expect(screen.getByLabelText("Título da prescrição")).toHaveValue("Última edição")
  expect(screen.getByLabelText("Título da prescrição")).toBeDisabled()
  expect(nav.push).not.toHaveBeenCalled()
})
it("dirty_internal_navigation_and_browser_back_require_confirmation", async () => {
  const navigation = Object.assign(new EventTarget(), { traverseTo: vi.fn() })
  vi.stubGlobal("navigation", navigation)
  const { unmount } = mount(<><a href="/treinos">Menu Treinos</a><DraftPage /></>)
  fireEvent.change(await screen.findByLabelText("Título da prescrição"), { target: { value: "Não salvo" } })
  fireEvent.click(screen.getByRole("link", { name: "Menu Treinos" }))
  expect(screen.getByRole("alertdialog")).toHaveTextContent("Sair com alterações não salvas?")
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
  expect(nav.push).not.toHaveBeenCalled()
  const back = Object.assign(new Event("navigate", { cancelable: true }), { navigationType: "traverse", destination: { key: "previous", url: "http://localhost/treinos", sameDocument: true } })
  act(() => { navigation.dispatchEvent(back) })
  expect(back.defaultPrevented).toBe(true)
  expect(screen.getByLabelText("Título da prescrição")).toHaveValue("Não salvo")
  fireEvent.click(screen.getByRole("button", { name: "Sair sem salvar alterações" }))
  expect(navigation.traverseTo).toHaveBeenCalledWith("previous")
  unmount()
  const after = Object.assign(new Event("navigate", { cancelable: true }), { navigationType: "traverse", destination: { key: "previous" } })
  navigation.dispatchEvent(after)
  expect(after.defaultPrevented).toBe(false)
})
it.each([403, 404, 503])("masks_editor_after_detail_error_%s", async status => {
  const { cache } = mount(<DraftPage />)
  await screen.findByLabelText("Título da prescrição")
  http.onGet("/workouts/drafts/d1").reply(status)
  await act(async () => { await cache.invalidateQueries({ queryKey: queryKeys.workoutDraft("personal", "c1", "d1") }) })
  await waitFor(() => expect(screen.queryByLabelText("Título da prescrição")).not.toBeInTheDocument())
})
it("terminal_recovers_exact_finalized_workout_without_old_form", async () => {
  http.onGet("/workouts/drafts/d1").reply(200, { ...draft, status: "FINALIZED", content: null, finalizedWorkoutId: "w-saved" })
  mount(<DraftPage />)
  expect(await screen.findByRole("link", { name: "Abrir ficha finalizada" })).toHaveAttribute("href", "/clientes/c1/treinos/w-saved")
  expect(screen.queryByLabelText("Título da prescrição")).not.toBeInTheDocument()
})
it("rejects_route_client_mismatch_before_workout_queries", async () => {
  http.onGet("/clients/c1").reply(200, makeTestClient("c2", "Outro", "ACTIVE"))
  mount(<DraftPage />)
  expect(await screen.findByText("Prontuário indisponível")).toBeVisible()
  expect(http.history.get.map(x => x.url)).toEqual(["/clients/c1"])
})
it("rebase_refetches_active_and_propagates_failure_before_confirming_exact_fresh_id", async () => {
  const validContent = { ...content, splits: [{ name: "A", focus: "", exercises: [{ name: "Supino", sets: "3", reps: "8", rest: "", notes: "", muscleGroup: null, load: "", effortType: null, effortTarget: "", tempo: "", method: null }] }] }
  http.onGet("/workouts/drafts/d1").reply(200, { ...draft, content: validContent })
  http.onPost("/workouts/drafts/d1/finalize").reply(409, { code: "ACTIVE_WORKOUT_CHANGED" })
  http.onPost("/workouts/drafts/d1/rebase").reply(200, { ...draft, content: validContent, version: 2, baseActiveWorkoutId: "fresh" })
  mount(<DraftPage />)
  fireEvent.click(await screen.findByRole("button", { name: "Finalizar prescrição" }))
  fireEvent.click(screen.getByRole("button", { name: "Confirmar finalização" }))
  await screen.findByRole("button", { name: "Revisar treino ativo" })
  http.onGet("/workouts/client/c1/active").reply(503)
  fireEvent.click(screen.getByRole("button", { name: "Revisar treino ativo" }))
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível concluir"))
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  http.onGet("/workouts/client/c1/active").reply(200, { id: "fresh", clientId: "c1", title: "Ativo recém-carregado" })
  fireEvent.click(screen.getByRole("button", { name: "Revisar treino ativo" }))
  expect(await screen.findByRole("alertdialog")).toHaveTextContent("Ativo recém-carregado")
  fireEvent.click(screen.getByRole("button", { name: "Confirmar nova base" }))
  await waitFor(() => expect(http.history.post.find(x => x.url?.endsWith("/rebase"))).toBeDefined())
  expect(JSON.parse(http.history.post.find(x => x.url?.endsWith("/rebase"))!.data)).toEqual({ expectedVersion: 1, expectedActiveWorkoutId: "fresh" })
  expect(http.history.get.filter(x => x.url?.endsWith("/active"))).toHaveLength(3)
})
it("finalize_response_navigates_after_terminal_detail_refetch", async () => {
  const validContent = { ...content, splits: [{ name: "A", focus: "", exercises: [{ name: "Supino", sets: "3", reps: "8", rest: "", notes: "", muscleGroup: null, load: "", effortType: null, effortTarget: "", tempo: "", method: null }] }] }
  http.onGet("/workouts/drafts/d1").reply(200, { ...draft, content: validContent })
  http.onPost("/workouts/drafts/d1/finalize").reply(() => {
    http.onGet("/workouts/drafts/d1").reply(200, { ...draft, status: "FINALIZED", content: null, finalizedWorkoutId: "w-final" })
    return [200, { id: "d1", clientId: "c1", status: "FINALIZED", version: 2, finalizedWorkoutId: "w-final", workout: { id: "w-final", clientId: "c1" } }]
  })
  mount(<DraftPage />)
  fireEvent.click(await screen.findByRole("button", { name: "Finalizar prescrição" }))
  fireEvent.click(screen.getByRole("button", { name: "Confirmar finalização" }))
  await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/clientes/c1/treinos/w-final"))
  expect(screen.queryByLabelText("Título da prescrição")).not.toBeInTheDocument()
})
it.each(["NUTRITIONIST", "PHYSIO", "ADMIN"])("does_not_query_draft_route_for_%s", async role => {
  auth.user = { sub: "personal", role }
  mount(<DraftPage />)
  expect(screen.getByText("Área de treinamento indisponível")).toBeVisible()
  expect(http.history.get).toHaveLength(0)
})
it("dirty_menu_link_runs_menu_close_handler_without_navigating_before_confirmation", async () => {
  const closeMenu = vi.fn()
  mount(<><a href="/agenda" onClick={closeMenu}>Agenda do menu</a><DraftPage /></>)
  fireEvent.change(await screen.findByLabelText("Título da prescrição"), { target: { value: "Não salvo" } })
  fireEvent.click(screen.getByRole("link", { name: "Agenda do menu" }))
  expect(closeMenu).toHaveBeenCalledOnce()
  expect(nav.push).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Sair sem salvar alterações" }))
  expect(nav.push).toHaveBeenCalledWith("/agenda")
})

afterEach(() => vi.unstubAllGlobals())

it("fallback_spa_arrival_cannot_mount_editor_before_document_replacement", async () => {
  vi.stubGlobal("navigation", undefined)
  window.history.replaceState(null, "", "/clientes/c1/rascunhos/d1")
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ name: `${location.origin}/treinos` } as PerformanceEntry])
  const navigate = vi.spyOn(editorNavigation, "navigateToWorkoutPage").mockImplementation(() => undefined)
  mount(<DraftPage />)
  expect(screen.getByText("Preparando editor seguro")).toBeVisible()
  await waitFor(() => expect(navigate).toHaveBeenCalledWith(nav, window.location.href, "replace"))
  expect(screen.queryByLabelText("Título da prescrição")).not.toBeInTheDocument()
  expect(http.history.get).toHaveLength(0)
})
it("fallback_document_guards_every_unload_attempt_and_releases_after_save_and_unmount", async () => {
  vi.stubGlobal("navigation", undefined)
  window.history.replaceState(null, "", "/clientes/c1/rascunhos/d1")
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ name: location.href } as PerformanceEntry])
  const navigate = vi.spyOn(editorNavigation, "navigateToWorkoutPage").mockImplementation(() => undefined)
  http.onPut("/workouts/drafts/d1").reply(config => [200, { ...draft, version: 2, content: JSON.parse(config.data).content }])
  const { unmount } = mount(<><a href="/treinos">Menu Treinos</a><DraftPage /></>)
  fireEvent.change(await screen.findByLabelText("Título da prescrição"), { target: { value: "Texto intacto" } })
  for (let attempt = 0; attempt < 3; attempt++) {
    const unload = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)
    expect(screen.getByLabelText("Título da prescrição")).toHaveValue("Texto intacto")
  }
  fireEvent.click(screen.getByRole("link", { name: "Menu Treinos" }))
  expect(navigate).toHaveBeenCalledWith(nav, `${location.origin}/treinos`)
  expect(nav.push).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }))
  await waitFor(() => expect(screen.queryByText("Alterações não salvas")).not.toBeInTheDocument())
  const savedUnload = new Event("beforeunload", { cancelable: true })
  window.dispatchEvent(savedUnload)
  expect(savedUnload.defaultPrevented).toBe(false)
  unmount()
  const afterUnload = new Event("beforeunload", { cancelable: true })
  window.dispatchEvent(afterUnload)
  expect(afterUnload.defaultPrevented).toBe(false)
})
it("new_editor_creates_then_finalizes_without_switching_identity_or_navigation_mid_chain", async () => {
  http.onPost("/workouts/drafts").reply(config => {
    http.onGet("/workouts/drafts").reply(200, { items: [summary], nextCursor: null })
    return [201, { ...draft, content: JSON.parse(config.data).content }]
  })
  http.onPost("/workouts/drafts/d1/finalize").reply(200, { id: "d1", clientId: "c1", status: "FINALIZED", version: 2, finalizedWorkoutId: "w-new", workout: { id: "w-new", clientId: "c1" } })
  mount(<NovoTreinoPage />)
  fireEvent.click(await screen.findByRole("button", { name: "Começar do zero" }))
  expect(http.history.post).toHaveLength(0)
  fireEvent.change(screen.getByLabelText("Título da prescrição"), { target: { value: "Novo treino" } })
  fireEvent.click(screen.getByRole("button", { name: "Adicionar exercício" }))
  fireEvent.change(screen.getByLabelText("Nome do exercício"), { target: { value: "Supino" } })
  fireEvent.change(screen.getByLabelText("Séries"), { target: { value: "3" } })
  fireEvent.change(screen.getByLabelText("Repetições"), { target: { value: "8" } })
  fireEvent.click(screen.getByRole("button", { name: "Finalizar prescrição" }))
  fireEvent.click(screen.getByRole("button", { name: "Confirmar finalização" }))
  await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/clientes/c1/treinos/w-new"))
  expect(nav.replace).not.toHaveBeenCalled()
  expect(http.history.post.map(request => request.url)).toEqual(["/workouts/drafts", "/workouts/drafts/d1/finalize"])
  expect(JSON.parse(http.history.post[1].data)).toEqual({ expectedVersion: 1 })
})
it("confirmed_discard_uses_selected_version_and_then_allows_starting_without_automatic_create", async () => {
  http.onGet("/workouts/drafts").reply(200, { items: [{ ...summary, version: 7 }], nextCursor: null })
  http.onPost("/workouts/drafts/d1/discard").reply(() => {
    http.onGet("/workouts/drafts").reply(200, { items: [], nextCursor: null })
    return [200, { id: "d1", clientId: "c1", status: "DISCARDED", version: 8 }]
  })
  mount(<NovoTreinoPage />)
  fireEvent.click(await screen.findByRole("button", { name: "Descartar rascunho" }))
  fireEvent.click(screen.getByRole("button", { name: "Confirmar descarte" }))
  expect(await screen.findByRole("button", { name: "Começar do zero" })).toBeEnabled()
  expect(http.history.post).toHaveLength(1)
  expect(http.history.post[0].url).toBe("/workouts/drafts/d1/discard")
  expect(JSON.parse(http.history.post[0].data)).toEqual({ expectedVersion: 7 })
})
