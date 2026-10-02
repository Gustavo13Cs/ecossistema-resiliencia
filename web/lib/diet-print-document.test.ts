import { describe, expect, it } from "vitest"
import type { DietMeal, RecipeMealItem } from "@/types/diet"
import type { RecipeFood } from "@/types/recipe"
import { buildDietPrintHtml, buildShoppingListPrintHtml } from "./diet-print-document"

const oat: RecipeFood = { id: "oat", name: "Aveia", baseAmount: 100, baseUnit: "100g", kcal: 400, protein: 10, carbs: 60, fat: 8, fiber: 10, sodium: 20, calcium: 80, iron: 4 }
const milk: RecipeFood = { ...oat, id: "milk", name: "Leite", baseUnit: "100ml" }
const egg: RecipeFood = { ...oat, id: "egg", name: "Ovo", baseAmount: 1, baseUnit: "unidade" }
const recipe: RecipeMealItem = {
  kind: "RECIPE", id: "recipe-item", quantity: 1.5, measure: "porções",
  recipeVersion: {
    id: "version-1", recipeId: "recipe", version: 1, name: "Panqueca antiga", description: null,
    category: "BREAKFAST", servings: 2, instructions: "Misture os ingredientes.\nAsse por 10 minutos.",
    isGlutenFree: false, isLactoseFree: false, isVegan: false, createdAt: "2026-09-21",
    kcal: 200, protein: 16, carbs: 30, fat: 6, fiber: 4, sodium: 100, calcium: 80, iron: 2,
    recipe: { id: "recipe", currentVersionId: "version-2", status: "ACTIVE" },
    ingredients: [
      { id: "oat-ingredient", recipeVersionId: "version-1", foodId: "oat", food: oat, quantity: 100, measure: "g" },
      { id: "milk-ingredient", recipeVersionId: "version-1", foodId: "milk", food: milk, quantity: 200, measure: "ml" },
      { id: "egg-ingredient", recipeVersionId: "version-1", foodId: "egg", food: egg, quantity: 2, measure: "unidade" },
    ],
  },
}
const meals: DietMeal[] = [{ id: "breakfast", name: "Café da manhã", time: "08:00", notes: "Comer devagar", items: [
  { kind: "FOOD", id: "food-item", quantity: 50, measure: "2 colheres", food: oat }, recipe,
] }]
const input = { clientName: "Ana", dateLabel: "28 de setembro de 2026", dietInfo: { title: "Plano semanal", goal: "Manutenção", durationDays: 7, notes: "Beba água\nTodos os dias" }, meals }
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html")

describe("diet print documents", () => {
  it.each(['<script>alert(1)</script>', '<svg onload="alert(2)">', '</style><img src=x onerror=alert(3)>', 'quotes " & \' plus\nsecond line'])("keeps title and clinical text inert: %s", attack => {
    const dangerous = { ...input, clientName: attack, dateLabel: attack, dietInfo: { ...input.dietInfo, title: attack, goal: attack, notes: attack }, meals: [{ ...meals[0], name: attack, time: attack, notes: attack, items: [{ ...recipe, recipeVersion: { ...recipe.recipeVersion, name: attack, instructions: attack, ingredients: [{ ...recipe.recipeVersion.ingredients[0], measure: attack, food: { ...oat, name: attack } }] } }] }] }
    for (const html of [buildDietPrintHtml(dangerous), buildShoppingListPrintHtml({ ...dangerous, shoppingDays: 2 })]) {
      const document = parse(html)
      expect(document.querySelector("script,svg,img,[onload],[onerror]")).toBeNull()
      expect(document.querySelector(".client-name")?.textContent).toBe(attack)
      expect(document.querySelector(".doc-subtitle")?.textContent).toContain(attack)
      expect(document.querySelector("title")?.textContent).toContain(attack)
    }
    const doc = parse(buildDietPrintHtml(dangerous))
    expect(doc.querySelector(".meal-time")?.textContent).toBe(attack)
    expect(doc.querySelector(".recipe-instructions")?.textContent).toBe(attack.replace(/\r?\n/g, ""))
  })
  it("prints mixed meals with food amounts and macros from the prescribed recipe snapshot", () => {
    const doc = parse(buildDietPrintHtml(input))
    expect(doc.querySelector(".brand")?.textContent).toBe("SafeMove · Nutrição")
    expect(doc.querySelector(".meal-block")?.textContent).toContain("Aveia")
    expect(doc.querySelector(".qty-cell")?.textContent).toContain("50g")
    expect(doc.querySelector(".qty-cell .measure")?.textContent).toBe("2 colheres")
    expect(doc.querySelector(".meal-macros")?.textContent).toContain("500 kcal")
    expect(doc.querySelector(".meal-macros")?.textContent).toContain("P 29g")
    expect(doc.querySelectorAll(".t-value")[0]?.textContent).toBe("500")
    expect(doc.querySelectorAll(".t-value")[1]?.textContent).toBe("29")
    expect(doc.querySelector(".meal-notes")?.textContent).toContain("Comer devagar")
    expect(doc.querySelector(".general-notes p")?.innerHTML).toBe("Beba água<br>Todos os dias")
  })

  it("prints historical name, version, prescribed servings, scaled ingredients and preparation", () => {
    const doc = parse(buildDietPrintHtml(input))
    const detail = doc.querySelector(".recipe-detail")
    expect(doc.body.textContent).toContain("Panqueca antiga · versão 1")
    expect(doc.body.textContent).toContain("1,5porções")
    expect(detail?.textContent).toContain("75 g — Aveia")
    expect(detail?.textContent).toContain("150 ml — Leite")
    expect(detail?.textContent).toContain("1,5 unidade — Ovo")
    expect(detail?.querySelector(".recipe-instructions")?.innerHTML).toBe("Misture os ingredientes.<br>Asse por 10 minutos.")
    expect(doc.body.textContent).not.toContain("versão 2")
  })

  it("consolidates recipe ingredients with direct foods for the selected days and preserves units", () => {
    const doc = parse(buildShoppingListPrintHtml({ ...input, shoppingDays: 2 }))
    const rows = Array.from(doc.querySelectorAll(".list-table tr"), row => row.textContent?.replace(/\s+/g, " ").trim())
    expect(rows).toEqual(["Leite 300 ml", "Aveia 250 g", "Ovo 3 unidade"])
    expect(doc.querySelectorAll(".list-table")).toHaveLength(2)
    expect(doc.querySelector(".meta-line:last-child")?.textContent).toContain("2 dias")
  })

  it("prints milliliters and count units on direct foods instead of assuming grams", () => {
    const doc = parse(buildDietPrintHtml({ ...input, meals: [{ ...meals[0], items: [
      { kind: "FOOD", id: "milk-item", quantity: 150, measure: "1 copo", food: milk },
      { kind: "FOOD", id: "egg-item", quantity: 2, measure: "unidade", food: egg },
    ] }] }))
    expect(doc.querySelectorAll(".qty-cell")[0]?.textContent).toBe("150ml1 copo")
    expect(doc.querySelectorAll(".qty-cell")[1]?.textContent).toBe("2unidade")
  })

  it("escapes all text including titles, names, notes, preparation and measures in both documents", () => {
    const attack = '<svg onload="alert(1)"><script>alert(2)</script>&\'unsafe'
    const dangerous = { ...input, clientName: attack, dateLabel: attack,
      dietInfo: { title: attack, goal: attack, durationDays: 7, notes: attack },
      meals: [{ ...meals[0], name: attack, time: attack, notes: attack, items: [
        { kind: "FOOD" as const, id: "unsafe-food", quantity: 2, measure: attack, food: { ...egg, name: attack, baseUnit: attack } },
        { ...recipe, recipeVersion: { ...recipe.recipeVersion, name: attack, instructions: attack,
          ingredients: [{ ...recipe.recipeVersion.ingredients[0], measure: attack, food: { ...oat, name: attack, baseUnit: "count" } }],
        } },
      ] }],
    }
    for (const html of [buildDietPrintHtml(dangerous), buildShoppingListPrintHtml({ ...dangerous, shoppingDays: 2 })]) {
      const doc = parse(html)
      expect(doc.querySelector("svg,script,[onload]")).toBeNull()
      expect(html).toContain("&lt;svg onload=&quot;alert(1)&quot;&gt;&lt;script&gt;")
      expect(doc.querySelector(".client-name")?.textContent).toBe(attack)
      expect(doc.title).toContain(attack)
    }
  })
})
