import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type {
  PhysioAssessmentRecord,
  PhysioDischargeRecord,
  PhysioManagementReport,
  PhysioSessionPackageRecord,
} from "@/types/physio"
import { PhysioDashboard } from "./PhysioDashboard"
import { PhysioDischargeDialog } from "./PhysioDischargeDialog"
import { PhysioDischargeSection } from "./PhysioDischargeSection"
import { PhysioDocumentDialog } from "./PhysioDocumentDialog"
import { PhysioManagementReportsView } from "./PhysioManagementReportsView"
import { PhysioPackageDialog } from "./PhysioPackageDialog"
import { PhysioPackagesSection } from "./PhysioPackagesSection"

const openPrintWindowMock = vi.hoisted(() => vi.fn())
const navigation = vi.hoisted(() => ({ push: vi.fn() }))

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

const packageFixture: PhysioSessionPackageRecord = {
  id: "pkg-1",
  clientId: "c1",
  title: "Pacote Joelho 10 sessões",
  totalSessions: 10,
  reassessEverySessions: 5,
  startedAt: "2026-11-01T10:00:00.000Z",
  expiresAt: null,
  status: "ACTIVE",
  notes: "Guia autorizada #42",
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-20T10:00:00.000Z",
  completedSessions: 9,
  remainingSessions: 1,
  progressLabel: "9/10 sessões",
  noShowCount: 2,
  cancelledCount: 1,
  evolutionsSinceAssessment: 6,
  reassessmentDue: true,
  nearingEnd: true,
}

const assessmentsFixture: PhysioAssessmentRecord[] = [
  {
    id: "pa-1",
    date: "2026-11-01T10:00:00.000Z",
    chiefComplaint: "Dor anterior no joelho",
    historyOfIllness: null,
    painLevel: 8,
    posturalAnalysis: null,
    palpation: null,
    jointMobility: null,
    orthopedicTests: null,
    bodyPainMap: null,
    goniometry: [
      {
        joint: "Joelho",
        movement: "Flexão",
        side: "RIGHT",
        activeDeg: 105,
        passiveDeg: 112,
        referenceDeg: 140,
      },
    ],
    muscleStrength: null,
    orthopedicTestItems: null,
    treatmentPlan: "Analgesia inicial",
    clientId: "c1",
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  },
  {
    id: "pa-2",
    date: "2026-11-24T10:00:00.000Z",
    chiefComplaint: "Sem dor aos esforços leves",
    historyOfIllness: null,
    painLevel: 2,
    posturalAnalysis: null,
    palpation: null,
    jointMobility: null,
    orthopedicTests: null,
    bodyPainMap: null,
    goniometry: [
      {
        joint: "Joelho",
        movement: "Flexão",
        side: "RIGHT",
        activeDeg: 132,
        passiveDeg: 135,
        referenceDeg: 140,
      },
    ],
    muscleStrength: null,
    orthopedicTestItems: null,
    treatmentPlan: "Alta programada",
    clientId: "c1",
    createdAt: "2026-11-24T10:00:00.000Z",
    updatedAt: "2026-11-24T10:00:00.000Z",
  },
]

const dischargeFixture: PhysioDischargeRecord = {
  id: "disc-1",
  clientId: "c1",
  rehabPlanId: "plan-1",
  initialAssessmentId: "pa-1",
  finalAssessmentId: "pa-2",
  dischargedAt: "2026-11-25T12:00:00.000Z",
  reason: "GOALS_MET",
  sessionsCompleted: 10,
  initialPainLevel: 8,
  finalPainLevel: 2,
  clinicalSummary: "Objetivos funcionais atingidos com retorno esportivo.",
  recommendations: "Manter programa preventivo 2x/semana.",
  comparisonSnapshot: {
    initialPainLevel: 8,
    finalPainLevel: 2,
    painDelta: 6,
    sessionsCompleted: 10,
    romComparisons: [
      {
        joint: "Joelho",
        movement: "Flexão",
        side: "RIGHT",
        initialDeg: 105,
        finalDeg: 132,
        gainDeg: 27,
      },
    ],
    scaleComparisons: [],
  },
  createdAt: "2026-11-25T12:00:00.000Z",
  updatedAt: "2026-11-25T12:00:00.000Z",
  rehabPlan: { id: "plan-1", title: "Protocolo Joelho" },
}

describe("Physio P4 management, packages, documents and discharge UI", () => {
  beforeEach(() => {
    http.reset()
    openPrintWindowMock.mockReset()
    openPrintWindowMock.mockReturnValue({} as Window)
  })

  afterEach(cleanup)

  it("renders session package alerts and creates/completes/deletes packages", async () => {
    const user = userEvent.setup()
    const { Wrapper } = createWrapper()

    http.onPost("/rehab-plans/packages").reply(201, packageFixture)
    http
      .onPatch("/rehab-plans/packages/pkg-1")
      .reply(200, { ...packageFixture, status: "COMPLETED" })
    http.onDelete("/rehab-plans/packages/pkg-1").reply(200, { id: "pkg-1" })

    const onOpenChange = vi.fn()
    const { unmount } = render(
      <Wrapper>
        <PhysioPackageDialog
          open={true}
          onOpenChange={onOpenChange}
          clientId="c1"
          clientName="Marina"
        />
      </Wrapper>,
    )

    await user.click(screen.getByRole("button", { name: "Criar pacote" }))
    await waitFor(() => expect(http.history.post).toHaveLength(1))
    expect(JSON.parse(http.history.post[0].data as string)).toMatchObject({
      clientId: "c1",
      totalSessions: 10,
      reassessEverySessions: 5,
    })
    unmount()

    render(
      <Wrapper>
        <PhysioPackagesSection
          clientId="c1"
          packages={[packageFixture]}
          isPending={false}
          isError={false}
          blocked={false}
          onCreateNew={vi.fn()}
          onEdit={vi.fn()}
        />
      </Wrapper>,
    )

    expect(screen.getByText("9/10 sessões · 1 restante")).toBeVisible()
    expect(screen.getByText("Reavaliação recomendada")).toBeVisible()
    expect(screen.getByText("Pacote perto do fim")).toBeVisible()
    expect(screen.getByText("2 faltas")).toBeVisible()

    await user.click(screen.getByRole("button", { name: "Concluir" }))
    await waitFor(() => expect(http.history.patch).toHaveLength(1))

    await user.click(
      screen.getByRole("button", {
        name: "Excluir pacote Pacote Joelho 10 sessões",
      }),
    )
    await user.click(
      screen.getByRole("button", { name: "Confirmar exclusão do pacote" }),
    )
    await waitFor(() => expect(http.history.delete).toHaveLength(1))
  })

  it("emits all three COFFITO documents with opt-in CID privacy toggle", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const { Wrapper } = createWrapper()

    render(
      <Wrapper>
        <PhysioDocumentDialog
          open={true}
          onOpenChange={onOpenChange}
          clientName="Marina Silva"
          assessments={assessmentsFixture}
          evolutions={[]}
          scales={[]}
          activePlan={null}
          appointments={[]}
        />
      </Wrapper>,
    )

    await user.click(screen.getByRole("button", { name: "Gerar PDF A4" }))
    expect(openPrintWindowMock).toHaveBeenCalledTimes(1)
    expect(openPrintWindowMock.mock.calls[0][0]).toContain(
      "Declaração de Comparecimento",
    )

    await user.click(screen.getByRole("tab", { name: "Atestado" }))
    await user.click(screen.getByRole("button", { name: "Gerar PDF A4" }))
    expect(openPrintWindowMock).toHaveBeenCalledTimes(2)
    expect(openPrintWindowMock.mock.calls[1][0]).not.toContain(
      "Autorizo o registro e a divulgação",
    )

    await user.click(
      screen.getByLabelText(/Incluir código \/ diagnóstico/i),
    )
    await user.type(
      screen.getByLabelText("Código ou diagnóstico autorizado"),
      "CID M54.5",
    )
    await user.click(screen.getByRole("button", { name: "Gerar PDF A4" }))
    expect(openPrintWindowMock).toHaveBeenCalledTimes(3)
    expect(openPrintWindowMock.mock.calls[2][0]).toContain("CID M54.5")

    await user.click(screen.getByRole("tab", { name: "Relatório Médico" }))
    await user.click(screen.getByRole("button", { name: "Gerar PDF A4" }))
    expect(openPrintWindowMock).toHaveBeenCalledTimes(4)
    expect(openPrintWindowMock.mock.calls[3][0]).toContain(
      "Relatório Fisioterapêutico",
    )
  })

  it("registers discharge with comparison preview, prints discharge PDF, and renders section", async () => {
    const user = userEvent.setup()
    const { Wrapper } = createWrapper()
    http.onPost("/rehab-plans/discharges").reply(201, dischargeFixture)
    http.onDelete("/rehab-plans/discharges/disc-1").reply(200, { id: "disc-1" })

    const { unmount } = render(
      <Wrapper>
        <PhysioDischargeDialog
          open={true}
          onOpenChange={vi.fn()}
          clientId="c1"
          clientName="Marina Silva"
          assessments={assessmentsFixture}
          evolutionsCount={10}
          activePlan={{
            id: "plan-1",
            title: "Protocolo Joelho",
            clientId: "c1",
            goal: "Retorno esportivo",
            isActive: true,
            sessions: [],
          }}
          activePackage={packageFixture}
        />
      </Wrapper>,
    )

    const preview = screen.getByLabelText("Prévia comparativa da alta")
    expect(within(preview).getByText("8 → 2/10 (-6 pts)")).toBeVisible()

    await user.click(
      screen.getByRole("button", { name: /Salvar e imprimir relatório/i }),
    )
    await waitFor(() => expect(http.history.post).toHaveLength(1))
    expect(JSON.parse(http.history.post[0].data as string)).toMatchObject({
      clientId: "c1",
      reason: "GOALS_MET",
      rehabPlanId: "plan-1",
      initialAssessmentId: "pa-1",
      finalAssessmentId: "pa-2",
      initialPainLevel: 8,
      finalPainLevel: 2,
      deactivateActivePlan: true,
    })
    expect(openPrintWindowMock).toHaveBeenCalledTimes(1)
    expect(openPrintWindowMock.mock.calls[0][0]).toContain(
      "Relatório de Alta Fisioterapêutica",
    )
    unmount()

    render(
      <Wrapper>
        <PhysioDischargeSection
          clientId="c1"
          clientName="Marina Silva"
          discharges={[dischargeFixture]}
          isPending={false}
          isError={false}
          blocked={false}
          onRegisterNew={vi.fn()}
        />
      </Wrapper>,
    )

    await user.click(screen.getByRole("button", { name: "Imprimir alta" }))
    expect(openPrintWindowMock).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole("button", { name: /Excluir alta de/i }))
    await user.click(
      screen.getByRole("button", { name: "Confirmar exclusão da alta" }),
    )
    await waitFor(() => expect(http.history.delete).toHaveLength(1))
  })

  it("renders PhysioManagementReportsView KPIs, switches period and exports PDF/CSV", async () => {
    const user = userEvent.setup()
    const { Wrapper } = createWrapper()

    const report90: PhysioManagementReport = {
      period: "90_DAYS",
      fromDate: "2026-08-27T00:00:00.000Z",
      toDate: "2026-11-25T23:59:59.000Z",
      counts: {
        activePatients: 12,
        archivedPatients: 2,
        completedSessions: 42,
        completedAppointments: 45,
        noShowCount: 3,
        cancelledCount: 2,
        attendanceRatePct: 93.3,
        noShowRatePct: 6.7,
        dischargesCount: 4,
        avgSessionsToDischarge: 9.5,
        avgPainReduction: 4.5,
        activePackagesCount: 5,
        expiringPackagesCount: 1,
      },
      dischargesByReason: {
        GOALS_MET: 3,
        PARTIAL_IMPROVEMENT: 1,
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
          noShowCount: 0,
          cancelledCount: 1,
          activePackageTitle: "Pacote Joelho 10 sessões",
          packageCompletedSessions: 9,
          packageTotalSessions: 10,
          latestDischargeReason: "GOALS_MET",
          dischargedAt: "2026-11-25T12:00:00.000Z",
        },
      ],
    }

    http
      .onGet("/rehab-plans/discharges/reports?period=90_DAYS")
      .reply(200, report90)
    http.onGet("/rehab-plans/discharges/reports?period=30_DAYS").reply(200, {
      ...report90,
      period: "30_DAYS",
      counts: { ...report90.counts, completedSessions: 18 },
    })

    const origCreateObjectUrl = URL.createObjectURL
    const origRevokeObjectUrl = URL.revokeObjectURL
    const createObjectUrlSpy = vi.fn(() => "blob:mock-csv")
    const revokeObjectUrlSpy = vi.fn()
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectUrlSpy,
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectUrlSpy,
    })

    render(
      <Wrapper>
        <PhysioManagementReportsView />
      </Wrapper>,
    )

    expect(
      await screen.findByRole("heading", { name: "Relatórios Gerenciais" }),
    ).toBeVisible()
    expect(screen.getByText("42")).toBeVisible()
    expect(screen.getByText("93.3%")).toBeVisible()
    expect(screen.getByText("-4.5 pts")).toBeVisible()
    expect(screen.getByText("Pacote Joelho 10 sessões (9/10)")).toBeVisible()

    await user.selectOptions(
      screen.getByLabelText("Período do relatório"),
      "30_DAYS",
    )
    expect(await screen.findByText("18")).toBeVisible()

    await user.click(screen.getByRole("button", { name: "Exportar PDF" }))
    expect(openPrintWindowMock).toHaveBeenCalledTimes(1)
    expect(openPrintWindowMock.mock.calls[0][0]).toContain(
      "Relatório Gerencial de Reabilitação",
    )

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }))
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(1)

    if (origCreateObjectUrl) {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        writable: true,
        value: origCreateObjectUrl,
      })
    } else {
      delete (URL as { createObjectURL?: unknown }).createObjectURL
    }
    if (origRevokeObjectUrl) {
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        writable: true,
        value: origRevokeObjectUrl,
      })
    } else {
      delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL
    }
  })

  it("displays expiring packages count and queue in PhysioDashboard", async () => {
    const { Wrapper } = createWrapper()
    http.onGet("/appointments").reply(200, [])
    http.onGet("/rehab-plans/workspace").reply(200, {
      counts: {
        activePatients: 3,
        archivedPatients: 0,
        completedWithoutEvolution: 0,
        withoutActivePlan: 0,
        overdueReassessments: 0,
        painWorsening: 0,
        expiringPackages: 1,
      },
      items: [
        {
          clientId: "p9",
          name: "Fernanda Lima",
          goal: "Ombro",
          updatedAt: "2026-11-24T10:00:00Z",
          section: "EXPIRING_PACKAGE",
          packageTitle: "Pacote Ombro 10",
          completedSessions: 9,
          totalSessions: 10,
        },
      ],
      evolvedAppointmentIds: [],
    })

    render(
      <Wrapper>
        <PhysioDashboard />
      </Wrapper>,
    )

    const queue = await screen.findByRole("region", {
      name: "Pacotes perto do fim",
    })
    expect(within(queue).getByText("Fernanda Lima")).toBeVisible()
    expect(
      within(queue).getByText("Pacote Ombro 10 · 9/10 sessões"),
    ).toBeVisible()
    expect(
      within(queue).getByRole("link", { name: "Ver pacote" }),
    ).toHaveAttribute("href", "/clientes/p9")
  })
})
