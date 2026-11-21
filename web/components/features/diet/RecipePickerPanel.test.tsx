import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { RecipePicker, RecipePickerPanel } from "./RecipePickerPanel"
import type { RecipeSummary, RecipeVersion } from "@/types/recipe"

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { sub: "nutritionist-1", role: "NUTRITIONIST", name: "Ana" },
  }),
}))

const version: RecipeVersion = {
  id: "v2", recipeId: "recipe-1", version: 2, name: "Panqueca de aveia", description: null,
  category: "BREAKFAST", servings: 2, instructions: null, isGlutenFree: false, isLactoseFree: true,
  isVegan: true, ingredients: [], createdAt: "2026-09-21T00:00:00Z", kcal: 200, protein: 16,
  carbs: 30, fat: 6, fiber: 4, sodium: 100, calcium: 80, iron: 2,
}
const active: RecipeSummary = { id: "recipe-1", status: "ACTIVE", currentVersionId: "v2", currentVersion: version, createdAt: "2026-09-21", updatedAt: "2026-09-21" }
afterEach(cleanup)

describe("RecipePickerPanel", () => {
  it("filters active recipes and selects their current version with the entered servings", async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<RecipePickerPanel recipes={[active, { ...active, id: "archived", status: "ARCHIVED", currentVersion: { ...version, name: "Arquivada" } }]} onSelect={onSelect} />)
    expect(screen.queryByText("Arquivada")).not.toBeInTheDocument()
    await user.type(screen.getByRole("searchbox", { name: "Buscar receitas" }), "panqueca")
    await user.clear(screen.getByRole("spinbutton", { name: "Porções de Panqueca de aveia" }))
    await user.type(screen.getByRole("spinbutton", { name: "Porções de Panqueca de aveia" }), "1.5")
    const servingsInput = screen.getByRole("spinbutton", { name: "Porções de Panqueca de aveia" })
    const addButton = screen.getByRole("button", { name: "Adicionar Panqueca de aveia" })
    expect(servingsInput).toHaveClass("min-h-11")
    expect(addButton).toHaveClass("min-h-11")
    await user.click(addButton)
    expect(onSelect).toHaveBeenCalledWith(version, 1.5)
  })

  it("filters by restriction markers in the picker", async () => {
    const user = userEvent.setup()
    render(<RecipePickerPanel recipes={[active, { ...active, id: "gluten-free", currentVersion: { ...version, id: "v3", name: "Crepe sem glúten", isGlutenFree: true } }]} onSelect={vi.fn()} />)
    await user.click(screen.getByRole("checkbox", { name: "Sem glúten" }))
    expect(screen.queryByText("Panqueca de aveia")).not.toBeInTheDocument()
    expect(screen.getByText("Crepe sem glúten")).toBeInTheDocument()
  })

  it("loads complete ingredients on demand when selecting a lean recipe summary", async () => {
    const http = new AxiosMockAdapter(api)
    const leanSummary: RecipeSummary = {
      id: "recipe-1",
      status: "ACTIVE",
      currentVersionId: "v2",
      createdAt: "2026-09-21",
      updatedAt: "2026-09-21",
      currentVersion: {
        id: "v2",
        recipeId: "recipe-1",
        version: 2,
        name: "Panqueca de aveia",
        category: "BREAKFAST",
        servings: 2,
        isGlutenFree: false,
        isLactoseFree: true,
        isVegan: true,
        createdAt: "2026-09-21T00:00:00Z",
        kcal: 200,
        protein: 16,
        carbs: 30,
        fat: 6,
        fiber: 4,
        sodium: 100,
        calcium: 80,
        iron: 2,
      },
    }
    const hydratedVersion: RecipeVersion = {
      ...leanSummary.currentVersion,
      description: "Para o café",
      instructions: "Bata e grelhe.",
      ingredients: [
        {
          id: "ing-1",
          recipeVersionId: "v2",
          foodId: "oat",
          quantity: 100,
          measure: "g",
          food: {
            id: "oat",
            name: "Aveia",
            baseUnit: "100g",
            baseAmount: 100,
            kcal: 400,
            protein: 20,
            carbs: 60,
            fat: 10,
            fiber: 8,
            sodium: 4,
            calcium: 50,
            iron: 5,
          },
        },
      ],
    }

    http.onGet("/recipes").reply(200, [leanSummary])
    http
      .onGet("/recipes/recipe-1")
      .replyOnce(500)
      .onGet("/recipes/recipe-1")
      .reply(200, {
        ...leanSummary,
        currentVersion: hydratedVersion,
        versions: [hydratedVersion],
      })

    const onSelect = vi.fn()
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    try {
      render(
        <QueryClientProvider client={queryClient}>
          <RecipePicker onSelect={onSelect} />
        </QueryClientProvider>,
      )

      const addButton = await screen.findByRole("button", {
        name: "Adicionar Panqueca de aveia",
      })
      await user.click(addButton)
      expect(
        await screen.findByText(
          "Não foi possível carregar os ingredientes da receita.",
        ),
      ).toBeInTheDocument()
      expect(onSelect).not.toHaveBeenCalled()

      await user.click(addButton)
      await waitFor(() =>
        expect(onSelect).toHaveBeenCalledWith(hydratedVersion, 1),
      )
    } finally {
      http.restore()
      queryClient.clear()
    }
  })
})
