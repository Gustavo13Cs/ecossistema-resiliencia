import { describe, expect, it } from "vitest"
import {
  calculateRecipePreview,
  getRecipeFoodUnitPresentation,
} from "./recipe-nutrition"
import type { RecipePreviewIngredient } from "@/types/recipe"

const ingredients: RecipePreviewIngredient[] = [
  {
    foodId: "food-a",
    quantity: 50,
    food: {
      id: "food-a",
      name: "Aveia",
      baseUnit: "100 g",
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
  },
  {
    foodId: "food-b",
    quantity: 2,
    food: {
      id: "food-b",
      name: "Ovo",
      baseUnit: "unidade",
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
]

describe("calculateRecipePreview", () => {
  it("calcula uma prévia visual dos oito nutrientes por porção", () => {
    expect(calculateRecipePreview(ingredients, 2)).toEqual({
      kcal: 150,
      protein: 4.5,
      carbs: 20,
      fat: 4.25,
      fiber: 2,
      sodium: 10,
      calcium: 10.5,
      iron: 1.5,
    })
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejeita rendimento inválido: %s",
    (servings) => {
      expect(() => calculateRecipePreview(ingredients, servings)).toThrow(
        /rendimento/i,
      )
    },
  )

  it("rejeita lista vazia e quantidade ou base nutricional inválida", () => {
    expect(() => calculateRecipePreview([], 2)).toThrow(/ingrediente/i)
    expect(() =>
      calculateRecipePreview([{ ...ingredients[0], quantity: 0 }], 2),
    ).toThrow(/quantidade/i)
    expect(() =>
      calculateRecipePreview(
        [
          {
            ...ingredients[0],
            food: { ...ingredients[0].food, baseAmount: 0 },
          },
        ],
        2,
      ),
    ).toThrow(/base/i)
  })
})

describe("getRecipeFoodUnitPresentation", () => {
  it.each([
    [100, "100g", "g", "100 g"],
    [100, "100 g", "g", "100 g"],
    [100, "100ml", "ml", "100 ml"],
    [1, "1 unidade", "unidade", "1 unidade"],
    [100, "g", "g", "100 g"],
    [1, "unidade", "unidade", "1 unidade"],
    [2, "colheres", "colheres", "2 colheres"],
  ])(
    "normaliza base %s/%s para medida %s e rótulo %s",
    (baseAmount, baseUnit, expectedMeasure, expectedBaseLabel) => {
      expect(getRecipeFoodUnitPresentation(baseAmount, baseUnit)).toEqual({
        measure: expectedMeasure,
        baseLabel: expectedBaseLabel,
      })
    },
  )
})
