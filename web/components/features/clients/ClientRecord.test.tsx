import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ClienteHubPage from "@/app/clientes/[id]/page"
import { api } from "@/lib/api"
import type { ProfessionalRole, UserRole } from "@/types/auth"
import type { Client } from "@/types/client"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const session = vi.hoisted(() => ({ role: "PHYSIO" as UserRole }))
const record = vi.hoisted(() => ({
  status: "ready" as "loading" | "ready" | "not-found" | "unauthorized" | "network-error" | "server-error",
  client: null as Client | null,
  refetch: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "client-one" }),
  useRouter: () => navigation,
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { sub: "professional-one", role: session.role, name: "Ana Lima" },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock("@/hooks/features/useClientRecord", () => ({
  useClientRecord: () => ({
    client: record.client,
    status: record.status,
    error: record.status.endsWith("error") ? new Error("request failed") : null,
    refetch: record.refetch,
  }),
}))

const http = new AxiosMockAdapter(api)

const makeClient = (): Client => ({
  id: "client-one",
  professionalId: "professional-one",
  name: "Marina Lopes",
  email: "marina@example.test",
  phone: null,
  birthDate: null,
  gender: null,
  goal: "Retomar autonomia",
  height: 165,
  initialWeight: 68,
  allergies: "Amendoim",
  pathologies: "Dor lombar",
  typicalSleep: "7 horas",
  stressLevel: 2,
  foodRelationship: "Regular",
  psychologyHistory: null,
  exerciseType: "Pilates",
  exerciseFrequency: "3 vezes por semana",
  exerciseDuration: "45 minutos",
  hasPersonal: "Não",
  workActivityLevel: "Moderado",
  professionalNotes: null,
  privacyNotes: null,
  status: "ACTIVE",
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-09-03T12:00:00.000Z",
})

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(<ClienteHubPage />, { wrapper })
}

beforeEach(() => {
  session.role = "PHYSIO"
  record.status = "ready"
  record.client = makeClient()
  record.refetch.mockReset()
  navigation.push.mockReset()
  http.reset()
})

afterEach(cleanup)

describe("professional Client record", () => {
  it.each([
    ["NUTRITIONIST", "Área de Nutrição", "Contexto nutricional", "Alergias e restrições", "Planos alimentares em migração"],
    ["PERSONAL", "Área de Treinamento", "Contexto de treinamento", "Acompanhamento com personal", "Planilhas de treino em migração"],
    ["PHYSIO", "Área de Fisioterapia", "Contexto fisioterapêutico", "Tipo de exercício", "Planos de reabilitação em migração"],
  ] as const)("renders only the %s workspace", (role, area, context, ownField, migrationStatus) => {
    session.role = role as ProfessionalRole
    renderPage()

    expect(screen.getByRole("heading", { name: "Marina Lopes", level: 1 })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: area })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: context })).toBeInTheDocument()
    expect(screen.getByLabelText(ownField)).toBeInTheDocument()
    expect(screen.getByRole("status", { name: migrationStatus })).toBeInTheDocument()
    expect(document.querySelector('a[href*="nova-dieta"], a[href*="novo-treino"], a[href*="nova-reabilitacao"]')).toBeNull()
  })

  it("never combines fields or actions from another profession", () => {
    session.role = "PHYSIO"
    renderPage()

    expect(screen.queryByLabelText("Alergias e restrições")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Acompanhamento com personal")).not.toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Planos de reabilitação em migração" })).toBeInTheDocument()
    expect(screen.queryByText("Planos alimentares")).not.toBeInTheDocument()
    expect(screen.queryByText("Planilhas de treino")).not.toBeInTheDocument()
    expect(screen.queryByText(/histórico de dieta|suplementação|exames laboratoriais/i)).not.toBeInTheDocument()
  })

  it("does not turn a Client id into a legacy User-domain href", () => {
    record.client = { ...makeClient(), id: "client-record-123", professionalId: "user-account-987" }
    session.role = "NUTRITIONIST"
    renderPage()

    expect(record.client.id).not.toBe(record.client.professionalId)
    expect(document.querySelector('a[href*="client-record-123/nova-dieta"]')).toBeNull()
    expect(document.querySelector('a[href*="client-record-123/novo-treino"]')).toBeNull()
    expect(document.querySelector('a[href*="client-record-123/nova-reabilitacao"]')).toBeNull()
  })

  it("does not turn ADMIN into every professional workspace", () => {
    session.role = "ADMIN"
    renderPage()

    expect(screen.getByRole("alert", { name: "Área profissional indisponível" })).toBeInTheDocument()
    expect(screen.queryByRole("form")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /plano alimentar|planilha|reabilitação/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Alergias e restrições")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Tipo de exercício")).not.toBeInTheDocument()
  })

  it.each([
    ["loading", "status", "Carregando prontuário"],
    ["not-found", "alert", "Prontuário não encontrado"],
    ["unauthorized", "alert", "Prontuário indisponível"],
    ["network-error", "alert", "Sem conexão com o SafeMove"],
    ["server-error", "alert", "SafeMove temporariamente indisponível"],
  ] as const)("renders the honest %s state", (status, role, name) => {
    record.status = status
    record.client = null
    renderPage()

    expect(screen.getByRole(role, { name })).toBeInTheDocument()
  })

  it("keeps archival explicit, accessible and never offers deletion", async () => {
    const user = userEvent.setup()
    http.onPatch("/clients/client-one/status").reply(200, { ...makeClient(), status: "ARCHIVED" })
    renderPage()

    const trigger = screen.getByRole("button", { name: "Arquivar paciente Marina Lopes" })
    expect(trigger).toHaveClass("min-h-11")
    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument()

    await user.click(trigger)
    expect(screen.getByRole("alertdialog", { name: "Arquivar paciente?" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Confirmar arquivamento" }))

    expect(navigation.push).toHaveBeenCalledWith("/clientes")
  })
})
