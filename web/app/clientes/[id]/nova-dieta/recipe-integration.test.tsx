import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react"
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
const foodSearchRequests = /\/foods(?:\/search)?(?:\?|$)/
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
  http.onGet(foodSearchRequests).reply(200, [])
  http.onGet("/recipes/r1").reply(200, { id: "r1", status: "ACTIVE", currentVersionId: "v2", currentVersion: { ...version, id: "v2", version: 2 }, versions: [] })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe("recipe prescription page", () => {
  it("keeps the picker locked while food preference is pending, then adds the food and fully releases the page", async () => {
    const user = userEvent.setup()
    const food = version.ingredients[0].food
    let resolvePreference!: (response: [number, { measure: string }]) => void
    const preference = new Promise<[number, { measure: string }]>((resolve) => { resolvePreference = resolve })
    http.onGet(foodSearchRequests).reply(200, [food])
    http.onGet(/\/foods\/oat\/preference/).reply(() => preference)
    http.onPost("/diet-plans").reply(201, {})
    renderPage()
    expect(await screen.findByText("Versão 1")).toBeInTheDocument()
    const trigger = screen.getByRole("button", { name: "Buscar e Adicionar Alimento ou Receita" })
    await user.click(trigger)
    const dialog = await screen.findByRole("dialog", { name: "Banco de Alimentos e Receitas" })
    await user.click(await within(dialog).findByRole("button", { name: "Add" }))
    await waitFor(() => expect(http.history.get.some((request) => request.url?.includes("/foods/oat/preference"))).toBe(true))
    expect(dialog).toBeInTheDocument()
    expect(document.body).toHaveAttribute("data-scroll-locked", "1")
    expect(window.getComputedStyle(document.body).pointerEvents).toBe("none")
    expect(screen.queryByRole("spinbutton", { name: "Quantidade de Aveia" })).not.toBeInTheDocument()
    expect(http.history.post).toHaveLength(0)

    await act(async () => { resolvePreference([200, { measure: "" }]) })
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(window.getComputedStyle(document.body).pointerEvents).not.toBe("none")
      expect(document.body).not.toHaveAttribute("data-scroll-locked")
    })
    expect(screen.getByRole("spinbutton", { name: "Quantidade de Aveia" })).toHaveValue(100)
    expect(screen.getByText("Versão 1")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Finalizar" }))
    await waitFor(() => expect(http.history.post).toHaveLength(1))
    const body = JSON.parse(http.history.post[0].data)
    expect(body.meals[0].items).toEqual([
      { quantity: 1, measure: "porções", recipeVersionId: "v1" },
      { quantity: 100, measure: "", foodId: "oat" },
    ])
  })

  it("prints a saved recipe meal when the active plan has no meal time", async () => {
    const user = userEvent.setup()
    http.onGet("/diet-plans/client/client-one/active").reply(200, { ...plan, meals: [{ ...plan.meals[0], time: null }] })
    const write = vi.fn()
    vi.spyOn(window, "open").mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, addEventListener: vi.fn(), closed: false, opener: null, focus: vi.fn(), print: vi.fn() } as unknown as Window)
    renderPage()
    expect(await screen.findByText("Versão 1")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "PDF Dieta" }))
    expect(write).toHaveBeenCalledTimes(1)
    const printed = new DOMParser().parseFromString(write.mock.calls[0][0], "text/html")
    expect(printed.querySelector(".meal-time")?.textContent).toBe("")
    expect(printed.body.textContent).toContain("Panqueca · versão 1")
  })

  it("writes the prescribed recipe snapshot and preparation to the diet popup", async () => {
    const user = userEvent.setup()
    const write = vi.fn()
    vi.spyOn(window, "open").mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, addEventListener: vi.fn(), closed: false, opener: null, focus: vi.fn(), print: vi.fn() } as unknown as Window)
    renderPage()
    expect(await screen.findByText("Versão 1")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "PDF Dieta" }))
    expect(write).toHaveBeenCalledTimes(1)
    const printed = new DOMParser().parseFromString(write.mock.calls[0][0], "text/html")
    expect(printed.querySelector(".client-name")?.textContent).toBe("Cliente")
    expect(printed.body.textContent).toContain("Panqueca · versão 1")
    expect(printed.body.textContent).toContain("1porção")
    expect(printed.querySelector(".recipe-detail")?.textContent).toContain("50 g — Aveia")
    expect(printed.querySelector(".recipe-instructions")?.textContent).toBe("Misture e asse.")
    expect(printed.querySelector(".macro-kcal")?.textContent).toBe("200 kcal")
    expect(printed.body.textContent).not.toContain("versão 2")
    expect(http.history.post).toHaveLength(0)
  })

  it("expands the prescribed recipe ingredients for the selected shopping days in the list popup", async () => {
    const user = userEvent.setup()
    http.onPost("/diet-plans").reply(201, {})
    const write = vi.fn()
    vi.spyOn(window, "open").mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, addEventListener: vi.fn(), closed: false, opener: null, focus: vi.fn(), print: vi.fn() } as unknown as Window)
    renderPage()
    expect(await screen.findByText("Versão 1")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Compartilhar & Lista" }))
    const heading = await screen.findByRole("heading", { name: "Compartilhar com cliente" })
    const dialog = heading.parentElement!.parentElement!
    const days = within(dialog).getByRole("spinbutton")
    await user.clear(days)
    await user.type(days, "2")
    await user.click(within(dialog).getByRole("button", { name: "PDF da Lista" }))
    expect(write).toHaveBeenCalledTimes(1)
    const printed = new DOMParser().parseFromString(write.mock.calls[0][0], "text/html")
    expect(printed.querySelector(".meta-line:last-child")?.textContent).toContain("2 dias")
    expect(printed.querySelector(".item-name")?.textContent).toBe("Aveia")
    expect(printed.querySelector(".item-qty")?.textContent).toBe("100 g")
    expect(printed.querySelectorAll(".list-table")).toHaveLength(2)
  })

  it("opens the item picker with a semantic title and description", async () => {
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText("Versão 1")).toBeInTheDocument()
    const trigger = await screen.findByRole("button", { name: "Buscar e Adicionar Alimento ou Receita" })
    await user.click(trigger)

    const dialog = await screen.findByRole("dialog", { name: "Banco de Alimentos e Receitas" })
    expect(dialog).toHaveAttribute("aria-labelledby")
    expect(dialog).toHaveAccessibleDescription("Escolha um alimento ou receita para adicionar à refeição selecionada.")
  })

  it("moves and traps focus, locks page scrolling, then restores trigger focus", async () => {
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText("Versão 1")).toBeInTheDocument()
    const trigger = await screen.findByRole("button", { name: "Buscar e Adicionar Alimento ou Receita" })
    await user.click(trigger)

    const dialog = await screen.findByRole("dialog", { name: "Banco de Alimentos e Receitas" })
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    expect(document.body).toHaveStyle({ overflow: "hidden" })
    await user.keyboard("{Shift>}{Tab}{/Shift}")
    expect(dialog).toContainElement(document.activeElement as HTMLElement)

    await user.click(within(dialog).getByRole("button", { name: "Fechar seletor" }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

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
