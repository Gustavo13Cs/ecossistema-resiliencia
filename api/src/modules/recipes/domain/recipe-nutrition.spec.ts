import {
  calculateRecipeNutrition,
  RecipeNutritionValidationError,
} from './recipe-nutrition';

const validIngredient = {
  foodId: 'food-a',
  quantity: 50,
  food: {
    baseAmount: 100,
    kcal: 200,
    protein: 10,
    carbs: 20,
    fat: 5,
    fiber: 4,
    sodium: 20,
    calcium: 10,
    iron: 2,
  },
};

describe('calculateRecipeNutrition', () => {
  it('sums ingredients and divides every nutrient by servings', () => {
    const result = calculateRecipeNutrition(
      [
        validIngredient,
        {
          foodId: 'food-b',
          quantity: 2,
          food: {
            baseAmount: 1,
            kcal: 100,
            protein: 2,
            carbs: 15,
            fat: 3,
            fiber: 1,
            sodium: 5,
            calcium: 8,
            iron: 1,
          },
        },
      ],
      2,
    );

    expect(result).toEqual({
      kcal: 150,
      protein: 4.5,
      carbs: 20,
      fat: 4.25,
      fiber: 2,
      sodium: 10,
      calcium: 10.5,
      iron: 1.5,
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects servings outside the positive finite range: %p',
    (servings) => {
      expect(() => calculateRecipeNutrition([validIngredient], servings)).toThrow(
        RecipeNutritionValidationError,
      );
      expect(() => calculateRecipeNutrition([validIngredient], servings)).toThrow('servings');
    },
  );

  it('rejects an empty ingredient list', () => {
    expect(() => calculateRecipeNutrition([], 1)).toThrow(RecipeNutritionValidationError);
    expect(() => calculateRecipeNutrition([], 1)).toThrow('ingredients');
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects ingredient quantities outside the positive finite range: %p',
    (quantity) => {
      expect(() =>
        calculateRecipeNutrition([{ ...validIngredient, quantity }], 1),
      ).toThrow(RecipeNutritionValidationError);
      expect(() => calculateRecipeNutrition([{ ...validIngredient, quantity }], 1)).toThrow(
        'quantity',
      );
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects food base amounts outside the positive finite range: %p',
    (baseAmount) => {
      expect(() =>
        calculateRecipeNutrition(
          [{ ...validIngredient, food: { ...validIngredient.food, baseAmount } }],
          1,
        ),
      ).toThrow(RecipeNutritionValidationError);
      expect(() =>
        calculateRecipeNutrition(
          [{ ...validIngredient, food: { ...validIngredient.food, baseAmount } }],
          1,
        ),
      ).toThrow('baseAmount');
    },
  );

  it.each<[keyof typeof validIngredient.food, number]>([
    ['kcal', -1],
    ['protein', Number.NaN],
    ['carbs', Number.POSITIVE_INFINITY],
    ['fat', Number.NEGATIVE_INFINITY],
    ['fiber', -1],
    ['sodium', Number.NaN],
    ['calcium', Number.POSITIVE_INFINITY],
    ['iron', Number.NEGATIVE_INFINITY],
  ])('rejects invalid %s nutrient values', (nutrient, value) => {
    expect(() =>
      calculateRecipeNutrition(
        [{ ...validIngredient, food: { ...validIngredient.food, [nutrient]: value } }],
        1,
      ),
    ).toThrow(RecipeNutritionValidationError);
    expect(() =>
      calculateRecipeNutrition(
        [{ ...validIngredient, food: { ...validIngredient.food, [nutrient]: value } }],
        1,
      ),
    ).toThrow('nutrients');
  });
});
