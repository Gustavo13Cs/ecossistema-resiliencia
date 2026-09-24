import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import NovaDietaPage from "./page"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "client-one" }), useRouter: () => navigation }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "pro-one", role: "NUTRITIONIST", name: "Ana" }, isLoading: false }) }))
vi.mock("@/components/features/diet/MacroDistributionChart", () => ({ default: () => <div /> }))
const http = new AxiosMockAdapter(api)
const version = { id: "v1", recipeId: "r1", version: 1, name: "Panqueca", description: null, category: "BREAKFAST", servings: 2, instructions: "Misture e asse.", isGlutenFree: false, isLactoseFree: false, isVegan: false, kcal: 200, protein: 10, carbs: 30, fat: 5, fiber: 2, sodium: 20, calcium: 10, iron: 1, ingredients: [{ id: "ing-1", recipeVersionId: "v1", foodId: "oat", food: { id: "oat", name: "Aveia", baseUnit: "100g", baseAmount: 100, kcal: 400, protein: 10, carbs: 60, fat: 8, fiber: 10, sodium: 20, calcium: 80, iron: 4 }, quantity: 100, measure: "g" }], createdAt: "2026-09-21", recipe: { id: "r1", currentVersionId: "v2", status: "ACTIVE" } }
const plan = { title: "Plano salvo", goal: "Saúde", notes: "", durationDays: 7, targetKcal: 2000, proteinG: 100, carbsG: 200, fatG: 60, meals: [{ id: "m1", name: "Café", time: "08:00", notes: "", items: [{ id: "i1", quantity: 1, measure: "porções", foodId: null, food: null, recipeVersionId: "v1", recipeVersion: version }] }] }
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><NovaDietaPage /></QueryClientProvider>)
}
beforeEach(() => {
  localStorage.clear()
  http.reset()
  http.onGet("/clients/client-one").reply(200, { id: "client-one", professionalId: "pro-one", name: "Cliente", birthDate: "1990-01-01", gender: "F", initialWeight: 70 })
  http.onGet("/diet-plans/client/client-one/active").reply(200, plan)
  http.onGet(/\/foods/).reply(200, [])
  http.onGet("/recipes/r1").reply(200, { id: "r1", status: "ACTIVE", currentVersionId: "v2", currentVersion: { ...version, id: "v2", version: 2 }, versions: [] })
})
afterEach(cleanup)
describe("recipe prescription page", () => {
  it("shows the saved version and updates only in memory until Finalizar", async () => {
    const user = userEvent.setup()
    http.onPost("/diet-plans").reply(201, {})
    renderPage()
    expect(await screen.findByText("Panqueca")).toBeInTheDocument()
    expect(screen.getByText("Versão 1")).toBeInTheDocument()
    expect(screen.getByText("Ingredientes: Aveia 50 g")).toBeInTheDocument()
    expect(screen.getByText("Misture e asse.")).toBeInTheDocument()
    expect(http.history.post).toHaveLength(0)
    await user.click(await screen.findByRole("button", { name: "Atualizar Panqueca para versão 2" }))
    expect(await screen.findByText("Versão 2")).toBeInTheDocument()
    expect(http.history.post).toHaveLength(0)
    await user.click(screen.getByRole("button", { name: "Finalizar" }))
    await waitFor(() => expect(http.history.post).toHaveLength(1))
    const body = JSON.parse(http.history.post[0].data)
    expect(body.meals[0].items[0]).toEqual({ quantity: 1, measure: "porções", recipeVersionId: "v2" })
  })
})
