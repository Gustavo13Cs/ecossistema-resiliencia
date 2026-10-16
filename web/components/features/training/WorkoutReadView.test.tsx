import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import WorkoutDetailPage from "@/app/clientes/[id]/treinos/[workoutId]/page"
import TreinosHubPage from "@/app/treinos/page"
import { api } from "@/lib/api"
import type { WorkoutDetail } from "@/types/workout"
import { WorkoutReadView } from "./WorkoutReadView"

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  params: { id: "c1", workoutId: "w-older" },
}))
const auth = vi.hoisted(() => ({
  user: { sub: "personal-1", role: "PERSONAL", name: "Ana Personal" },
}))

vi.mock("next/navigation", () => ({
  useParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => auth,
}))

const http = new AxiosMockAdapter(api)

const makeWorkoutDetail = (overrides: Partial<WorkoutDetail> = {}): WorkoutDetail => ({
  id: "w-older",
  clientId: "c1",
  client: { id: "c1", name: "Marina Lopes", status: "ACTIVE" },
  title: "Mesociclo Base — Força",
  goal: "Aumentar força de membros inferiores",
  durationWeeks: 6,
  notes: "Respeitar pausa técnica no agachamento.",
  createdAt: "2026-09-10T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
  isActive: false,
  isTemplate: false,
  splits: [
    {
      id: "split-1",
      name: "Treino A",
      focus: "Inferiores",
      exercises: [
        {
          id: "ex-1",
          name: "Agachamento Livre",
          sets: "4",
          reps: "6",
          rest: "150s",
          notes: "Controlar descida",
        },
      ],
    },
    {
      id: "split-2",
      name: "Treino B",
      focus: "Superiores",
      exercises: [
        {
          id: "ex-2",
          name: "Remada Curvada",
          sets: "4",
          reps: "8",
          rest: "90s",
          notes: null,
        },
      ],
    },
  ],
  ...overrides,
})

function renderWithQuery(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  http.reset()
  navigation.push.mockReset()
  navigation.params = { id: "c1", workoutId: "w-older" }
  auth.user = { sub: "personal-1", role: "PERSONAL", name: "Ana Personal" }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("WorkoutReadView and exact workout route", () => {
  it("selected_history_row_opens_its_workout_id", async () => {
    const user = userEvent.setup()
    const clientId = "c1"
    const olderWorkoutId = "w-older"
    http.onGet("/workouts").reply(200, [
      {
        id: "w-active",
        clientId,
        client: { id: clientId, name: "Marina Lopes", status: "ACTIVE" },
        title: "Ficha Atual",
        goal: "Hipertrofia",
        createdAt: "2026-10-14T12:00:00.000Z",
        updatedAt: "2026-10-14T12:00:00.000Z",
        isActive: true,
        isTemplate: false,
      },
      {
        id: olderWorkoutId,
        clientId,
        client: { id: clientId, name: "Marina Lopes", status: "ACTIVE" },
        title: "Ficha Anterior",
        goal: "Adaptação",
        createdAt: "2026-09-01T12:00:00.000Z",
        updatedAt: "2026-09-01T12:00:00.000Z",
        isActive: false,
        isTemplate: false,
      },
    ])

    renderWithQuery(<TreinosHubPage />)

    const openButtons = await screen.findAllByRole("button", { name: /abrir ficha/i })
    await user.click(openButtons[1])
    expect(navigation.push).toHaveBeenCalledWith(`/clientes/${clientId}/treinos/${olderWorkoutId}`)
  })

  it("foreign_client_route_does_not_render_detail", async () => {
    navigation.params = { id: "c1", workoutId: "w-other-student" }
    http.onGet("/workouts/w-other-student").reply(
      200,
      makeWorkoutDetail({
        id: "w-other-student",
        clientId: "c2",
        client: { id: "c2", name: "Outro Aluno", status: "ACTIVE" },
        title: "Treino de outro aluno da mesma conta",
      }),
    )

    renderWithQuery(<WorkoutDetailPage />)

    expect(await screen.findByText("Ficha de treino indisponível")).toBeVisible()
    expect(screen.queryByText("Treino de outro aluno da mesma conta")).not.toBeInTheDocument()
    expect(screen.queryByText("Outro Aluno")).not.toBeInTheDocument()
  })

  it("renders multi-split workout fields faithfully and prints without private Client notes", async () => {
    const user = userEvent.setup()
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined)
    const detail = makeWorkoutDetail()
    render(<WorkoutReadView workout={detail} />)

    expect(screen.getByRole("heading", { name: "Mesociclo Base — Força" })).toBeVisible()
    expect(screen.getByText("Treino anterior")).toBeVisible()
    expect(screen.getByText("Aumentar força de membros inferiores")).toBeVisible()
    expect(screen.getByText("6 semanas")).toBeVisible()
    expect(screen.getByRole("region", { name: "Treino A" })).toHaveTextContent("Agachamento Livre")
    expect(screen.getByRole("region", { name: "Treino B" })).toHaveTextContent("Remada Curvada")
    expect(screen.getByText("Respeitar pausa técnica no agachamento.")).toBeVisible()
    expect(screen.queryByText(/privacyNotes|professionalNotes|patologias/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Imprimir ficha salva" }))
    expect(printSpy).toHaveBeenCalledOnce()
  })

  it("renders advanced exercise parameters (load, effort, tempo, method, muscleGroup)", () => {
    const detail = makeWorkoutDetail({
      splits: [
        {
          id: "s1",
          name: "Treino A",
          focus: "Inferiores",
          position: 0,
          exercises: [
            {
              id: "e1",
              name: "Agachamento Livre",
              sets: "4",
              reps: "6",
              rest: "120s",
              notes: "Apoio estável",
              position: 0,
              muscleGroup: "QUADRICEPS",
              load: "100 kg",
              effortType: "RIR",
              effortTarget: "2",
              tempo: "3-0-1-0",
              method: "REST_PAUSE",
            },
          ],
        },
      ],
    })
    render(<WorkoutReadView workout={detail} />)

    expect(screen.getByText("Quadríceps")).toBeVisible()
    expect(screen.getByText("Rest-pause")).toBeVisible()
    expect(screen.getByText("100 kg")).toBeVisible()
    expect(screen.getByText("RIR 2")).toBeVisible()
    expect(screen.getByText("3-0-1-0")).toBeVisible()
  })

  it("keeps archived student workout readable while disabling new prescription creation", async () => {
    http.onGet("/workouts/w-older").reply(
      200,
      makeWorkoutDetail({
        client: { id: "c1", name: "Marina Lopes", status: "ARCHIVED" },
      }),
    )

    renderWithQuery(<WorkoutDetailPage />)

    expect(await screen.findByRole("heading", { name: "Mesociclo Base — Força" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Criar prescrição" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Imprimir ficha salva" })).toBeEnabled()
  })

  it("denies non-PERSONAL roles before querying workout details", async () => {
    auth.user = { sub: "nutri-1", role: "NUTRITIONIST", name: "Nutri" }
    renderWithQuery(<WorkoutDetailPage />)

    await waitFor(() => expect(screen.getByText("Área de treinamento indisponível")).toBeVisible())
    expect(http.history.get).toHaveLength(0)
  })
})
