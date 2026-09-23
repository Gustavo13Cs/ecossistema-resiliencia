import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { AuthUser } from "@/types/auth"
import type { RecipeFormValues, RecipeSummary } from "@/types/recipe"
import {
  useArchiveRecipe,
  useCreateRecipe,
  useDuplicateRecipe,
  useRecipe,
  useRecipes,
  useRestoreRecipe,
  useUpdateRecipe,
} from "./useRecipes"

const authState = vi.hoisted(() => ({ user: null as AuthUser | null }))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const http = new AxiosMockAdapter(api)
const filters = {
  q: "sopa",
  category: "MAIN_MEAL" as const,
  isGlutenFree: true,
  isLactoseFree: false,
  isVegan: true,
  status: "ACTIVE" as const,
}

const recipe: RecipeSummary = {
  id: "recipe-one",
  status: "ACTIVE",
  currentVersionId: "version-one",
  currentVersion: {
    id: "version-one",
    recipeId: "recipe-one",
    version: 1,
    name: "Sopa de lentilha",
    description: null,
    category: "MAIN_MEAL",
    servings: 4,
    instructions: "Cozinhe e sirva.",
    isGlutenFree: true,
    isLactoseFree: true,
    isVegan: true,
    kcal: 230,
    protein: 14,
    carbs: 38,
    fat: 4,
    fiber: 10,
    sodium: 180,
    calcium: 60,
    iron: 4,
    ingredients: [],
    createdAt: "2026-09-20T12:00:00.000Z",
    publishedAt: "2026-09-20T12:00:00.000Z",
  },
  createdAt: "2026-09-20T12:00:00.000Z",
  updatedAt: "2026-09-20T12:00:00.000Z",
}

const values: RecipeFormValues = {
  name: "Sopa de lentilha",
  description: "Receita para o almoço",
  category: "MAIN_MEAL",
  servings: 4,
  instructions: "Cozinhe e sirva.",
  isGlutenFree: true,
  isLactoseFree: false,
  isVegan: true,
  ingredients: [{ foodId: "food-one", quantity: 240, measure: "g" }],
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

beforeEach(() => {
  authState.user = {
    sub: "nutritionist-one",
    role: "NUTRITIONIST",
    name: "Dra. Ana",
  }
  http.reset()
})

afterEach(() => {
  cleanup()
  authState.user = null
})

describe("recipe hooks", () => {
  it("isola o cache por sessão e envia apenas filtros booleanos verdadeiros", async () => {
    http.onGet("/recipes").reply(200, [recipe])
    const { queryClient, wrapper } = createWrapper()
    const { result } = renderHook(() => useRecipes(filters), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([recipe])
    expect(http.history.get[0]?.params).toEqual({
      q: "sopa",
      category: "MAIN_MEAL",
      isGlutenFree: true,
      isVegan: true,
      status: "ACTIVE",
    })
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      queryKeys.recipes("nutritionist-one", filters),
    )
  })

  it("não consulta receitas fora do papel NUTRITIONIST", async () => {
    authState.user = {
      sub: "personal-one",
      role: "PERSONAL",
      name: "Rafael",
    }
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useRecipes(filters), { wrapper })

    expect(result.current.fetchStatus).toBe("idle")
    expect(http.history.get).toHaveLength(0)
  })

  it("cria receita sem macros e invalida a raiz privada da sessão", async () => {
    http.onPost("/recipes").reply(201, recipe)
    const { queryClient, wrapper } = createWrapper()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useCreateRecipe(), { wrapper })

    await expect(result.current.mutateAsync(values)).resolves.toEqual(recipe)

    expect(http.history.post[0]?.data).toBe(JSON.stringify(values))
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.recipesRoot("nutritionist-one"),
    })
  })

  it("atualiza e arquiva invalidando lista e receita individual", async () => {
    http.onPatch("/recipes/recipe-one").reply(200, recipe)
    http.onPatch("/recipes/recipe-one/archive").reply(200, {
      ...recipe,
      status: "ARCHIVED",
    })
    const { queryClient, wrapper } = createWrapper()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const update = renderHook(() => useUpdateRecipe(), { wrapper })
    const archive = renderHook(() => useArchiveRecipe(), { wrapper })

    await update.result.current.mutateAsync({
      recipeId: "recipe-one",
      values,
      expectedVersion: 1,
    })
    await archive.result.current.mutateAsync("recipe-one")

    expect(JSON.parse(http.history.patch[0]?.data ?? "{}")).toEqual({
      ...values,
      expectedVersion: 1,
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.recipesRoot("nutritionist-one"),
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.recipe("nutritionist-one", "recipe-one"),
    })
  })

  it("busca o detalhe privado usado pelo histórico", async () => {
    const detail = { ...recipe, versions: [recipe.currentVersion] }
    http.onGet("/recipes/recipe-one").reply(200, detail)
    const { queryClient, wrapper } = createWrapper()
    const { result } = renderHook(() => useRecipe("recipe-one"), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(detail)
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      queryKeys.recipe("nutritionist-one", "recipe-one"),
    )
  })

  it("duplica e restaura invalidando lista, origem e resultado", async () => {
    const duplicate = { ...recipe, id: "recipe-copy" }
    const restored = { ...recipe, status: "ACTIVE" as const }
    http.onPost("/recipes/recipe-one/duplicate").reply(201, duplicate)
    http.onPatch("/recipes/recipe-one/restore").reply(200, restored)
    const { queryClient, wrapper } = createWrapper()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const duplicateHook = renderHook(() => useDuplicateRecipe(), { wrapper })
    const restoreHook = renderHook(() => useRestoreRecipe(), { wrapper })

    await duplicateHook.result.current.mutateAsync("recipe-one")
    await restoreHook.result.current.mutateAsync("recipe-one")

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.recipesRoot("nutritionist-one"),
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.recipe("nutritionist-one", "recipe-one"),
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.recipe("nutritionist-one", "recipe-copy"),
    })
  })
})
