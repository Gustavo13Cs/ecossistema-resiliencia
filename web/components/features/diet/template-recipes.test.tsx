import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { DietTemplate } from "@/hooks/features/useDietTemplates"
import type { RecipeVersion } from "@/types/recipe"
import { TemplateFormModal } from "./TemplateFormModal"
import { TemplateDetailDrawer } from "./TemplateDetailDrawer"
import ModelosPlanosPage from "@/app/modelos-planos/page"

const mocks = vi.hoisted(() => ({ update: vi.fn(), create: vi.fn(), error: vi.fn() }))
vi.mock("@/hooks/features/useDietTemplates", () => ({
  useDietTemplateMutations: () => ({
    updateTemplate: { mutateAsync: mocks.update }, createTemplate: { mutateAsync: mocks.create },
    duplicateTemplate: {}, toggleArchiveTemplate: {}, deleteTemplate: {},
  }),
  useDietTemplates: () => ({ data: [mixedTemplate], isLoading: false }),
  useSystemDietTemplates: () => ({ data: [], isLoading: false }),
}))
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn() } }))

const snapshot: RecipeVersion = {
  id: "version-1", recipeId: "recipe-1", version: 1, name: "Panqueca antiga",
  description: null, category: "BREAKFAST", servings: 2, instructions: "Misture e asse por dez minutos.",
  isGlutenFree: false, isLactoseFree: true, isVegan: false, ingredients: [],
  createdAt: "2026-09-21", kcal: 200, protein: 10, carbs: 30, fat: 5,
  fiber: 3, sodium: 10, calcium: 20, iron: 1,
}
const mixedTemplate: DietTemplate = {
  id: "template-1", title: "Modelo misto", goal: "Manutenção", targetKcal: 2000,
  proteinG: 100, carbsG: 200, fatG: 60, isTemplate: true, isActive: true,
  meals: [{ name: "Café", items: [
    { foodId: "food-1", food: { id: "food-1", name: "Aveia", kcal: 100, protein: 5, carbs: 15, fat: 2 }, quantity: 80, measure: "g" },
    { recipeVersionId: snapshot.id, recipeVersion: snapshot, quantity: 1.5, measure: "g", notes: "Sem açúcar" },
  ] }],
}
beforeEach(() => { vi.clearAllMocks(); mocks.update.mockResolvedValue({}); localStorage.clear() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe("recipe snapshots in templates", () => {
  it("hydrates the pinned name/version with editable half-servings and a fixed portions measure", () => {
    render(<TemplateFormModal templateToEdit={mixedTemplate} isOpen onClose={vi.fn()} />)
    expect(screen.getByText("Panqueca antiga · Versão 1")).toBeInTheDocument()
    const quantity = screen.getByRole("spinbutton", { name: "Porções de Panqueca antiga" })
    expect(quantity).toHaveValue(1.5)
    expect(quantity).toHaveAttribute("min", "0.5")
    expect(quantity).toHaveAttribute("step", "0.5")
    expect(screen.getByRole("textbox", { name: "Medida de Panqueca antiga" })).toHaveValue("porções")
    expect(screen.getByRole("textbox", { name: "Medida de Panqueca antiga" })).toHaveAttribute("readonly")
    expect(screen.getByText("Aveia")).toBeInTheDocument()
  })

  it("saves a title-only edit retaining mixed source IDs and the pinned version", async () => {
    const user = userEvent.setup()
    render(<TemplateFormModal templateToEdit={mixedTemplate} isOpen onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText("Ex: Hipertrofia Moderada V1"), { target: { value: "Título editado" } })
    await user.click(screen.getByRole("button", { name: "Salvar Modelo Clínico" }))
    expect(mocks.update).toHaveBeenCalledWith({ id: "template-1", data: expect.objectContaining({
      title: "Título editado", meals: [{ name: "Café", time: undefined, notes: undefined, items: [
        { foodId: "food-1", quantity: 80, measure: "g", notes: undefined },
        { recipeVersionId: "version-1", quantity: 1.5, measure: "porções", notes: "Sem açúcar" },
      ] }],
    }) })
  })

  it("edits servings without replacing the recipe snapshot", async () => {
    const user = userEvent.setup()
    render(<TemplateFormModal templateToEdit={mixedTemplate} isOpen onClose={vi.fn()} />)
    fireEvent.change(screen.getByRole("spinbutton", { name: "Porções de Panqueca antiga" }), { target: { value: "2.5" } })
    await user.click(screen.getByRole("button", { name: "Salvar Modelo Clínico" }))
    expect(mocks.update.mock.calls[0][0].data.meals[0].items[1]).toEqual({ recipeVersionId: "version-1", quantity: 2.5, measure: "porções", notes: "Sem açúcar" })
  })

  it.each([0, -1, 0.25])("rejects invalid recipe quantity %s instead of converting it to 100", async (quantity) => {
    const user = userEvent.setup()
    const template = { ...mixedTemplate, meals: [{ name: "Café", items: [{ ...mixedTemplate.meals[0].items[1], quantity }] }] }
    render(<TemplateFormModal templateToEdit={template} isOpen onClose={vi.fn()} />)
    await user.click(screen.getByRole("button", { name: "Salvar Modelo Clínico" }))
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith("Informe porções de receita em passos de 0,5, com mínimo de 0,5.")
  })

  it("shows and copies pinned recipe name/version/preparation and legacy foods", async () => {
    const user = userEvent.setup()
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    render(<TemplateDetailDrawer template={mixedTemplate} isOpen onClose={vi.fn()} onImportClick={vi.fn()} />)
    expect(screen.getByText("Panqueca antiga · Versão 1")).toBeInTheDocument()
    expect(screen.getByText("Preparo: Misture e asse por dez minutos.")).toBeInTheDocument()
    expect(screen.getByText("1.5 porções")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Copiar para WhatsApp" }))
    expect(copy).toHaveBeenCalledWith(expect.stringContaining("Panqueca antiga · Versão 1: 1.5 porções (Sem açúcar)"))
    expect(copy).toHaveBeenCalledWith(expect.stringContaining("Preparo: Misture e asse por dez minutos."))
    expect(copy).toHaveBeenCalledWith(expect.stringContaining("Aveia: 80 g"))
  })

  it("preserves named system foods in detail and copied text", async () => {
    const user = userEvent.setup()
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    const template = { ...mixedTemplate, isSystem: true, meals: [{ name: "Almoço", items: [{ name: "Arroz curado", quantity: 100, measure: "g" }] }] }
    render(<TemplateDetailDrawer template={template} isOpen onClose={vi.fn()} onImportClick={vi.fn()} />)
    expect(screen.getByText("Arroz curado")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Copiar para WhatsApp" }))
    expect(copy).toHaveBeenCalledWith(expect.stringContaining("Arroz curado: 100 g"))
  })

  it("finds a template by the pinned recipe name", async () => {
    const user = userEvent.setup()
    render(<ModelosPlanosPage />)
    await user.type(screen.getByPlaceholderText(/Buscar/), "Panqueca antiga")
    expect(screen.getByText("Modelo misto")).toBeInTheDocument()
  })
})
