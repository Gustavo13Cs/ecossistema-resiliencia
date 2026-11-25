import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { PhysioAssessmentsWorkspace } from "./PhysioAssessmentsWorkspace"
import { PhysioDocumentsHub } from "./PhysioDocumentsHub"
import { PhysioEvolutionWorkspace } from "./PhysioEvolutionWorkspace"
import { PhysioPackagesHub } from "./PhysioPackagesHub"
import { RehabExercisesHub } from "./RehabExercisesHub"
import { RehabTemplatesHub } from "./RehabTemplatesHub"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const openPrintWindowMock = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({ useRouter: () => navigation }))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { sub: "physio-1", role: "PHYSIO", name: "Dra. Camila" },
    isLoading: false,
  }),
}))
vi.mock("@/lib/print-document", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/print-document")>()
  return {
    ...actual,
    openPrintWindow: openPrintWindowMock,
  }
})

const http = new AxiosMockAdapter(api)

function createWrapper() {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return {
    cache,
    Wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    ),
  }
}

const activeClientFixture = {
  id: "c1",
  name: "Marina Silva",
  status: "ACTIVE",
  updatedAt: "2026-11-24T10:00:00.000Z",
}

const overviewFixture = {
  client: { id: "c1", status: "ACTIVE" },
  activePlan: {
    id: "plan-1",
    clientId: "c1",
    title: "Protocolo LCA",
    goal: "Estabilidade",
    isActive: true,
    sessions: [
      {
        id: "s1",
        name: "Fase 1",
        exercises: [{ id: "e1", name: "Isometria de quadríceps" }],
      },
    ],
  },
  activePackage: null,
  latestDischarge: null,
  recentAssessments: [
    {
      id: "pa-1",
      date: "2026-11-01T10:00:00.000Z",
      chiefComplaint: "Dor anterior no joelho",
      painLevel: 7,
      treatmentPlan: "Analgesia",
    },
  ],
  recentEvolutions: [],
  recentScales: [],
  unlinkedAppointments: [],
  painSeries: [
    {
      id: "pa-1",
      date: "2026-11-01T10:00:00.000Z",
      source: "ASSESSMENT",
      painLevel: 7,
      painBefore: null,
      painAfter: null,
    },
  ],
}

describe("Physio sidebar dedicated hubs", () => {
  beforeEach(() => {
    http.reset()
    navigation.push.mockReset()
    openPrintWindowMock.mockReset()
    openPrintWindowMock.mockReturnValue({} as Window)
  })

  afterEach(cleanup)

  it("renders PhysioAssessmentsWorkspace using /physio-assessments without /assessments and supports functional scales tab", async () => {
    const user = userEvent.setup()
    const { Wrapper } = createWrapper()

    http.onGet("/clients").reply(200, [activeClientFixture])
    http.onGet("/physio-assessments").reply(200, [
      {
        id: "pa-1",
        clientId: "c1",
        date: "2026-11-10T10:00:00.000Z",
        chiefComplaint: "Lombalgia aguda",
        painLevel: 6,
        bodyPainMap: [{ region: "Lombar", view: "POSTERIOR", intensity: 6, symptomType: "SHARP" }],
        goniometry: [],
        muscleStrength: [],
        orthopedicTestItems: [],
        client: { id: "c1", name: "Marina Silva" },
      },
    ])
    http.onGet("/rehab-plans/scales/client/c1").reply(200, [
      {
        id: "scale-1",
        clientId: "c1",
        scaleType: "OSWESTRY",
        evaluatedAt: "2026-11-15T10:00:00.000Z",
        answers: {},
        rawScore: 18,
        normalizedScore: 36,
        scoreUnit: "%",
        classification: "Incapacidade moderada",
        notes: null,
        createdAt: "2026-11-15T10:00:00.000Z",
        updatedAt: "2026-11-15T10:00:00.000Z",
      },
    ])

    render(
      <Wrapper>
        <PhysioAssessmentsWorkspace />
      </Wrapper>,
    )

    expect(await screen.findByText("Lombalgia aguda")).toBeVisible()
    expect(screen.getByText("Mapa de dor: 1")).toBeVisible()
    expect(http.history.get.map((r) => r.url)).not.toContain("/assessments")

    await user.click(screen.getByRole("tab", { name: /Escalas funcionais/i }))
    expect(await screen.findByText("Incapacidade moderada")).toBeVisible()
  })

  it("renders PhysioEvolutionWorkspace priority patients, pain chart and timeline", async () => {
    const { Wrapper } = createWrapper()
    http.onGet("/clients").reply(200, [activeClientFixture])
    http.onGet("/rehab-plans/workspace").reply(200, {
      counts: {
        activePatients: 1,
        archivedPatients: 0,
        completedWithoutEvolution: 0,
        withoutActivePlan: 0,
        overdueReassessments: 0,
        painWorsening: 1,
      },
      items: [
        {
          clientId: "c1",
          name: "Marina Silva",
          goal: "LCA",
          updatedAt: "2026-11-24T10:00:00.000Z",
          section: "PAIN_WORSENING",
          previousPain: 4,
          latestPain: 7,
        },
      ],
      evolvedAppointmentIds: [],
    })
    http.onGet("/rehab-plans/client/c1/overview").reply(200, overviewFixture)
    http.onGet("/rehab-plans/evolutions/client/c1").reply(200, [
      {
        id: "evo-1",
        clientId: "c1",
        appointmentId: null,
        rehabPlanId: "plan-1",
        sessionDate: "2026-11-20T14:00:00.000Z",
        painBefore: 6,
        painAfter: 3,
        proceduresApplied: ["TENS"],
        patientResponse: "Boa resposta analgésica na sessão.",
        nextSteps: null,
        createdAt: "2026-11-20T15:00:00.000Z",
        updatedAt: "2026-11-20T15:00:00.000Z",
        appointment: null,
        rehabPlan: { id: "plan-1", title: "Protocolo LCA" },
      },
    ])
    http.onGet("/rehab-plans/scales/client/c1").reply(200, [])

    render(
      <Wrapper>
        <PhysioEvolutionWorkspace />
      </Wrapper>,
    )

    expect(
      await screen.findByText("Boa resposta analgésica na sessão."),
    ).toBeVisible()
    expect(screen.getByRole("region", { name: "Prioridades de evolução" })).toBeVisible()
    expect(screen.getByRole("region", { name: "Evolução da dor (EVA)" })).toBeVisible()
  })

  it("lists curated rehab protocols in RehabTemplatesHub and applies protocol to patient", async () => {
    const user = userEvent.setup()
    const { Wrapper } = createWrapper()

    http.onGet("/clients").reply(200, [activeClientFixture])
    http.onGet("/rehab-plans/protocol-catalog").reply(200, [
      {
        id: "curated-lca",
        conditionArea: "Joelho",
        title: "Pós-Op Reconstrução LCA",
        goal: "Controle de edema e ganho de extensão",
        durationWeeks: 12,
        notes: "Progresso conforme critérios funcionais.",
        sessions: [
          {
            name: "Fase 1 — Proteção",
            focus: "Analgesia e extensão total",
            estimatedWeeks: 2,
            progressionCriteria: "Extensão 0° sem derrame articular",
            exercises: [{ name: "Elevação de perna estendida", category: "KINESIOTHERAPY" }],
          },
        ],
      },
    ])
    http.onGet("/rehab-plans/templates").reply(200, [])
    http.onPost("/rehab-plans").reply(201, { id: "plan-new", clientId: "c1" })

    render(
      <Wrapper>
        <RehabTemplatesHub />
      </Wrapper>,
    )

    expect(await screen.findByText("Pós-Op Reconstrução LCA")).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Aplicar em paciente" }))
    await user.click(screen.getByRole("button", { name: "Confirmar e aplicar" }))

    await waitFor(() => expect(http.history.post).toHaveLength(1))
    expect(JSON.parse(http.history.post[0].data as string)).toMatchObject({
      clientId: "c1",
      title: "Pós-Op Reconstrução LCA",
      durationWeeks: 12,
    })
    expect(navigation.push).toHaveBeenCalledWith("/clientes/c1")
  })

  it("renders illustrated exercises in RehabExercisesHub", async () => {
    const { Wrapper } = createWrapper()
    http.onGet("/clients").reply(200, [activeClientFixture])
    http.onGet("/rehab-plans/client/c1/active").reply(200, null)
    http.onGet(/\/rehab-plans\/exercise-catalog/).reply(200, [
      {
        id: "cat-core-01",
        name: "Dead Bug",
        muscleGroup: "CORE",
        equipment: "BODYWEIGHT",
        notes: "Estabilização lombar",
        hasIllustration: true,
        demonstration: {
          revision: "1",
          instruction: "Deitar em decúbito dorsal e alternar braço e perna opostos.",
          assets: [
            {
              id: "asset-1",
              type: "IMAGE",
              displayAllowed: true,
              url: "https://upload.wikimedia.org/wikipedia/commons/dead-bug.svg",
              alt: "Ilustração Dead Bug",
              sourcePageUrl: "https://commons.wikimedia.org",
              author: "SafeMove",
              licenseName: "CC BY-SA 4.0",
              licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
            },
          ],
        },
      },
    ])

    render(
      <Wrapper>
        <RehabExercisesHub />
      </Wrapper>,
    )

    expect(await screen.findByText("Dead Bug")).toBeVisible()
    expect(
      screen.getByText(
        "Deitar em decúbito dorsal e alternar braço e perna opostos.",
      ),
    ).toBeVisible()
  })

  it("renders PhysioPackagesHub metrics and patient package actions", async () => {
    const { Wrapper } = createWrapper()
    http.onGet("/clients").reply(200, [activeClientFixture])
    http.onGet("/rehab-plans/workspace").reply(200, {
      counts: {
        activePatients: 1,
        archivedPatients: 0,
        completedWithoutEvolution: 0,
        withoutActivePlan: 0,
        overdueReassessments: 0,
        painWorsening: 0,
        expiringPackages: 1,
      },
      items: [
        {
          clientId: "c1",
          name: "Marina Silva",
          goal: "LCA",
          updatedAt: "2026-11-24T10:00:00.000Z",
          section: "EXPIRING_PACKAGE",
          packageTitle: "Pacote Joelho 10",
          completedSessions: 9,
          totalSessions: 10,
        },
      ],
      evolvedAppointmentIds: [],
    })
    http.onGet("/rehab-plans/discharges/reports?period=90_DAYS").reply(200, {
      period: "90_DAYS",
      fromDate: "2026-08-27T00:00:00.000Z",
      toDate: "2026-11-25T23:59:59.000Z",
      counts: {
        activePatients: 1,
        archivedPatients: 0,
        completedSessions: 9,
        completedAppointments: 10,
        noShowCount: 1,
        cancelledCount: 0,
        attendanceRatePct: 90,
        noShowRatePct: 10,
        dischargesCount: 0,
        avgSessionsToDischarge: null,
        avgPainReduction: null,
        activePackagesCount: 1,
        expiringPackagesCount: 1,
      },
      dischargesByReason: {
        GOALS_MET: 0,
        PARTIAL_IMPROVEMENT: 0,
        MEDICAL_REFERRAL: 0,
        TREATMENT_ABANDONMENT: 0,
        PATIENT_REQUEST: 0,
      },
      items: [
        {
          clientId: "c1",
          name: "Marina Silva",
          status: "ACTIVE",
          completedSessions: 9,
          noShowCount: 1,
          cancelledCount: 0,
          activePackageTitle: "Pacote Joelho 10",
          packageCompletedSessions: 9,
          packageTotalSessions: 10,
          latestDischargeReason: null,
          dischargedAt: null,
        },
      ],
    })
    http.onGet("/rehab-plans/packages/client/c1").reply(200, [
      {
        id: "pkg-1",
        clientId: "c1",
        title: "Pacote Joelho 10",
        totalSessions: 10,
        reassessEverySessions: 5,
        startedAt: "2026-11-01T10:00:00.000Z",
        expiresAt: null,
        status: "ACTIVE",
        notes: null,
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-24T10:00:00.000Z",
        completedSessions: 9,
        remainingSessions: 1,
        progressLabel: "9/10 sessões",
        noShowCount: 1,
        cancelledCount: 0,
        evolutionsSinceAssessment: 4,
        reassessmentDue: false,
        nearingEnd: true,
      },
    ])

    render(
      <Wrapper>
        <PhysioPackagesHub />
      </Wrapper>,
    )

    expect(await screen.findByText("9/10 sessões · 1 restante")).toBeVisible()
    expect(screen.getByText("Perto do fim")).toBeVisible()
  })

  it("opens COFFITO documents directly on selected tab in PhysioDocumentsHub", async () => {
    const user = userEvent.setup()
    const { Wrapper } = createWrapper()

    http.onGet("/clients").reply((config) =>
      config.params?.status === "ARCHIVED"
        ? [200, []]
        : [200, [activeClientFixture]],
    )
    http.onGet("/rehab-plans/client/c1/overview").reply(200, overviewFixture)
    http.onGet("/physio-assessments/client/c1").reply(200, [])
    http.onGet("/rehab-plans/evolutions/client/c1").reply(200, [])
    http.onGet("/rehab-plans/discharges/client/c1").reply(200, [])

    render(
      <Wrapper>
        <PhysioDocumentsHub />
      </Wrapper>,
    )

    const cards = await screen.findByRole("region", {
      name: "Emissão rápida de documentos PDF A4",
    })
    await user.click(within(cards).getByRole("button", { name: "Emitir atestado" }))

    expect(await screen.findByRole("button", { name: "Gerar PDF A4" })).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Gerar PDF A4" }))
    expect(openPrintWindowMock).toHaveBeenCalledTimes(1)
    expect(openPrintWindowMock.mock.calls[0][0]).toContain(
      "Atestado Fisioterapêutico",
    )
  })
})
