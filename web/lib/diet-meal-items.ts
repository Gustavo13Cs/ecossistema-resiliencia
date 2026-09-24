import type { ApiMealItem, DietMealItem } from "@/types/diet"
import type { RecipeNutrition } from "@/types/recipe"

const nutrients = ["kcal", "protein", "carbs", "fat", "fiber", "sodium", "calcium", "iron"] as const

export function getMealItemNutrition(item: DietMealItem): RecipeNutrition {
  const source = item.kind === "FOOD" ? item.food : item.recipeVersion
  const factor = item.kind === "FOOD" ? item.quantity / item.food.baseAmount : item.quantity
  return Object.fromEntries(nutrients.map((key) => [key, Number(((source[key] ?? 0) * factor).toFixed(1))])) as unknown as RecipeNutrition
}

export function toMealItemPayload(item: DietMealItem) {
  const common = { quantity: Number(item.quantity) || 0, measure: item.measure || "" }
  return item.kind === "FOOD"
    ? { ...common, foodId: item.food.id }
    : { ...common, recipeVersionId: item.recipeVersion.id }
}

export function hydrateMealItem(item: ApiMealItem): DietMealItem {
  if (item.recipeVersionId && item.recipeVersion && !item.foodId && !item.food) {
    return { kind: "RECIPE", id: item.id, quantity: item.quantity, measure: item.measure || "porções", recipeVersion: item.recipeVersion }
  }
  if (item.foodId && item.food && !item.recipeVersionId && !item.recipeVersion) {
    return { kind: "FOOD", id: item.id, quantity: item.quantity, measure: item.measure || "", food: item.food }
  }
  throw new Error("Invalid meal item source")
}

export interface ShoppingListItem { foodId: string; name: string; qty: number; measure: string }

export function buildShoppingList(items: DietMealItem[], days: number): ShoppingListItem[] {
  const list = new Map<string, ShoppingListItem>()
  const unit = (baseUnit: string, fallback: string) => baseUnit.toLowerCase().includes("ml") ? "ml" : baseUnit.toLowerCase().includes("g") ? "g" : fallback
  const add = (foodId: string, name: string, quantity: number, measure: string) => {
    const key = JSON.stringify([foodId, measure])
    const existing = list.get(key)
    if (existing) existing.qty += quantity
    else list.set(key, { foodId, name, qty: quantity, measure })
  }
  for (const item of items) {
    if (item.kind === "FOOD") {
      add(item.food.id, item.food.name, item.quantity * days, unit(item.food.baseUnit, item.measure || "g"))
    } else {
      for (const ingredient of item.recipeVersion.ingredients) {
        add(ingredient.foodId, ingredient.food.name, ingredient.quantity * item.quantity / item.recipeVersion.servings * days, unit(ingredient.food.baseUnit, ingredient.measure))
      }
    }
  }
  return [...list.values()].sort((a, b) => b.qty - a.qty)
}
