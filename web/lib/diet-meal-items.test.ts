import { describe, expect, it } from "vitest"
import { buildShoppingList, getMealItemNutrition, hydrateMealItem, toMealItemPayload } from "./diet-meal-items"
import type { FoodMealItem, RecipeMealItem } from "@/types/diet"
import type { RecipeVersion } from "@/types/recipe"

const food = { id: "oat", name: "Aveia", baseAmount: 100, baseUnit: "100g", kcal: 400, protein: 10, carbs: 60, fat: 8, fiber: 10, sodium: 20, calcium: 80, iron: 4 }
const recipeVersion: RecipeVersion = {
  id: "version-1", recipeId: "recipe-1", version: 1, name: "Panqueca", description: null,
  category: "BREAKFAST", servings: 2, instructions: null, isGlutenFree: false,
  isLactoseFree: true, isVegan: true, createdAt: "2026-09-21T00:00:00Z",
  kcal: 200, protein: 16, carbs: 30, fat: 6, fiber: 4, sodium: 100, calcium: 80, iron: 2,
  ingredients: [{ id: "ingredient-1", recipeVersionId: "version-1", foodId: "oat", food, quantity: 100, measure: "g" }],
}
const recipeItem: RecipeMealItem = { kind: "RECIPE", id: "item-1", quantity: 1.5, measure: "porções", recipeVersion }
const foodItem: FoodMealItem = { kind: "FOOD", id: "item-2", quantity: 50, measure: "g", food }

describe("diet meal items", () => {
  it("scales all eight recipe nutrients by prescribed servings and emits only recipeVersionId", () => {
    expect(getMealItemNutrition(recipeItem)).toEqual({ kcal: 300, protein: 24, carbs: 45, fat: 9, fiber: 6, sodium: 150, calcium: 120, iron: 3 })
    expect(toMealItemPayload(recipeItem)).toEqual({ quantity: 1.5, measure: "porções", recipeVersionId: "version-1" })
  })

  it("retains the food branch and its exclusive foodId payload", () => {
    expect(getMealItemNutrition(foodItem)).toEqual({ kcal: 200, protein: 5, carbs: 30, fat: 4, fiber: 5, sodium: 10, calcium: 40, iron: 2 })
    expect(toMealItemPayload(foodItem)).toEqual({ quantity: 50, measure: "g", foodId: "oat" })
  })

  it("hydrates a saved historical version without substituting the current one", () => {
    expect(hydrateMealItem({ id: "saved", quantity: 1.5, measure: "porções", foodId: null, food: null, recipeVersionId: "version-1", recipeVersion })).toEqual({ ...recipeItem, id: "saved" })
  })

  it("expands recipe ingredients per recipe yield and aggregates by foodId across direct foods", () => {
    expect(buildShoppingList([{ ...foodItem, quantity: 25 }, recipeItem], 2)).toEqual([
      { foodId: "oat", name: "Aveia", qty: 200, measure: "g" },
    ])
  })
})
