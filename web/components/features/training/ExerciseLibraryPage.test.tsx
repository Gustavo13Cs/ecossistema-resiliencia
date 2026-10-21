import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { ExerciseLibraryPage } from "./ExerciseLibraryPage"
const auth = vi.hoisted(() => ({ user: { sub: "p1", role: "PERSONAL" } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))
const http = new AxiosMockAdapter(api)
const own = { id: "own", name: "Meu exercício", source: "CUSTOM", muscleGroup: "CORE", equipment: null, notes: null, hasDemonstration: false, demonstrationTypes: [] }
const catalog = { ...own, id: "cat-1", name: "Prancha", source: "CATALOG" }
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ExerciseLibraryPage /></QueryClientProvider>) }
beforeEach(() => { auth.user = { sub: "p1", role: "PERSONAL" }; http.reset(); http.onGet("/workouts/exercise-library").reply(200, [catalog, own]) })
afterEach(cleanup)
it("manual_exercise_needs_no_media", async () => {
  http.onPost("/workouts/exercise-library").reply(201, own)
  mount()
  await userEvent.click(screen.getByRole("button", { name: "Novo exercício" }))
  await userEvent.type(screen.getByLabelText("Nome do exercício"), "Meu exercício")
  await userEvent.click(screen.getByRole("button", { name: "Salvar exercício" }))
  await waitFor(() => expect(http.history.post).toHaveLength(1))
  expect(JSON.parse(http.history.post[0].data)).toEqual({ name: "Meu exercício", muscleGroup: "CHEST" })
  expect(await screen.findByText("Exercício salvo na sua biblioteca.")).toBeVisible()
})
it("filters_by_group_equipment_and_source", async () => {
  mount()
  await screen.findByText("Prancha")
  await userEvent.selectOptions(screen.getByLabelText("Fonte"), "CUSTOM")
  expect(screen.queryByText("Prancha")).toBeNull()
  expect(screen.getByText("Meu exercício")).toBeVisible()
  await userEvent.selectOptions(screen.getByLabelText("Grupo muscular"), "CORE")
  await userEvent.selectOptions(screen.getByLabelText("Equipamento"), "BODYWEIGHT")
  await waitFor(() => expect(http.history.get.some(request => request.params?.muscleGroup === "CORE" && request.params?.equipment === "BODYWEIGHT")).toBe(true))
})
it.each([true, false])("restores keyboard focus after a pending page query replaces the launcher (retained=%s)", async retained => {
  let release!: (response: [number, unknown]) => void
  http.resetHandlers()
  http.onGet("/workouts/exercise-library").reply(config => config.params?.q
    ? new Promise(resolve => { release = resolve }) : [200, [catalog, own]])
  http.onGet("/workouts/exercise-library/cat-1").reply(200, { ...catalog, demonstration: null })
  const user = userEvent.setup()
  mount()
  const original = await screen.findByRole("button", { name: "Ver execução de Prancha" })
  const search = screen.getByRole("textbox", { name: "Buscar exercício" })
  fireEvent.change(search, { target: { value: "Prancha" } })
  original.focus()
  await user.keyboard("{Enter}")
  expect(await screen.findByRole("dialog", { name: "Execução do exercício" })).toBeVisible()
  await waitFor(() => expect(release).toBeTypeOf("function"))
  expect(original.isConnected).toBe(false)
  await act(async () => release([200, retained ? [own, catalog] : [own]]))
  await user.keyboard("{Escape}")
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Execução do exercício" })).toBeNull())
  if (retained) {
    const replacement = screen.getByRole("button", { name: "Ver execução de Prancha" })
    expect(replacement).not.toBe(original)
    await waitFor(() => expect(replacement).toHaveFocus())
  } else {
    expect(screen.queryByRole("button", { name: "Ver execução de Prancha" })).toBeNull()
    await waitFor(() => expect(search).toHaveFocus())
  }
})
it("updates_own_link_with_compare_and_swap_and_preserves_conflicting_input", async () => {
  http.onGet("/workouts/exercise-library/own").reply(200, { ...own, demonstration: null, mediaVersion: 3 })
  http.onPatch("/workouts/exercise-library/own").reply(409)
  mount()
  await userEvent.click(await screen.findByRole("button", { name: "Ver execução de Meu exercício" }))
  const dialog = await screen.findByRole("dialog")
  await userEvent.type(within(dialog).getByLabelText("Link do vídeo (opcional)"), "https://vimeo.com/123456")
  await userEvent.click(within(dialog).getByRole("button", { name: "Salvar link" }))
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(/alterado/i)
  expect(within(dialog).getByLabelText("Link do vídeo (opcional)")).toHaveValue("https://vimeo.com/123456")
  expect(JSON.parse(http.history.patch[0].data)).toEqual({ expectedMediaVersion: 3, videoUrl: "https://vimeo.com/123456" })
})
it.each(["NUTRITIONIST", "PHYSIO", "ADMIN"])("does_not_mount_queries_for_%s", role => {
  auth.user.role = role
  mount()
  expect(screen.getByText("Área de treinamento indisponível")).toBeVisible()
  expect(http.history.get).toHaveLength(0)
})
