import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { Client, ClientStatus } from "@/types/client"
import ClientesPage from "./page"

const navigation = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
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

const http = new AxiosMockAdapter(api)

const makeClient = (id: string, name: string, status: ClientStatus): Client => ({
  id,
  professionalId: "professional-one",
  name,
  email: `${id}@example.test`,
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

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { queryClient, ...render(<ClientesPage />, { wrapper }) }
}

describe("ClientesPage status query", () => {
  beforeEach(() => {
    navigation.search = ""
    navigation.replace.mockReset()
    http.reset()
    http.onGet("/clients", { params: { status: "ACTIVE" } }).reply(200, [
      makeClient("active", "Registro ativo", "ACTIVE"),
    ])
    http.onGet("/clients", { params: { status: "ARCHIVED" } }).reply(200, [
      makeClient("archived", "Registro arquivado", "ARCHIVED"),
    ])
  })

  afterEach(cleanup)

  it("opens the archived view from a validated status query and follows later query changes", async () => {
    navigation.search = "status=ARCHIVED"
    const { queryClient, rerender } = renderPage()

    expect(await screen.findByText("Registro arquivado")).toBeInTheDocument()
    expect(screen.queryByText("Registro ativo")).not.toBeInTheDocument()
    expect(screen.getByText("Pacientes arquivados")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arquivados" })).toHaveAttribute("aria-pressed", "true")
    expect(
      queryClient.getQueryCache().find({ queryKey: ["clients", "professional-one", "ARCHIVED"] }),
    ).toBeDefined()

    navigation.search = "status=ACTIVE"
    rerender(<ClientesPage />)

    expect(await screen.findByText("Registro ativo")).toBeInTheDocument()
    expect(screen.queryByText("Registro arquivado")).not.toBeInTheDocument()
  })

  it("defaults an invalid status query to the active view and writes validated filter navigation", async () => {
    const user = userEvent.setup()
    navigation.search = "status=unexpected"
    renderPage()

    expect(await screen.findByText("Registro ativo")).toBeInTheDocument()
    expect(screen.queryByText("Registro arquivado")).not.toBeInTheDocument()
    expect(screen.getByText("Pacientes ativos")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ativos" })).toHaveAttribute("aria-pressed", "true")

    await user.click(screen.getByRole("button", { name: "Arquivados" }))
    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/clientes?status=ARCHIVED")
    })
  })
})
