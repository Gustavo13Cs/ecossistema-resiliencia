import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { makeTestClient } from "@/test/client-fixture"
import { PhysioClientRecord } from "./PhysioClientRecord"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: { sub: "physio-1", role: "PHYSIO" } }),
}))

const http = new AxiosMockAdapter(api)

const assessmentFixture = {
  id: "pa-1",
  date: "2026-11-01T10:00:00Z",
  chiefComplaint: "Dor anterior no joelho",
  historyOfIllness: "Início há 3 semanas ao correr",
  painLevel: 7,
  posturalAnalysis: "Valgo dinâmico à esquerda",
  palpation: "Sensibilidade em tendão patelar",
  jointMobility: "Flexão de joelho 115 graus",
  orthopedicTests: "Teste de Clarke (+)",
  bodyPainMap: [
    {
      region: "Joelho direito",
      view: "ANTERIOR",
      intensity: 7,
      symptomType: "SHARP",
    },
  ],
  goniometry: [
    {
      joint: "Joelho",
      movement: "Flexão",
      side: "RIGHT",
      activeDeg: 115,
      passiveDeg: 122,
      referenceDeg: 140,
    },
    {
      joint: "Joelho",
      movement: "Flexão",
      side: "LEFT",
      activeDeg: 138,
      passiveDeg: 140,
      referenceDeg: 140,
    },
  ],
  muscleStrength: [
    {
      muscleGroup: "Quadríceps",
      side: "RIGHT",
      grade: 4,
      painOnResistance: true,
    },
  ],
  orthopedicTestItems: [
    {
      region: "Joelho",
      testName: "Lachman",
      side: "RIGHT",
      result: "NEGATIVE",
    },
  ],
  treatmentPlan: "Analgesia e controle de carga",
  clientId: "c1",
  createdAt: "2026-11-01T10:00:00Z",
  updatedAt: "2026-11-01T10:00:00Z",
}

const evolutionFixture = {
  id: "evo-1",
  clientId: "c1",
  appointmentId: null,
  rehabPlanId: "plan-1",
  sessionDate: "2026-11-10T14:00:00Z",
  painBefore: 6,
  painAfter: 3,
  proceduresApplied: ["TENS", "Isometria de quadríceps"],
  patientResponse: "Tolerou bem sem aumento de dor pós-sessão.",
  nextSteps: "Evoluir para extensão em cadeia fechada",
  createdAt: "2026-11-10T15:00:00Z",
  updatedAt: "2026-11-10T15:00:00Z",
  appointment: null,
  rehabPlan: { id: "plan-1", title: "Reabilitação Patelar" },
}

const overviewFixture = {
  client: { id: "c1", status: "ACTIVE" },
  activePlan: {
    id: "plan-1",
    clientId: "c1",
    title: "Reabilitação Patelar",
    goal: "Reduzir sobrecarga patelofemoral",
    durationWeeks: 6,
    notes: "Aplicar gelo 15 min após treino",
    sessions: [
      {
        id: "s1",
        name: "Fase 1 - Analgésica",
        focus: "Controle de dor",
        exercises: [
          { id: "ex1", name: "TENS" },
          { id: "ex2", name: "Isometria de quadríceps" },
        ],
      },
    ],
  },
  recentAssessments: [assessmentFixture],
  recentEvolutions: [evolutionFixture],
  unlinkedAppointments: [],
  painSeries: [
    {
      id: "pa-1",
      date: "2026-11-01T10:00:00Z",
      source: "ASSESSMENT",
      painLevel: 7,
      painBefore: null,
      painAfter: null,
    },
    {
      id: "evo-1",
      date: "2026-11-10T14:00:00Z",
      source: "SESSION",
      painLevel: null,
      painBefore: 6,
      painAfter: 3,
    },
  ],
}

function mount(archived = false) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return {
    cache,
    ...render(
      <QueryClientProvider client={cache}>
        <PhysioClientRecord
          client={makeTestClient("c1", "Marina", archived ? "ARCHIVED" : "ACTIVE")}
          pending={false}
        />
      </QueryClientProvider>,
    ),
  }
}

describe("PhysioClientRecord", () => {
  beforeEach(() => {
    http.reset()
    http.onGet("/rehab-plans/client/c1/overview").reply(200, overviewFixture)
    http.onGet("/physio-assessments/client/c1").reply(200, [assessmentFixture])
    http.onGet("/rehab-plans/evolutions/client/c1").reply(200, [evolutionFixture])
    http.onGet("/rehab-plans/scales/client/c1").reply(200, [])
  })

  afterEach(cleanup)

  it("renders active plan, assessments, session timeline and pain table view", async () => {
    const user = userEvent.setup()
    mount()

    expect(await screen.findByText("Reabilitação Patelar")).toBeVisible()
    const latestAssessment = screen.getByRole("region", {
      name: "Avaliação mais recente",
    })
    expect(
      within(latestAssessment).getByText("Dor anterior no joelho"),
    ).toBeVisible()
    expect(
      screen.getByText("Tolerou bem sem aumento de dor pós-sessão."),
    ).toBeVisible()

    const painSection = screen.getByRole("region", {
      name: "Evolução da dor (EVA)",
    })
    await user.click(within(painSection).getByRole("button", { name: "Tabela" }))
    expect(within(painSection).getByText("7/10")).toBeVisible()
    expect(within(painSection).getByText("6/10")).toBeVisible()
    expect(within(painSection).getByText("3/10")).toBeVisible()

    const history = screen.getByRole("region", {
      name: "Avaliações fisioterapêuticas registradas",
    })
    expect(within(history).getByText("Teste de Clarke (+)")).toBeInTheDocument()
    expect(
      within(history).getByText("Lachman (Direito): Negativo (-)"),
    ).toBeInTheDocument()
    const romSection = screen.getByRole("region", {
      name: "Evolução e simetria de ADM (Goniometria)",
    })
    expect(
      within(romSection).getByText(/Assimetria bilateral: Joelho \(Flexão\)/i),
    ).toBeVisible()
  })

  it("creates, edits, and deletes session evolutions", async () => {
    const user = userEvent.setup()
    http.onPost("/rehab-plans/evolutions").reply(201, {
      ...evolutionFixture,
      id: "evo-2",
      patientResponse: "Nova evolução salva",
    })
    http.onPatch("/rehab-plans/evolutions/evo-1").reply(200, {
      ...evolutionFixture,
      patientResponse: "Evolução editada",
    })
    http.onDelete("/rehab-plans/evolutions/evo-1").reply(200, {
      id: "evo-1",
      clientId: "c1",
    })

    mount()
    await screen.findByText("Tolerou bem sem aumento de dor pós-sessão.")

    // Create new evolution using active plan chip
    await user.click(screen.getByRole("button", { name: "Registrar evolução" }))
    await user.click(
      await screen.findByRole("button", { name: "Isometria de quadríceps" }),
    )
    await user.type(
      screen.getByLabelText(/Evolução e resposta do paciente/i),
      "Nova evolução salva",
    )
    await user.click(screen.getByRole("button", { name: "Salvar evolução" }))

    await waitFor(() => expect(http.history.post).toHaveLength(1))
    expect(JSON.parse(http.history.post[0].data as string)).toMatchObject({
      clientId: "c1",
      rehabPlanId: "plan-1",
      proceduresApplied: ["Isometria de quadríceps"],
      patientResponse: "Nova evolução salva",
    })

    // Edit existing evolution
    await user.click(screen.getByRole("button", { name: /Editar evolução de/i }))
    const responseBox = await screen.findByLabelText(
      /Evolução e resposta do paciente/i,
    )
    await user.clear(responseBox)
    await user.type(responseBox, "Evolução editada")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))
    await waitFor(() => expect(http.history.patch).toHaveLength(1))

    // Delete existing evolution with confirmation
    await user.click(screen.getByRole("button", { name: /Excluir evolução de/i }))
    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }))
    await waitFor(() => expect(http.history.delete).toHaveLength(1))
  })

  it("keeps archived record readable while disabling new writes", async () => {
    mount(true)

    expect(await screen.findByText("Reabilitação Patelar")).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Registrar evolução" }),
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Nova avaliação fisioterapêutica" }),
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Aplicar escala funcional" }),
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Prescrever protocolo" }),
    ).toBeDisabled()
  })

  it("clears clinical content on 403 denial", async () => {
    const { cache } = mount()
    await screen.findByText("Reabilitação Patelar")

    http.onGet("/rehab-plans/evolutions/client/c1").reply(403)
    await act(async () => {
      await cache.invalidateQueries({
        queryKey: queryKeys.physioEvolutions("physio-1", "c1"),
      })
    })

    expect(await screen.findByText("Restabeleça seu acesso")).toBeVisible()
    expect(screen.queryByText("Reabilitação Patelar")).not.toBeInTheDocument()
  })
})
