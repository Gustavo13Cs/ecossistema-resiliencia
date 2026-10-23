import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
  vi.stubGlobal("navigation", Object.assign(new EventTarget(), { traverseTo: vi.fn() }))
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

  it("blocks copying an unavailable active workout and keeps archived legacy editor read only", async () => {
    http.onGet("/clients/c1").reply(200, { ...makeTestClient("c1", "Marina Lopes", "ACTIVE"), professionalId: "personal-1" })
    http.onGet("/workouts/drafts").reply(200, { items: [], nextCursor: null })
    http.onGet("/workouts/client/c1/active").reply(503)

    const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    const view = render(
      <QueryClientProvider client={cache}>
        <NovoTreinoPage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/Não foi possível consultar o treino ativo/)).toBeVisible()
    expect(screen.getByRole("button", { name: "Usar treino ativo como base" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Começar do zero" })).toBeEnabled()
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

  it("supports reordering and duplicating exercises and splits in the editor", async () => {
    const user = userEvent.setup()
    render(
      <WorkoutEditor
        client={makeTestClient("c1", "Marina Lopes", "ACTIVE")}
        activeWorkout={null}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Adicionar exercício" }))
    await user.type(screen.getByLabelText("Nome do exercício"), "Exercício 1")
    await user.type(screen.getByLabelText("Séries"), "3")
    await user.type(screen.getByLabelText("Repetições"), "10")

    await user.click(screen.getByRole("button", { name: "Duplicar exercício 1" }))
    const exerciseInputs = screen.getAllByLabelText("Nome do exercício")
    expect(exerciseInputs).toHaveLength(2)
    expect(exerciseInputs[1]).toHaveValue("Exercício 1")

    await user.clear(exerciseInputs[1])
    await user.type(exerciseInputs[1], "Exercício 2")

    // Move Exercise 2 up
    await user.click(screen.getByRole("button", { name: "Mover exercício 2 para cima" }))
    const reorderedInputs = screen.getAllByLabelText("Nome do exercício")
    expect(reorderedInputs[0]).toHaveValue("Exercício 2")
    expect(reorderedInputs[1]).toHaveValue("Exercício 1")

    // Duplicate split
    await user.click(screen.getByRole("button", { name: "Duplicar divisão 1" }))
    expect(screen.getByDisplayValue("Treino A (cópia)")).toBeVisible()
  })

  it("expands collapsible advanced parameters and shows summary chips", async () => {
    const user = userEvent.setup()
    render(
      <WorkoutEditor
        client={makeTestClient("c1", "Marina Lopes", "ACTIVE")}
        activeWorkout={null}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Adicionar exercício" }))
    await user.type(screen.getByLabelText("Nome do exercício"), "Agachamento")
    await user.type(screen.getByLabelText("Séries"), "4")
    await user.type(screen.getByLabelText("Repetições"), "8")

    const toggleBtn = screen.getByRole("button", { name: "Parâmetros avançados" })
    await user.click(toggleBtn)

    expect(screen.getByLabelText("Grupo muscular")).toBeVisible()
    expect(screen.getByLabelText("Método de treino")).toBeVisible()
    expect(screen.getByLabelText("Cadência")).toBeVisible()

    await user.selectOptions(screen.getByLabelText("Grupo muscular"), "QUADRICEPS")
    await user.selectOptions(screen.getByLabelText("Método de treino"), "REST_PAUSE")
    await user.selectOptions(screen.getByLabelText("Escala de esforço"), "RIR")
    await user.type(screen.getByLabelText("Esforço alvo"), "2")
    await user.type(screen.getByLabelText("Cadência"), "3-0-1-0")

    // Collapse advanced parameters
    await user.click(toggleBtn)
    expect(within(screen.getByLabelText("Resumo avançado do exercício 1")).getByText("Quadríceps")).toBeVisible()
    expect(screen.getByText("Rest-pause")).toBeVisible()
    expect(screen.getByText("RIR 2")).toBeVisible()
    expect(screen.getByText("Cadência 3-0-1-0")).toBeVisible()
  })
})

afterEach(() => vi.unstubAllGlobals())
