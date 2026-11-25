import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { AuthUser } from "@/types/auth"
import { ProfessionalDashboard } from "../dashboard/ProfessionalDashboard"

const auth = vi.hoisted(() => ({
  user: { sub: "physio-1", role: "PHYSIO", name: "Dra. Lia" } as AuthUser | null,
}))
const navigation = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))
vi.mock("next/navigation", () => ({ useRouter: () => navigation }))

const http = new AxiosMockAdapter(api)

const workspaceFixture = {
  counts: {
    activePatients: 5,
    archivedPatients: 1,
    completedWithoutEvolution: 1,
    withoutActivePlan: 1,
    overdueReassessments: 1,
    painWorsening: 1,
  },
  items: [
    {
      clientId: "p1",
      name: "Carlos Mendes",
      goal: "Pós-op LCA",
      updatedAt: "2026-11-24T10:00:00Z",
      section: "COMPLETED_WITHOUT_EVOLUTION",
      appointmentId: "appt-1",
      appointmentStartsAt: "2026-11-24T11:00:00Z",
      appointmentKind: "SESSION",
    },
    {
      clientId: "p2",
      name: "Marina Silva",
      goal: "Lombalgia",
      updatedAt: "2026-11-24T09:00:00Z",
      section: "PAIN_WORSENING",
      previousPain: 4,
      latestPain: 7,
    },
    {
      clientId: "p3",
      name: "João Costa",
      goal: "Manguito",
      updatedAt: "2026-11-23T09:00:00Z",
      section: "OVERDUE_REASSESSMENT",
      lastAssessmentDate: null,
    },
    {
      clientId: "p4",
      name: "Ana Paula",
      goal: "Entorse",
      updatedAt: "2026-11-22T09:00:00Z",
      section: "WITHOUT_ACTIVE_PLAN",
    },
    {
      clientId: "p1",
      name: "Carlos Mendes",
      goal: "Pós-op LCA",
      updatedAt: "2026-11-24T10:00:00Z",
      section: "RECENT",
    },
  ],
  evolvedAppointmentIds: ["appt-done"],
}

function mount() {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return {
    cache,
    ...render(
      <QueryClientProvider client={cache}>
        <ProfessionalDashboard />
      </QueryClientProvider>,
    ),
  }
}

describe("PhysioDashboard", () => {
  beforeEach(() => {
    http.reset()
    auth.user = { sub: "physio-1", role: "PHYSIO", name: "Dra. Lia" }
    http.onGet("/rehab-plans/workspace").reply(200, workspaceFixture)
    http.onGet("/appointments").reply(200, [
      {
        id: "appt-today",
        professionalId: "physio-1",
        clientId: "p2",
        kind: "SESSION",
        status: "CONFIRMED",
        modality: "IN_PERSON",
        startsAt: "2026-11-24T13:00:00Z",
        endsAt: "2026-11-24T14:00:00Z",
        timeZone: "America/Sao_Paulo",
        location: "Consultório 1",
        meetingUrl: null,
        notes: null,
        cancellationReason: null,
        cancelledAt: null,
        createdAt: "2026-11-20T12:00:00Z",
        updatedAt: "2026-11-20T12:00:00Z",
        client: { id: "p2", name: "Marina Silva", status: "ACTIVE" },
      },
      {
        id: "appt-done",
        professionalId: "physio-1",
        clientId: "p1",
        kind: "SESSION",
        status: "COMPLETED",
        modality: "IN_PERSON",
        startsAt: "2026-11-24T10:00:00Z",
        endsAt: "2026-11-24T11:00:00Z",
        timeZone: "America/Sao_Paulo",
        location: "Consultório 1",
        meetingUrl: null,
        notes: null,
        cancellationReason: null,
        cancelledAt: null,
        createdAt: "2026-11-20T12:00:00Z",
        updatedAt: "2026-11-20T12:00:00Z",
        client: { id: "p1", name: "Carlos Mendes", status: "ACTIVE" },
      },
    ])
    navigation.push.mockReset()
  })

  afterEach(cleanup)

  it("renders operational queues, agenda evolution action, and evolved badge", async () => {
    mount()

    expect(
      await screen.findByRole("heading", { name: "Área de fisioterapia" }),
    ).toBeVisible()
    expect(await screen.findByText("5")).toBeVisible()

    const agendaSection = screen.getByRole("region", {
      name: "Atendimentos de hoje",
    })
    expect(
      await within(agendaSection).findByText("Sessão evoluída"),
    ).toBeVisible()
    expect(
      within(agendaSection).getByRole("button", {
        name: "Registrar evolução de Marina Silva",
      }),
    ).toBeEnabled()

    const worsening = screen.getByRole("region", {
      name: "Pacientes com dor em piora",
    })
    expect(within(worsening).getByText("EVA 4 → 7/10")).toBeVisible()

    const pendingPlan = screen.getByRole("region", {
      name: "Pacientes sem protocolo ativo",
    })
    expect(
      within(pendingPlan).getByRole("link", { name: "Prescrever protocolo" }),
    ).toHaveAttribute("href", "/clientes/p4/nova-reabilitacao")

    expect(http.history.get.map((r) => r.url)).not.toContain("/clients")
  })

  it("opens evolution dialog from completed-without-evolution queue and submits", async () => {
    const user = userEvent.setup()
    http.onGet("/rehab-plans/client/p1/active").reply(200, {
      id: "plan-1",
      title: "Protocolo LCA",
      sessions: [
        {
          id: "s1",
          name: "Fase 1",
          exercises: [{ id: "e1", name: "TENS" }],
        },
      ],
    })
    http.onPost("/rehab-plans/evolutions").reply(201, {
      id: "evo-new",
      clientId: "p1",
      appointmentId: "appt-1",
      rehabPlanId: "plan-1",
      sessionDate: "2026-11-24T11:00:00Z",
      painBefore: 6,
      painAfter: 3,
      proceduresApplied: ["TENS"],
      patientResponse: "Boa resposta analgésica",
      nextSteps: null,
      createdAt: "2026-11-24T12:00:00Z",
      updatedAt: "2026-11-24T12:00:00Z",
      appointment: null,
      rehabPlan: { id: "plan-1", title: "Protocolo LCA" },
    })

    mount()
    const queue = await screen.findByRole("region", {
      name: "Sessões concluídas sem evolução",
    })
    await user.click(within(queue).getByRole("button", { name: "Registrar evolução" }))

    expect(
      await screen.findByRole("heading", { name: "Registrar evolução de sessão" }),
    ).toBeVisible()
    await user.click(await screen.findByRole("button", { name: "TENS" }))
    await user.type(
      screen.getByLabelText("Dor inicial — EVA (0 a 10)"),
      "6",
    )
    await user.type(
      screen.getByLabelText("Dor final — EVA (0 a 10)"),
      "3",
    )
    await user.type(
      screen.getByLabelText(/Evolução e resposta do paciente/i),
      "Boa resposta analgésica",
    )
    await user.click(screen.getByRole("button", { name: "Salvar evolução" }))

    await screen.findByRole("region", { name: "Atendimentos de hoje" })
    expect(http.history.post).toHaveLength(1)
    expect(JSON.parse(http.history.post[0].data as string)).toMatchObject({
      clientId: "p1",
      appointmentId: "appt-1",
      rehabPlanId: "plan-1",
      painBefore: 6,
      painAfter: 3,
      proceduresApplied: ["TENS"],
      patientResponse: "Boa resposta analgésica",
    })
  })

  it("distinguishes new empty and archived-only accounts", async () => {
    http.onGet("/rehab-plans/workspace").reply(200, {
      counts: {
        activePatients: 0,
        archivedPatients: 2,
        completedWithoutEvolution: 0,
        withoutActivePlan: 0,
        overdueReassessments: 0,
        painWorsening: 0,
      },
      items: [],
      evolvedAppointmentIds: [],
    })
    const view = mount()
    expect(
      await screen.findByText("Sua base tem apenas pacientes arquivados"),
    ).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Ver pacientes arquivados" }),
    ).toHaveAttribute("href", "/clientes?status=ARCHIVED")
    view.unmount()

    http.onGet("/rehab-plans/workspace").reply(200, {
      counts: {
        activePatients: 0,
        archivedPatients: 0,
        completedWithoutEvolution: 0,
        withoutActivePlan: 0,
        overdueReassessments: 0,
        painWorsening: 0,
      },
      items: [],
      evolvedAppointmentIds: [],
    })
    mount()
    expect(await screen.findByText("Sua base começa aqui")).toBeVisible()
  })

  it("removes usable clinical content on 403 even with cached success", async () => {
    const { cache } = mount()
    await screen.findAllByText("Carlos Mendes")

    http.onGet("/rehab-plans/workspace").reply(403)
    await act(async () => {
      await cache.invalidateQueries({
        queryKey: queryKeys.physioWorkspace("physio-1"),
      })
    })

    expect(await screen.findByText("Restabeleça seu acesso")).toBeVisible()
    expect(screen.queryByText("Carlos Mendes")).not.toBeInTheDocument()
  })
})
