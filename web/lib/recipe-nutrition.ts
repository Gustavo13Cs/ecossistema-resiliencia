import type {
  RecipeNutrition,
  RecipePreviewIngredient,
} from "@/types/recipe"

const NUTRIENT_KEYS = [
  "kcal",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sodium",
  "calcium",
  "iron",
] as const satisfies readonly (keyof RecipeNutrition)[]

function assertPositiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} deve ser maior que zero.`)
  }
}

function assertNutrition(food: RecipePreviewIngredient["food"]) {
  for (const key of NUTRIENT_KEYS) {
    const value = food[key]
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Valor nutricional inválido: ${key}.`)
    }
  }
}

export function calculateRecipePreview(
  ingredients: readonly RecipePreviewIngredient[],
  servings: number,
): RecipeNutrition {
  assertPositiveFinite(servings, "O rendimento")
  if (ingredients.length === 0) {
    throw new Error("Adicione ao menos um ingrediente.")
  }

  const totals: RecipeNutrition = {
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    calcium: 0,
    iron: 0,
  }

  for (const ingredient of ingredients) {
    assertPositiveFinite(ingredient.quantity, "A quantidade")
    assertPositiveFinite(ingredient.food.baseAmount, "A base nutricional")
    assertNutrition(ingredient.food)
    const factor = ingredient.quantity / ingredient.food.baseAmount
    for (const key of NUTRIENT_KEYS) {
      totals[key] += ingredient.food[key] * factor
    }
  }

  const perServing = { ...totals }
  for (const key of NUTRIENT_KEYS) {
    perServing[key] = totals[key] / servings
  }
  return perServing
}

const LEADING_BASE_AMOUNT = /^\s*\d+(?:[.,]\d+)?\s*/
const baseAmountFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 6,
})

export function getRecipeFoodUnitPresentation(
  baseAmount: number,
  baseUnit: string,
) {
  const rawUnit = baseUnit.trim()
  const unitWithoutEmbeddedAmount = rawUnit.replace(LEADING_BASE_AMOUNT, "").trim()
  const measure = unitWithoutEmbeddedAmount || rawUnit
  const formattedBaseAmount = baseAmountFormat.format(baseAmount)

  return {
    measure,
    baseLabel: `${formattedBaseAmount} ${measure}`.trim(),
  }
}
