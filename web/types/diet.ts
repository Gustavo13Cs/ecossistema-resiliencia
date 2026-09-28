import type { RecipeFood, RecipeVersion } from "./recipe"

export type FoodNutrition = RecipeFood

export interface RecipeVersionWithRecipe extends RecipeVersion {
  recipe?: { id: string; currentVersionId: string; status: "ACTIVE" | "ARCHIVED" }
}

export interface FoodMealItem {
  kind: "FOOD"
  id: string
  quantity: number
  measure: string
  food: FoodNutrition
}

export interface RecipeMealItem {
  kind: "RECIPE"
  id: string
  quantity: number
  measure: string
  recipeVersion: RecipeVersionWithRecipe
}

export type DietMealItem = FoodMealItem | RecipeMealItem

export interface DietMeal {
  id: string
  name: string
  time: string
  notes: string
  items: DietMealItem[]
}

export interface ApiMealItem {
  id: string
  quantity: number
  measure: string | null
  foodId: string | null
  food: FoodNutrition | null
  recipeVersionId: string | null
  recipeVersion: RecipeVersionWithRecipe | null
}
