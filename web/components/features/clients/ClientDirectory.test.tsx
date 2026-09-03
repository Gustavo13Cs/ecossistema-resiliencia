import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ClientesPage from "@/app/clientes/page"
import { api } from "@/lib/api"
import { getWorkspaceDefinition } from "@/lib/professional-workspace"
import type { ProfessionalRole } from "@/types/auth"
import type { Client, ClientStatus } from "@/types/client"
import { ClientFilters } from "./ClientFilters"
import { ClientList } from "./ClientList"

const navigation = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}))

const session = vi.hoisted(() => ({
  role: "PHYSIO" as ProfessionalRole,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: {
      sub: "professional-one",
      role: session.role,
      name: "Ana Lima",
      email: "ana@example.test",
    },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const http = new AxiosMockAdapter(api)

const makeClient = (id: string, name: string, status: ClientStatus): Client => ({
  id,
  professionalId: "professional-one",
  name,
  email: `${id}@example.test`,
  phone: "+55 11 99999-0000",
  birthDate: null,
  gender: null,
  goal: "Retomar mobilidade com segurança",
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

const activeClient = makeClient("ana", "Ana Souza", "ACTIVE")

const setDesktopViewport = (matches: boolean) => {
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })))
}

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { queryClient, ...render(<ClientesPage />, { wrapper }) }
}

beforeEach(() => {
  session.role = "PHYSIO"
  navigation.search = ""
  navigation.replace.mockReset()
  http.reset()
  setDesktopViewport(true)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("professional client directory", () => {
  it.each([
    ["NUTRITIONIST", "Clientes", "Novo cliente"],
    ["PERSONAL", "Alunos", "Novo aluno"],
    ["PHYSIO", "Pacientes", "Novo paciente"],
  ] as const)("uses %s terminology across the directory", async (role, plural, createLabel) => {
    session.role = role
    http.onGet("/clients", { params: { status: "ACTIVE" } }).reply(200, [])

    renderPage()

    expect(await screen.findByRole("heading", { name: plural, level: 1 })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: createLabel })).toBeInTheDocument()
    expect(screen.queryByText(role === "PHYSIO" ? "Clientes" : "Pacientes")).not.toBeInTheDocument()
  })

  it("offers accessible search and status filters over authorized results", async () => {
    const user = userEvent.setup()
    http.onGet("/clients", { params: { status: "ACTIVE" } }).reply(200, [
      activeClient,
      makeClient("bruno", "Bruno Lima", "ACTIVE"),
    ])

    renderPage()

    const search = await screen.findByRole("searchbox", { name: "Buscar pacientes" })
    expect(screen.getByRole("group", { name: "Status dos pacientes" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ativos" })).toHaveAttribute("aria-pressed", "true")

    await user.type(search, "bruno")

    expect(screen.getByRole("link", { name: "Abrir prontuário de Bruno Lima" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Abrir prontuário de Ana Souza" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Arquivados" }))
    expect(navigation.replace).toHaveBeenCalledWith("/clientes?status=ARCHIVED")
  })

  it("renders a semantic desktop table with named headers", () => {
    render(
      <ClientList
        clients={[activeClient]}
        status="ACTIVE"
        workspace={getWorkspaceDefinition("PHYSIO")}
        pendingClientId={null}
        onChangeStatus={vi.fn()}
      />,
    )

    expect(screen.getByRole("table", { name: "Pacientes ativos" })).toBeInTheDocument()
    for (const heading of ["Nome", "Contato", "Objetivo", "Atualização", "Ações"]) {
      expect(screen.getByRole("columnheader", { name: heading })).toBeInTheDocument()
    }
  })

  it("renders one accessible mobile record without duplicating the desktop table", () => {
    setDesktopViewport(false)

    render(
      <ClientList
        clients={[activeClient]}
        status="ACTIVE"
        workspace={getWorkspaceDefinition("PHYSIO")}
        pendingClientId={null}
        onChangeStatus={vi.fn()}
      />,
    )

    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Pacientes ativos" })).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Abrir prontuário de Ana Souza" })).toHaveLength(1)
    expect(screen.getByText("Ativo")).toBeVisible()
  })

  it("keeps filters and lifecycle confirmation controls at least 44px tall", async () => {
    const user = userEvent.setup()
    setDesktopViewport(false)
    const { rerender } = render(
      <>
        <ClientFilters
          search=""
          status="ACTIVE"
          workspace={getWorkspaceDefinition("PHYSIO")}
          onSearchChange={vi.fn()}
          onStatusChange={vi.fn()}
        />
        <ClientList
          clients={[activeClient]}
          status="ACTIVE"
          workspace={getWorkspaceDefinition("PHYSIO")}
          pendingClientId={null}
          onChangeStatus={vi.fn()}
        />
      </>,
    )

    expect(screen.getByRole("button", { name: "Ativos" })).toHaveClass("min-h-11")
    expect(screen.getByRole("button", { name: "Arquivados" })).toHaveClass("min-h-11")
    const trigger = screen.getByRole("button", { name: "Arquivar paciente Ana Souza" })
    expect(trigger).toHaveClass("min-h-11")

    await user.click(trigger)
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass("min-h-11")
    expect(screen.getByRole("button", { name: "Confirmar arquivamento" })).toHaveClass("min-h-11")

    rerender(<></>)
  })

  it("keeps archive explicit behind confirmation and never offers deletion", async () => {
    const user = userEvent.setup()
    const onChangeStatus = vi.fn().mockResolvedValue(undefined)
    render(
      <ClientList
        clients={[activeClient]}
        status="ACTIVE"
        workspace={getWorkspaceDefinition("PHYSIO")}
        pendingClientId={null}
        onChangeStatus={onChangeStatus}
      />,
    )

    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Arquivar paciente Ana Souza" }))

    expect(screen.getByRole("alertdialog", { name: "Arquivar paciente?" })).toBeInTheDocument()
    expect(onChangeStatus).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Confirmar arquivamento" }))
    expect(onChangeStatus).toHaveBeenCalledWith(activeClient)
  })

  it("offers restore confirmation for archived records", async () => {
    const user = userEvent.setup()
    const archivedClient = makeClient("caio", "Caio Rocha", "ARCHIVED")
    const onChangeStatus = vi.fn().mockResolvedValue(undefined)
    render(
      <ClientList
        clients={[archivedClient]}
        status="ARCHIVED"
        workspace={getWorkspaceDefinition("PERSONAL")}
        pendingClientId={null}
        onChangeStatus={onChangeStatus}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Restaurar aluno Caio Rocha" }))
    expect(screen.getByRole("alertdialog", { name: "Restaurar aluno?" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Confirmar restauração" }))
    expect(onChangeStatus).toHaveBeenCalledWith(archivedClient)
  })

  it("keeps mutation controls locked until cache invalidation settles", async () => {
    const user = userEvent.setup()
    http.onGet("/clients", { params: { status: "ACTIVE" } }).reply(200, [activeClient])
    http.onPatch("/clients/ana/status").reply(200, { ...activeClient, status: "ARCHIVED" })
    const { queryClient } = renderPage()
    let releaseInvalidation!: () => void
    const invalidation = new Promise<void>((resolve) => { releaseInvalidation = resolve })
    vi.spyOn(queryClient, "invalidateQueries").mockReturnValue(invalidation)

    await user.click(await screen.findByRole("button", { name: "Arquivar paciente Ana Souza" }))
    await user.click(screen.getByRole("button", { name: "Confirmar arquivamento" }))

    const pendingButton = await screen.findByRole("button", { name: "Arquivando paciente Ana Souza" })
    expect(pendingButton).toBeDisabled()

    releaseInvalidation()
    await waitFor(() => expect(screen.getByRole("button", { name: "Arquivar paciente Ana Souza" })).toBeEnabled())
  })

  it("shows honest loading, empty, and error states", async () => {
    http.onGet("/clients", { params: { status: "ACTIVE" } }).reply(() => new Promise(() => {}))
    const loading = renderPage()
    expect(screen.getByRole("status", { name: "Carregando pacientes" })).toBeInTheDocument()
    loading.unmount()

    http.reset()
    http.onGet("/clients", { params: { status: "ACTIVE" } }).reply(200, [])
    const empty = renderPage()
    expect(await screen.findByRole("status", { name: "Nenhum paciente ativo" })).toBeInTheDocument()
    empty.unmount()

    http.reset()
    http.onGet("/clients", { params: { status: "ACTIVE" } }).reply(500)
    renderPage()
    expect(await screen.findByRole("alert", { name: "Não foi possível carregar os pacientes" })).toBeInTheDocument()
  })
})

describe("ClientFilters", () => {
  it("exposes labels without relying on placeholder text", async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onStatusChange = vi.fn()

    render(
      <ClientFilters
        search=""
        status="ACTIVE"
        workspace={getWorkspaceDefinition("PERSONAL")}
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
      />,
    )

    await user.type(screen.getByRole("searchbox", { name: "Buscar alunos" }), "joão")
    await user.click(screen.getByRole("button", { name: "Arquivados" }))

    expect(onSearchChange).toHaveBeenCalled()
    expect(onStatusChange).toHaveBeenCalledWith("ARCHIVED")
  })
})
