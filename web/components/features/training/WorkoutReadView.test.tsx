import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
  return render(ui, { wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider> })
}

beforeEach(() => {
  vi.stubGlobal("navigation", Object.assign(new EventTarget(), { traverseTo: vi.fn() }))
  http.reset()
  http.onGet("/workouts/drafts").reply(200, { items: [], nextCursor: null })
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
    renderWithQuery(<WorkoutReadView workout={detail} />)

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
    renderWithQuery(<WorkoutReadView workout={detail} />)

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

it("legacy_label_has_no_invented_version", () => {
  renderWithQuery(<WorkoutReadView workout={makeWorkoutDetail()} />)
  expect(screen.getByText("Registro legado")).toBeVisible()
  expect(screen.queryByText(/versão \d/i)).not.toBeInTheDocument()
})
it("revision_uses_selected_workout_id", async () => {
  http.onPost("/workouts/drafts").reply(201, { id: "d1", clientId: "c1", status: "OPEN" })
  renderWithQuery(<WorkoutReadView workout={makeWorkoutDetail()} />)
  await waitFor(() => expect(screen.getByRole("button", { name: "Revisar esta ficha" })).toBeEnabled())
  await userEvent.click(screen.getByRole("button", { name: "Revisar esta ficha" }))
  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/clientes/c1/rascunhos/d1"))
  expect(JSON.parse(http.history.post[0].data)).toEqual({ clientId: "c1", sourceWorkoutId: "w-older" })
})
it("removes_readable_workout_after_revision_access_denial", async () => {
  http.onGet("/workouts/drafts").reply(403)
  renderWithQuery(<WorkoutReadView workout={makeWorkoutDetail()} />)
  expect(await screen.findByText("Restabeleça seu acesso")).toBeVisible()
  expect(screen.queryByText("Mesociclo Base — Força")).not.toBeInTheDocument()
})
it("shows_server_finalization_date_and_links_selected_origin_without_clinical_version", () => {
  renderWithQuery(<WorkoutReadView workout={makeWorkoutDetail({ finalizedAt: "2026-10-18T12:00:00Z", revisionOfId: "w-origin" })} />)
  expect(screen.getByText("Finalizada em 18 de outubro de 2026")).toBeVisible()
  expect(screen.queryByText("Registro legado")).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Consultar ficha de origem" })).toHaveAttribute("href", "/clientes/c1/treinos/w-origin")
})

afterEach(() => vi.unstubAllGlobals())


it("saved_demonstration_never_fetches_current_library_and_media_failure_keeps_prescription", async () => {
  const detail = makeWorkoutDetail()
  detail.splits[0].exercises[0].demonstrationSnapshot = {
    revision: "historical-r1",
    instruction: "Orientação salva antes da alteração do catálogo.",
    assets: [{
      id: "saved-asset", type: "IMAGE", displayAllowed: true,
      url: "https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/exercise-squat.svg",
      alt: "Agachamento salvo", author: "Autoria histórica", licenseName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", sourcePageUrl: "https://github.com/bryllim/workout-guide",
    }],
  }
  const view = renderWithQuery(<WorkoutReadView workout={detail} />)
  const trigger = screen.getByRole("button", { name: "Ver execução de Agachamento Livre" })
  expect(trigger).toHaveClass("print:hidden")
  await userEvent.click(trigger)
  const dialog = screen.getByRole("dialog")
  expect(dialog).toHaveClass("print:hidden")
  expect(within(dialog).getByText("Orientação salva antes da alteração do catálogo.")).toBeVisible()
  expect(within(dialog).getByText("Autoria: Autoria histórica")).toBeVisible()
  const revoked = structuredClone(detail)
  revoked.splits[0].exercises[0].demonstrationSnapshot!.assets![0].displayAllowed = false
  view.rerender(<WorkoutReadView workout={revoked} />)
  expect(within(dialog).queryByRole("img")).toBeNull()
  view.rerender(<WorkoutReadView workout={detail} />)
  fireEvent.error(within(dialog).getByRole("img"))
  expect(within(dialog).getByText("Demonstração indisponível")).toBeVisible()
  expect(within(dialog).getByText("Orientação salva antes da alteração do catálogo.")).toBeVisible()
  await userEvent.click(within(dialog).getByRole("button", { name: "Fechar" }))
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  expect(trigger).toHaveFocus()
  expect(screen.getByRole("region", { name: "Treino A" })).toHaveTextContent("Controlar descida")
  expect(screen.getByRole("button", { name: "Imprimir ficha salva" })).toBeEnabled()
  expect(screen.getByRole("button", { name: "Revisar esta ficha" })).toBeEnabled()
  expect(http.history.get.filter(request => request.url?.includes("exercise-library"))).toHaveLength(0)
})
