import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { Client } from "@/types/client"
import ClienteHubPage from "./page"

const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "client-one" }),
  useRouter: () => router,
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: {
      sub: "professional-one",
      role: "PHYSIO",
      name: "Ana Lima",
      email: "ana@example.test",
    },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock("@/components/AssessmentModal", () => ({ AssessmentModal: () => null }))
vi.mock("@/components/PhysioAssessmentModal", () => ({ PhysioAssessmentModal: () => null }))

const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: "client-one",
  professionalId: "professional-one",
  name: "Marina Lopes",
  email: "marina@example.test",
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
  exerciseFrequency: "3 vezes por semana",
  exerciseDuration: null,
  hasPersonal: null,
  workActivityLevel: null,
  professionalNotes: null,
  privacyNotes: null,
  status: "ACTIVE",
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-09-03T12:00:00.000Z",
  ...overrides,
})

const record = vi.hoisted(() => ({
  client: null as Client | null,
}))

vi.mock("@/hooks/features/useClientRecord", () => ({
  useClientRecord: () => ({
    client: record.client,
    activeDiet: null,
    dietHistory: [],
    activeWorkout: null,
    activeRehab: null,
    activeSupplement: null,
    assessments: [],
    physioAssessments: [],
    anamneses: [],
    consultationNotes: [],
    labExams: [],
    loading: false,
    clientError: null,
    refetchAll: vi.fn(),
  }),
}))

const http = new AxiosMockAdapter(api)

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...render(<ClienteHubPage />, { wrapper }) }
}

const openRecordForm = async () => {
  const user = userEvent.setup()
  await user.click(screen.getByRole("tab", { name: /Dados & Prontuário/i }))
  return user
}

beforeEach(() => {
  record.client = makeClient()
  router.push.mockReset()
  http.reset()
})

afterEach(cleanup)

describe("client update recovery", () => {
  it("keeps edited fields and exposes an accessible generic save error", async () => {
    http.onPatch("/clients/client-one").reply(500)
    renderPage()
    const user = await openRecordForm()
    const name = screen.getByLabelText("Nome completo")

    await user.clear(name)
    await user.type(name, "Marina editada")
    await user.click(screen.getByRole("button", { name: "Salvar alterações no prontuário" }))

    expect(await screen.findByRole("alert", { name: "Não foi possível salvar o prontuário" })).toBeInTheDocument()
    expect(name).toHaveValue("Marina editada")
    expect(screen.queryByRole("button", { name: "Recarregar versão mais recente" })).not.toBeInTheDocument()
  })

  it("distinguishes a 409 conflict and reloads the latest version only after explicit recovery", async () => {
    http.onPatch("/clients/client-one").reply(409)
    const { queryClient } = renderPage()
    const user = await openRecordForm()
    const name = screen.getByLabelText("Nome completo")

    await user.clear(name)
    await user.type(name, "Alteração ainda não salva")
    await user.click(screen.getByRole("button", { name: "Salvar alterações no prontuário" }))

    const conflict = await screen.findByRole("alert", { name: "Este prontuário foi atualizado em outro acesso" })
    expect(conflict).toHaveTextContent("suas alterações atuais serão substituídas")
    expect(name).toHaveValue("Alteração ainda não salva")

    vi.spyOn(queryClient, "refetchQueries").mockImplementation(async () => {
      record.client = makeClient({
        name: "Versão mais recente",
        updatedAt: "2026-09-03T13:00:00.000Z",
      })
    })

    await user.click(screen.getByRole("button", { name: "Recarregar versão mais recente" }))

    await waitFor(() => expect(screen.queryByRole("alert", { name: "Este prontuário foi atualizado em outro acesso" })).not.toBeInTheDocument())
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Versão mais recente")
  })
})
