import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RecipePickerPanel } from "./RecipePickerPanel"
import type { RecipeSummary, RecipeVersion } from "@/types/recipe"

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
})
