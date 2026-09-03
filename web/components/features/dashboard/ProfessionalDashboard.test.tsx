import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AuthUser, ProfessionalRole } from "@/types/auth"
import type { Client, ClientStatus } from "@/types/client"
import { ProfessionalDashboard } from "./ProfessionalDashboard"

type DashboardStatus =
  | "loading"
  | "ready"
  | "empty"
  | "network-error"
  | "server-error"
  | "unauthorized"

const authState = vi.hoisted(() => ({
  user: null as AuthUser | null,
}))

const dashboardState = vi.hoisted(() => ({
  activeClients: [] as Client[],
  archivedClients: [] as Client[],
  recentClients: [] as Client[],
  status: "ready" as DashboardStatus,
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock("@/hooks/features/useProfessionalDashboard", () => ({
  useProfessionalDashboard: () => dashboardState,
}))

const makeClient = (id: string, name: string, status: ClientStatus): Client => ({
  id,
  professionalId: "professional-one",
  name,
  email: null,
  phone: null,
  birthDate: null,
  gender: null,
  goal: null,
  height: null,
  initialWeight: null,
  allergies: null,
  pathologies: null,
  typicalSleep: null,
  stressLevel: null,
  foodRelationship: null,
  psychologyHistory: null,
  exerciseType: null,
  exerciseFrequency: null,
  exerciseDuration: null,
  hasPersonal: null,
  workActivityLevel: null,
  professionalNotes: null,
  privacyNotes: null,
  status,
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-30T12:00:00.000Z",
})

const renderDashboardAs = (role: ProfessionalRole) => {
  authState.user = {
    sub: `professional-${role.toLowerCase()}`,
    role,
    name: "Ana Lima",
    email: "ana@example.test",
  }

  return render(<ProfessionalDashboard />)
}

describe("ProfessionalDashboard", () => {
  beforeEach(() => {
    dashboardState.activeClients = [
      makeClient("ana", "Ana Souza", "ACTIVE"),
      makeClient("bia", "Bia Lima", "ACTIVE"),
    ]
    dashboardState.archivedClients = [
      makeClient("caio", "Caio Rocha", "ARCHIVED"),
    ]
    dashboardState.recentClients = dashboardState.activeClients
    dashboardState.status = "ready"
  })

  afterEach(() => {
    cleanup()
    authState.user = null
  })

  it.each([
    ["NUTRITIONIST", "cliente", "clientes"],
    ["PERSONAL", "aluno", "alunos"],
    ["PHYSIO", "paciente", "pacientes"],
  ] as const)(
    "shows only real client actions with $role terminology",
    (role, singular, plural) => {
      renderDashboardAs(role)

      const actions = screen.getByRole("navigation", { name: "Ações rápidas" })
      expect(
        within(actions).getByRole("link", { name: new RegExp(`novo ${singular}`, "i") }),
      ).toHaveAttribute("href", "/clientes/novo")
      expect(
        within(actions).getByRole("link", { name: new RegExp(`ver ${plural}`, "i") }),
      ).toHaveAttribute("href", "/clientes")
      expect(
        within(actions).getByRole("link", { name: new RegExp(`${plural} arquivados`, "i") }),
      ).toHaveAttribute("href", "/clientes?status=ARCHIVED")
      expect(
        within(actions).queryByText(/dieta|alimento|reabilita|treino|agenda|avaliação/i),
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole("region", { name: new RegExp(`${plural} recentes`, "i") }),
      ).toBeInTheDocument()
    },
  )

  it("renders only client-backed summary values and recent records", () => {
    renderDashboardAs("NUTRITIONIST")

    const summary = screen.getByRole("region", { name: "Resumo da base" })
    expect(within(summary).getByText("2")).toBeInTheDocument()
    expect(within(summary).getByText("1")).toBeInTheDocument()
    const recent = screen.getByRole("region", { name: "Clientes recentes" })
    expect(within(recent).getByRole("link", { name: /abrir prontuário de ana souza/i })).toHaveAttribute(
      "href",
      "/clientes/ana",
    )
    expect(within(recent).getByText("Bia Lima")).toBeInTheDocument()
    expect(
      screen.queryByText(/alerta|inativ|progresso|todos.*em dia|tudo em ordem|agenda/i),
    ).not.toBeInTheDocument()
  })

  it.each([
    ["loading", "status", "Carregando sua visão geral"],
    ["empty", "status", "Sua base começa aqui"],
    ["unauthorized", "alert", "Base privada indisponível"],
    ["network-error", "alert", "Sem conexão com o SafeMove"],
    ["server-error", "alert", "SafeMove temporariamente indisponível"],
  ] as const)(
    "announces the %s state without collapsing it into another outcome",
    (status, role, title) => {
      dashboardState.status = status
      dashboardState.activeClients = []
      dashboardState.archivedClients = []
      dashboardState.recentClients = []

      renderDashboardAs("PHYSIO")

      expect(screen.getByRole(role, { name: title })).toBeInTheDocument()
    },
  )
})
