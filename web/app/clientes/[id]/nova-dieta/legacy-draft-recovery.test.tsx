import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import NovaDietaPage from "./page"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "client-one" }),
  useRouter: () => navigation,
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { sub: "professional-one", role: "NUTRITIONIST", name: "Ana Lima" },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock("@/components/features/diet/MacroDistributionChart", () => ({
  default: () => <div aria-label="Gráfico de macros" />,
}))

const http = new AxiosMockAdapter(api)
const key = "diet_draft_client-one"
const validDraft = {
  dietInfo: {
    title: "Plano legado desta sessão",
    goal: "Recuperação",
    notes: "",
    durationDays: 14,
    patientWeight: 70,
  },
  targets: {
    kcal: 2100,
    pro: 120,
    carb: 240,
    fat: 65,
    fiber: 30,
    sodium: 2000,
    calcium: 1000,
    iron: 15,
  },
  meals: [{ id: "meal-one", name: "Café da manhã", time: "08:00", notes: "", items: [] }],
}

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(<NovaDietaPage />, { wrapper })
}

beforeEach(() => {
  localStorage.clear()
  navigation.push.mockReset()
  http.reset()
  http.onGet("/clients/client-one").reply(200, {
    id: "client-one",
    professionalId: "professional-one",
    name: "Marina Lopes",
    birthDate: "1990-04-03T00:00:00.000Z",
    gender: "F",
    initialWeight: 68,
  })
  http.onGet("/diet-plans/user/client-one/active").reply(404)
  http.onGet(/\/foods/).reply(200, [])
})

afterEach(cleanup)

describe("diet page legacy draft recovery", () => {
  it("waits for an explicit load choice, applies only in memory and removes the old key", async () => {
    const user = userEvent.setup()
    localStorage.setItem(key, JSON.stringify(validDraft))
    renderPage()

    expect(await screen.findByRole("alertdialog", { name: "Rascunho clínico encontrado" })).toBeInTheDocument()
    expect(localStorage.getItem(key)).not.toBeNull()
    expect(screen.queryByDisplayValue("Plano legado desta sessão")).not.toBeInTheDocument()
    expect(http.history.get.map((request) => request.url)).not.toContain("/users/client-one")

    await user.click(screen.getByRole("button", { name: "Carregar nesta sessão e remover do navegador" }))

    expect(await screen.findByDisplayValue("Plano legado desta sessão")).toBeInTheDocument()
    expect(localStorage.getItem(key)).toBeNull()
    expect(http.history.get.map((request) => request.url)).not.toContain("/diet-plans/user/client-one/active")
  })

  it("discards without applying clinical content", async () => {
    const user = userEvent.setup()
    localStorage.setItem(key, JSON.stringify(validDraft))
    renderPage()

    await user.click(await screen.findByRole("button", { name: "Descartar rascunho local" }))

    expect(localStorage.getItem(key)).toBeNull()
    expect(screen.queryByDisplayValue("Plano legado desta sessão")).not.toBeInTheDocument()
  })

  it("keeps unreadable content until explicit confirmation", async () => {
    const user = userEvent.setup()
    localStorage.setItem(key, "{invalid")
    renderPage()

    expect(await screen.findByRole("alertdialog", { name: "Rascunho local ilegível" })).toBeInTheDocument()
    expect(localStorage.getItem(key)).toBe("{invalid")

    await user.click(screen.getByRole("button", { name: "Remover rascunho ilegível" }))
    await waitFor(() => expect(localStorage.getItem(key)).toBeNull())
  })
})
