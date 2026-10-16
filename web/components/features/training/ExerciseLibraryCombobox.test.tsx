import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { ExerciseLibraryItem } from "@/types/workout"
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
  },
  {
    id: "cat-1",
    name: "Agachamento livre com barra",
    muscleGroup: "QUADRICEPS",
    equipment: "BARBELL",
    notes: null,
    source: "CATALOG",
  },
  {
    id: "cat-2",
    name: "Supino reto com barra",
    muscleGroup: "CHEST",
    equipment: "BARBELL",
    notes: null,
    source: "CATALOG",
  },
]

describe("ExerciseLibraryCombobox", () => {
  beforeEach(() => {
    http.reset()
    auth.user = { sub: "personal-1", role: "PERSONAL", name: "Personal" }
    http.onGet("/workouts/exercise-library").reply(200, sampleItems)
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
    expect(onSelect).toHaveBeenCalledWith({
      name: "Agachamento pausa 2s",
      muscleGroup: "QUADRICEPS",
    })
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
      })
    })
  })
})
