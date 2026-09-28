export const RECIPE_NUTRIENT_KEYS = [
  'kcal',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sodium',
  'calcium',
  'iron',
] as const;

type RecipeNutrientKey = (typeof RECIPE_NUTRIENT_KEYS)[number];

export type RecipeNutrition = Record<RecipeNutrientKey, number>;

export type RecipeNutritionFood = RecipeNutrition & {
  baseAmount: number;
};

export type RecipeNutritionIngredient = {
  foodId: string;
  quantity: number;
  food: RecipeNutritionFood;
};

type RecipeNutritionValidationField =
  | 'servings'
  | 'ingredients'
  | 'quantity'
  | 'baseAmount'
  | 'nutrients';

export class RecipeNutritionValidationError extends Error {
  constructor(public readonly field: RecipeNutritionValidationField) {
    super(`Invalid recipe nutrition ${field}`);
    this.name = RecipeNutritionValidationError.name;
  }
}

export function calculateRecipeNutrition(
  ingredients: readonly RecipeNutritionIngredient[],
  servings: number,
): RecipeNutrition {
  assertPositiveFinite(servings, 'servings');

  if (ingredients.length === 0) {
    throw new RecipeNutritionValidationError('ingredients');
  }

  const totals = emptyNutrition();
  for (const ingredient of ingredients) {
    assertPositiveFinite(ingredient.quantity, 'quantity');
    assertPositiveFinite(ingredient.food.baseAmount, 'baseAmount');
    assertValidNutrients(ingredient.food);

    const factor = ingredient.quantity / ingredient.food.baseAmount;
    for (const key of RECIPE_NUTRIENT_KEYS) {
      totals[key] += ingredient.food[key] * factor;
    }
  }

  return mapNutrition(totals, (value) => value / servings);
}

function assertPositiveFinite(
  value: number,
  field: Extract<RecipeNutritionValidationField, 'servings' | 'quantity' | 'baseAmount'>,
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RecipeNutritionValidationError(field);
  }
}

function assertValidNutrients(food: RecipeNutritionFood): void {
  for (const key of RECIPE_NUTRIENT_KEYS) {
    if (!Number.isFinite(food[key]) || food[key] < 0) {
      throw new RecipeNutritionValidationError('nutrients');
    }
  }
}

function emptyNutrition(): RecipeNutrition {
  return {
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    calcium: 0,
    iron: 0,
  };
}

function mapNutrition(
  nutrition: RecipeNutrition,
  mapper: (value: number) => number,
): RecipeNutrition {
  const mapped = emptyNutrition();
  for (const key of RECIPE_NUTRIENT_KEYS) {
    mapped[key] = mapper(nutrition[key]);
  }
  return mapped;
}
