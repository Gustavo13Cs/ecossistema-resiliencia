import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import NovoTreinoPage from "@/app/clientes/[id]/novo-treino/page"
import { api } from "@/lib/api"
import { makeTestClient } from "@/test/client-fixture"
import type { WorkoutPrescription } from "@/types/workout"
import { WorkoutEditor } from "./WorkoutEditor"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const auth = vi.hoisted(() => ({ user: { sub: "personal-1", role: "PERSONAL", name: "Personal" } }))

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "c1" }),
  useRouter: () => navigation,
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => auth,
}))

const http = new AxiosMockAdapter(api)

const activeWorkoutFixture: WorkoutPrescription = {
  id: "w-active",
  clientId: "c1",
  title: "Treino Ativo de Força",
  goal: "Força máxima",
  durationWeeks: 8,
  notes: "Controlar excêntrica",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-10T12:00:00.000Z",
  isActive: true,
  isTemplate: false,
  splits: [
    {
      id: "s-1",
      name: "Treino A",
      focus: "Peito e Tríceps",
      exercises: [
        {
          id: "e-1",
          name: "Supino Reto com Barra",
          sets: "4",
          reps: "8",
          rest: "90s",
          notes: "Pausa no peito",
        },
      ],
    },
  ],
}

beforeEach(() => {
  http.reset()
  navigation.push.mockReset()
  auth.user = { sub: "personal-1", role: "PERSONAL", name: "Personal" }
})

afterEach(cleanup)

describe("WorkoutEditor", () => {
  it("starts_blank_and_copies_only_after_click", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(activeWorkoutFixture)

    render(
      <WorkoutEditor
        client={makeTestClient("c1", "Marina Lopes", "ACTIVE")}
        activeWorkout={activeWorkoutFixture}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.queryByDisplayValue("Supino Reto com Barra")).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue("Treino Ativo de Força")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Título da prescrição")).toHaveValue("")
    expect(screen.getByLabelText("Nome da divisão")).toHaveValue("Treino A")
    expect(screen.getByRole("button", { name: "Salvar prescrição" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: /whatsapp/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Usar treino atual como base" }))

    expect(screen.getByDisplayValue("Treino Ativo de Força")).toBeVisible()
    expect(screen.getByDisplayValue("Supino Reto com Barra")).toBeVisible()
    expect(screen.getByRole("button", { name: "Salvar prescrição" })).toBeEnabled()

    await user.click(screen.getByRole("button", { name: "Começar do zero" }))
    expect(screen.queryByDisplayValue("Supino Reto com Barra")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Salvar prescrição" })).toBeDisabled()
  })

  it("failed_save_retains_form", async () => {
    const user = userEvent.setup()
    http.onPost("/workouts").reply(503)

    render(
      <WorkoutEditor
        client={makeTestClient("c1", "Marina Lopes", "ACTIVE")}
        activeWorkout={null}
        onSubmit={async input => {
          const { data } = await api.post<WorkoutPrescription>("/workouts", input)
          return data
        }}
      />,
    )

    await user.type(screen.getByLabelText("Título da prescrição"), "Conteúdo preenchido")
    await user.click(screen.getByRole("button", { name: "Adicionar exercício" }))
    await user.type(screen.getByLabelText("Nome do exercício"), "Agachamento")
    await user.type(screen.getByLabelText("Séries"), "4")
    await user.type(screen.getByLabelText("Repetições"), "8")

    await user.click(screen.getByRole("button", { name: "Salvar prescrição" }))

    expect(await screen.findByRole("alert")).toBeVisible()
    expect(screen.getByDisplayValue("Conteúdo preenchido")).toBeVisible()
    expect(screen.getByDisplayValue("Agachamento")).toBeVisible()
  })

  it("prevents_double_submit", async () => {
    let resolvePost!: (value: [number, WorkoutPrescription]) => void
    http.onPost("/workouts").reply(
      () =>
        new Promise(resolve => {
          resolvePost = resolve
        }),
    )

    render(
      <WorkoutEditor
        client={makeTestClient("c1", "Marina Lopes", "ACTIVE")}
        activeWorkout={activeWorkoutFixture}
        onSubmit={async input => {
          const { data } = await api.post<WorkoutPrescription>("/workouts", input)
          return data
        }}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Usar treino atual como base" }))
    const form = screen.getByRole("button", { name: "Salvar prescrição" }).closest("form")!

    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(http.history.post).toHaveLength(1))
    resolvePost([201, activeWorkoutFixture])
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar prescrição" })).toBeEnabled())
  })

  it("confirms_discard_on_navigation", async () => {
    const user = userEvent.setup()
    render(
      <WorkoutEditor
        client={makeTestClient("c1", "Marina Lopes", "ACTIVE")}
        activeWorkout={null}
        onSubmit={vi.fn()}
      />,
    )

    const cleanUnload = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(cleanUnload)
    expect(cleanUnload.defaultPrevented).toBe(false)

    await user.type(screen.getByLabelText("Título da prescrição"), "Rascunho em memória")

    const dirtyUnload = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(dirtyUnload)
    expect(dirtyUnload.defaultPrevented).toBe(true)

    await user.click(screen.getByRole("button", { name: "Voltar ao prontuário" }))
    expect(navigation.push).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog", { name: "Descartar alterações?" })).toBeVisible()

    await user.click(screen.getByRole("button", { name: "Continuar editando" }))
    expect(screen.getByDisplayValue("Rascunho em memória")).toBeVisible()

    await user.click(screen.getByRole("button", { name: "Voltar ao prontuário" }))
    await user.click(screen.getByRole("button", { name: "Descartar e sair" }))
    expect(navigation.push).toHaveBeenCalledWith("/clientes/c1")
  })

  it("blocks prescription submission when the base active workout query fails or Client is archived", async () => {
    http.onGet("/clients/c1").reply(200, makeTestClient("c1", "Marina Lopes", "ACTIVE"))
    http.onGet("/workouts/client/c1/active").reply(503)

    const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    const view = render(
      <QueryClientProvider client={cache}>
        <NovoTreinoPage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText("Contexto de treino indisponível")).toBeVisible()
    expect(screen.queryByRole("button", { name: "Salvar prescrição" })).not.toBeInTheDocument()
    view.unmount()

    render(
      <WorkoutEditor
        client={makeTestClient("c1", "Marina Lopes", "ARCHIVED")}
        activeWorkout={null}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByText(/prontuário arquivado/i)).toBeVisible()
    expect(screen.getByRole("button", { name: "Salvar prescrição" })).toBeDisabled()
  })
})
