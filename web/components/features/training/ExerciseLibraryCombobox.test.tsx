import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { ExerciseLibraryItem } from "@/types/workout"
import type { LibraryReference } from "@/types/exercise-demonstration"
import { ExerciseLibraryCombobox } from "./ExerciseLibraryCombobox"

const auth = vi.hoisted(() => ({
  user: { sub: "personal-1", role: "PERSONAL", name: "Personal" },
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => auth,
}))

const http = new AxiosMockAdapter(api)

const sampleItems: ExerciseLibraryItem[] = [
  {
    id: "custom-1",
    name: "Agachamento pausa 2s",
    muscleGroup: "QUADRICEPS",
    equipment: "BARBELL",
    notes: null,
    source: "CUSTOM",
    hasDemonstration: false,
    demonstrationTypes: [],
  },
  {
    id: "cat-1",
    name: "Agachamento livre com barra",
    muscleGroup: "QUADRICEPS",
    equipment: "BARBELL",
    notes: null,
    source: "CATALOG",
    hasDemonstration: true,
    demonstrationTypes: ["IMAGE"],
  },
  {
    id: "cat-2",
    name: "Supino reto com barra",
    muscleGroup: "CHEST",
    equipment: "BARBELL",
    notes: null,
    source: "CATALOG",
    hasDemonstration: false,
    demonstrationTypes: [],
  },
]

describe("ExerciseLibraryCombobox", () => {
  beforeEach(() => {
    http.reset()
    auth.user = { sub: "personal-1", role: "PERSONAL", name: "Personal" }
    http.onGet("/workouts/exercise-library").reply(200, sampleItems)
    http.onGet(/\/workouts\/exercise-library\/[^/]+$/).reply(config => {
      const item = sampleItems.find(entry => config.url?.endsWith(`/${entry.id}`))
      if (config.url?.endsWith("/custom-new")) return [200, { id: "custom-new", name: "Remada Pendulo", muscleGroup: "BACK", source: "CUSTOM", demonstration: null, mediaVersion: 1 }]
      return [200, { ...item, demonstration: item?.id === "cat-1" ? { revision: "r1", instruction: "Execução" } : null, mediaVersion: item?.source === "CUSTOM" ? 1 : null }]
    })
  })

  afterEach(cleanup)

  it("opens popover, displays catalog and custom exercises, and selects an item", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ExerciseLibraryCombobox
          exerciseId="ex-1"
          currentName=""
          currentMuscleGroup=""
          onSelect={onSelect}
        />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole("button", { name: /biblioteca/i }))

    expect(await screen.findByText("Meus exercícios")).toBeVisible()
    expect(screen.getByText("Agachamento pausa 2s")).toBeVisible()
    expect(screen.getByText("Catálogo SafeMove")).toBeVisible()
    expect(screen.getByText("Agachamento livre com barra")).toBeVisible()

    await user.click(screen.getByText("Agachamento pausa 2s"))
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({
      name: "Agachamento pausa 2s",
      muscleGroup: "QUADRICEPS",
      libraryReference: { source: "CUSTOM", exerciseId: "custom-1", demonstrationRevision: null },
    }))
  })

  it("filters by muscle group and supports creating a custom exercise", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    http.onPost("/workouts/exercise-library").reply(201, {
      id: "custom-new",
      name: "Remada Pendulo",
      muscleGroup: "BACK",
      equipment: null,
      notes: null,
      source: "CUSTOM",
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ExerciseLibraryCombobox
          exerciseId="ex-2"
          currentName=""
          currentMuscleGroup=""
          onSelect={onSelect}
        />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole("button", { name: /biblioteca/i }))
    await screen.findByText("Meus exercícios")

    await user.click(screen.getByRole("button", { name: "Salvar como exercício próprio" }))
    expect(screen.getByLabelText("Nome do exercício próprio")).toBeVisible()

    await user.type(screen.getByLabelText("Nome do exercício próprio"), "Remada Pendulo")
    await user.selectOptions(screen.getByLabelText("Grupo muscular principal"), "BACK")

    await user.click(screen.getByRole("button", { name: "Confirmar exercício próprio" }))

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({
        name: "Remada Pendulo",
        muscleGroup: "BACK",
        libraryReference: { source: "CUSTOM", exerciseId: "custom-new", demonstrationRevision: null },
      })
    })
  })

  it("selects the freshly authorized detail revision instead of cached or list data", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(queryKeys.exerciseLibraryDetail("personal-1", "cat-1"), { ...sampleItems[1], demonstration: { revision: "old", instruction: "old" } })
    render(<QueryClientProvider client={queryClient}><ExerciseLibraryCombobox exerciseId="ex-3" currentName="" currentMuscleGroup="" onSelect={onSelect} /></QueryClientProvider>)
    await user.click(screen.getByRole("button", { name: /biblioteca/i }))
    await user.click(await screen.findByText("Agachamento livre com barra"))
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({
      name: "Agachamento livre com barra", muscleGroup: "QUADRICEPS",
      libraryReference: { source: "CATALOG", exerciseId: "cat-1", demonstrationRevision: "r1" },
    }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it("owner change drops a pending selection before fetching detail under the new owner", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    let release!: (response: [number, unknown]) => void
    let detailCalls = 0
    http.resetHandlers()
    http.onGet("/workouts/exercise-library").reply(200, sampleItems)
    http.onGet("/workouts/exercise-library/cat-1").reply(() => { detailCalls += 1; return new Promise(resolve => { release = resolve }) })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = render(<QueryClientProvider client={queryClient}><ExerciseLibraryCombobox exerciseId="ex-4" currentName="" currentMuscleGroup="" onSelect={onSelect} /></QueryClientProvider>)
    await user.click(screen.getByRole("button", { name: /biblioteca/i }))
    await user.click(await screen.findByText("Agachamento livre com barra"))
    await waitFor(() => expect(detailCalls).toBe(1))
    auth.user = { sub: "personal-2", role: "PERSONAL", name: "Personal" }
    view.rerender(<QueryClientProvider client={queryClient}><ExerciseLibraryCombobox exerciseId="ex-4" currentName="" currentMuscleGroup="" onSelect={onSelect} /></QueryClientProvider>)
    release([200, { ...sampleItems[1], demonstration: { revision: "old", instruction: "" } }])
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.exerciseLibraryDetail("personal-2", "cat-1"))).toBeUndefined())
    expect(detailCalls).toBe(1)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("retries detail after a transient failure without selecting stale cached data", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    http.resetHandlers()
    http.onGet("/workouts/exercise-library").reply(200, sampleItems)
    http.onGet("/workouts/exercise-library/cat-1").replyOnce(503).onGet("/workouts/exercise-library/cat-1").reply(200, { ...sampleItems[1], demonstration: { revision: "r2", instruction: "" } })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><ExerciseLibraryCombobox exerciseId="ex-5" currentName="" currentMuscleGroup="" onSelect={onSelect} /></QueryClientProvider>)
    await user.click(screen.getByRole("button", { name: /biblioteca/i }))
    const item = await screen.findByText("Agachamento livre com barra")
    await user.click(item)
    expect(await screen.findByText(/não foi possível conferir/i)).toBeVisible()
    expect(onSelect).not.toHaveBeenCalled()
    await user.click(item)
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({ name: "Agachamento livre com barra", muscleGroup: "QUADRICEPS", libraryReference: { source: "CATALOG", exerciseId: "cat-1", demonstrationRevision: "r2" } }))
  })

  it("does not select a newly created exercise after the popover was closed", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    let completeCreate!: (response: [number, unknown]) => void
    http.onPost("/workouts/exercise-library").reply(() => new Promise(resolve => { completeCreate = resolve }))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><ExerciseLibraryCombobox exerciseId="ex-6" currentName="" currentMuscleGroup="" onSelect={onSelect} /></QueryClientProvider>)
    await user.click(screen.getByRole("button", { name: /biblioteca/i }))
    await user.click(screen.getByRole("button", { name: "Salvar como exercício próprio" }))
    await user.type(screen.getByLabelText("Nome do exercício próprio"), "Remada pausada")
    await user.click(screen.getByRole("button", { name: "Confirmar exercício próprio" }))
    await waitFor(() => expect(completeCreate).toBeTypeOf("function"))
    await user.click(screen.getByRole("button", { name: /biblioteca/i }))
    await act(async () => completeCreate([201, { id: "custom-new", name: "Remada pausada", muscleGroup: "BACK", source: "CUSTOM" }]))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("keeps a later custom creation intent ahead of an earlier detail and never restores a detached edit after close", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    let completeDetail!: (response: [number, unknown]) => void
    let completeCreate!: (response: [number, unknown]) => void
    http.resetHandlers()
    http.onGet("/workouts/exercise-library").reply(200, sampleItems)
    http.onGet("/workouts/exercise-library/cat-1").reply(() => new Promise(resolve => { completeDetail = resolve }))
    http.onGet("/workouts/exercise-library/custom-new").reply(200, { id: "custom-new", name: "Remada própria", muscleGroup: "BACK", source: "CUSTOM", demonstration: null, mediaVersion: 1 })
    http.onPost("/workouts/exercise-library").reply(() => new Promise(resolve => { completeCreate = resolve }))
    function Harness() {
      const [name, setName] = useState("Nome inicial")
      const [reference, setReference] = useState<LibraryReference | null>(null)
      return <>
        <input aria-label="Nome manual" value={name} onChange={event => { setName(event.target.value); setReference(null) }} />
        <button type="button" onClick={() => setReference(null)}>Retirar vínculo manualmente</button>
        <span data-testid="reference">{reference?.exerciseId ?? "sem vínculo"}</span>
        <ExerciseLibraryCombobox exerciseId="ex-race" currentName={name} currentMuscleGroup="" onSelect={selection => { onSelect(selection); setName(selection.name); setReference(selection.libraryReference) }} />
      </>
    }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><Harness /></QueryClientProvider>)
    await user.click(screen.getByRole("button", { name: /biblioteca/i }))
    await user.click(await screen.findByText("Agachamento livre com barra"))
    await waitFor(() => expect(completeDetail).toBeTypeOf("function"))
    await user.click(screen.getByRole("button", { name: "Salvar como exercício próprio" }))
    await user.clear(screen.getByLabelText("Nome do exercício próprio"))
    await user.type(screen.getByLabelText("Nome do exercício próprio"), "Remada própria")
    await user.click(screen.getByRole("button", { name: "Confirmar exercício próprio" }))
    await waitFor(() => expect(completeCreate).toBeTypeOf("function"))
    await act(async () => completeDetail([200, { ...sampleItems[1], demonstration: { revision: "r1", instruction: "" }, mediaVersion: null }]))
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Nome do exercício próprio")).toBeVisible()
    await user.click(screen.getByRole("button", { name: /biblioteca/i }))
    await user.clear(screen.getByLabelText("Nome manual"))
    await user.type(screen.getByLabelText("Nome manual"), "Nome editado")
    await user.click(screen.getByRole("button", { name: "Retirar vínculo manualmente" }))
    await act(async () => completeCreate([201, { id: "custom-new", name: "Remada própria", muscleGroup: "BACK", source: "CUSTOM" }]))
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Nome manual")).toHaveValue("Nome editado")
    expect(screen.getByTestId("reference")).toHaveTextContent("sem vínculo")
  })


 it.each([true, false])("restores valid focus after pending filtering replaces the launcher (retained=%s)", async retained => {
  let release!: (response: [number, unknown]) => void
  http.resetHandlers()
  http.onGet("/workouts/exercise-library").reply(config => config.params?.q
    ? new Promise(resolve => { release = resolve }) : [200, sampleItems])
  http.onGet("/workouts/exercise-library/cat-1").reply(200, { ...sampleItems[1], demonstration: { revision: "r1", instruction: "Execução conferida" } })
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ExerciseLibraryCombobox exerciseId="filter-preview" currentName="Nome manual" currentMuscleGroup="" onSelect={vi.fn()} /></QueryClientProvider>)
  await user.click(screen.getByRole("button", { name: /biblioteca/i }))
  const oldPreview = await screen.findByRole("button", { name: "Ver execução de Agachamento livre com barra" })
  await user.type(screen.getByPlaceholderText("Buscar exercício (ex.: supino, agachamento)..."), "A")
  oldPreview.focus()
  await user.keyboard("{Enter}")
  expect(await screen.findByRole("dialog", { name: "Execução do exercício" })).toBeVisible()
  await waitFor(() => expect(release).toBeTypeOf("function"))
  expect(oldPreview.isConnected).toBe(false)
  await act(async () => release([200, retained ? [sampleItems[1]] : []]))
  await user.keyboard("{Escape}")
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Execução do exercício" })).toBeNull())
  if (retained) {
    const replacement = screen.getByRole("button", { name: "Ver execução de Agachamento livre com barra" })
    expect(replacement).not.toBe(oldPreview)
    await waitFor(() => expect(replacement).toHaveFocus())
  } else {
    await waitFor(() => expect(screen.getByPlaceholderText("Buscar exercício (ex.: supino, agachamento)...")).toHaveFocus())
  }
 })
 it("restores the keyboard preview launcher after Escape inside the library popover", async () => {
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ExerciseLibraryCombobox exerciseId="keyboard-preview" currentName="Nome manual" currentMuscleGroup="" onSelect={vi.fn()} /></QueryClientProvider>)
  await user.click(screen.getByRole("button", { name: /biblioteca/i }))
  const preview = await screen.findByRole("button", { name: "Ver execução de Agachamento livre com barra" })
  preview.focus()
  expect(preview).toHaveFocus()
  await user.keyboard("{Enter}")
  expect(await screen.findByRole("dialog", { name: "Execução do exercício" })).toBeVisible()
  await user.keyboard("{Escape}")
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Execução do exercício" })).toBeNull())
  await waitFor(() => expect(preview).toHaveFocus())
 })
})
 it("preview_does_not_select_or_lose_editor_text", async () => {
  http.resetHandlers()
  http.onGet("/workouts/exercise-library").reply(200, sampleItems)
  http.onGet("/workouts/exercise-library/cat-1").reply(200, { ...sampleItems[1], demonstration: { revision: "r1", instruction: "Execução conferida" } })
  const onSelect = vi.fn()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><input aria-label="Anotações" defaultValue="Meu texto em elaboração" /><ExerciseLibraryCombobox exerciseId="preview" currentName="Nome manual" currentMuscleGroup="" onSelect={onSelect} /></QueryClientProvider>)
  await userEvent.click(screen.getByRole("button", { name: /biblioteca/i }))
  const search = screen.getByPlaceholderText("Buscar exercício (ex.: supino, agachamento)...")
  await userEvent.type(search, "Agachamento")
  await userEvent.click(await screen.findByRole("button", { name: "Ver execução de Agachamento livre com barra" }))
  expect(await screen.findByText("Execução conferida")).toBeVisible()
  expect(onSelect).not.toHaveBeenCalled()
  await userEvent.keyboard("{Escape}")
  expect(screen.getByPlaceholderText("Buscar exercício (ex.: supino, agachamento)...")).toHaveValue("Agachamento")
  expect(screen.getByLabelText("Anotações")).toHaveValue("Meu texto em elaboração")
  expect(onSelect).not.toHaveBeenCalled()
})
