export const RECIPE_CATEGORIES = [
  "BREAKFAST",
  "MAIN_MEAL",
  "SNACK",
  "DESSERT",
  "DRINK",
  "OTHER",
] as const

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]
export type RecipeStatus = "ACTIVE" | "ARCHIVED"

export interface RecipeNutrition {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sodium: number
  calcium: number
  iron: number
}

export interface RecipeFood extends RecipeNutrition {
  id: string
  name: string
  baseUnit: string
  baseAmount: number
  source?: string
  createdAt?: string
  updatedAt?: string
}

export interface RecipeIngredientInput {
  foodId: string
  quantity: number
  measure: string
}

export interface RecipeIngredient extends RecipeIngredientInput {
  id: string
  recipeVersionId: string
  food: RecipeFood
}

export interface RecipePreviewIngredient {
  foodId: string
  quantity: number
  food: RecipeFood
}

export interface RecipeVersion extends RecipeNutrition {
  id: string
  recipeId: string
  version: number
  name: string
  description: string | null
  category: RecipeCategory
  servings: number
  instructions: string | null
  isGlutenFree: boolean
  isLactoseFree: boolean
  isVegan: boolean
  ingredients: RecipeIngredient[]
  createdAt: string
  publishedAt?: string | null
}

export interface RecipeSummary {
  id: string
  status: RecipeStatus
  currentVersionId: string
  currentVersion: RecipeVersion
  createdAt: string
  updatedAt: string
}

export interface Recipe extends RecipeSummary {
  versions: RecipeVersion[]
}

export interface RecipeFilters {
  q?: string
  category?: RecipeCategory
  isGlutenFree?: boolean
  isLactoseFree?: boolean
  isVegan?: boolean
  status: RecipeStatus
}

export interface RecipeFormValues {
  name: string
  description?: string
  category: RecipeCategory
  servings: number
  instructions?: string
  isGlutenFree: boolean
  isLactoseFree: boolean
  isVegan: boolean
  ingredients: RecipeIngredientInput[]
}

export interface UpdateRecipeCommand {
  recipeId: string
  values: RecipeFormValues
  expectedVersion: number
}
