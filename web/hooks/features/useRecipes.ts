"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  Recipe,
  RecipeFilters,
  RecipeFood,
  RecipeFormValues,
  RecipeSummary,
  UpdateRecipeCommand,
} from "@/types/recipe"

function recipeQueryParams(filters: RecipeFilters) {
  const query = filters.q?.trim()
  return {
    ...(query ? { q: query } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.isGlutenFree ? { isGlutenFree: true } : {}),
    ...(filters.isLactoseFree ? { isLactoseFree: true } : {}),
    ...(filters.isVegan ? { isVegan: true } : {}),
    status: filters.status,
  }
}

function useRecipeSession() {
  const { user } = useAuth()
  return {
    sessionUserId: user?.sub ?? "anonymous",
    isNutritionist: Boolean(user?.sub && user.role === "NUTRITIONIST"),
  }
}

function useRecipeInvalidation() {
  const queryClient = useQueryClient()
  const { sessionUserId } = useRecipeSession()

  return async (recipeId?: string) => {
    const invalidations = [
      queryClient.invalidateQueries({
        queryKey: queryKeys.recipesRoot(sessionUserId),
      }),
    ]
    if (recipeId) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.recipe(sessionUserId, recipeId),
        }),
      )
    }
    await Promise.all(invalidations)
  }
}

export function useRecipes(filters: RecipeFilters) {
  const { sessionUserId, isNutritionist } = useRecipeSession()
  return useQuery({
    queryKey: queryKeys.recipes(sessionUserId, filters),
    queryFn: async ({ signal }) => {
      const response = await api.get<RecipeSummary[]>("/recipes", {
        params: recipeQueryParams(filters),
        signal,
      })
      return response.data ?? []
    },
    enabled: isNutritionist,
  })
}

export function useRecipe(recipeId: string | null, enabled = true) {
  const { sessionUserId, isNutritionist } = useRecipeSession()
  return useQuery({
    queryKey: queryKeys.recipe(sessionUserId, recipeId ?? "missing"),
    queryFn: async ({ signal }) => {
      const response = await api.get<Recipe>(`/recipes/${recipeId}`, { signal })
      return response.data
    },
    enabled: Boolean(recipeId && enabled && isNutritionist),
  })
}

export function useRecipeFoodSearch(query: string, enabled = true) {
  const { sessionUserId, isNutritionist } = useRecipeSession()
  const normalizedQuery = query.trim()
  return useQuery({
    queryKey: queryKeys.recipeFoodSearch(sessionUserId, normalizedQuery),
    queryFn: async ({ signal }) => {
      const response = await api.get<RecipeFood[]>("/foods/search", {
        params: { q: normalizedQuery },
        signal,
      })
      return response.data ?? []
    },
    enabled: Boolean(
      enabled && isNutritionist && normalizedQuery.length >= 2,
    ),
  })
}

export function useCreateRecipe() {
  const invalidate = useRecipeInvalidation()
  return useMutation({
    mutationFn: async (values: RecipeFormValues) => {
      const response = await api.post<RecipeSummary>("/recipes", values)
      return response.data
    },
    onSuccess: (created) => invalidate(created.id),
  })
}

export function useUpdateRecipe() {
  const invalidate = useRecipeInvalidation()
  return useMutation({
    mutationFn: async ({
      recipeId,
      values,
      expectedVersion,
    }: UpdateRecipeCommand) => {
      const response = await api.patch<RecipeSummary>(`/recipes/${recipeId}`, {
        ...values,
        expectedVersion,
      })
      return response.data
    },
    onSuccess: (updated) => invalidate(updated.id),
  })
}

export function useDuplicateRecipe() {
  const invalidate = useRecipeInvalidation()
  return useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await api.post<RecipeSummary>(
        `/recipes/${recipeId}/duplicate`,
      )
      return response.data
    },
    onSuccess: (created, sourceRecipeId) =>
      Promise.all([invalidate(sourceRecipeId), invalidate(created.id)]),
  })
}

function useRecipeStatusMutation(action: "archive" | "restore") {
  const invalidate = useRecipeInvalidation()
  return useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await api.patch<RecipeSummary>(
        `/recipes/${recipeId}/${action}`,
      )
      return response.data
    },
    onSuccess: (updated) => invalidate(updated.id),
  })
}

export function useArchiveRecipe() {
  return useRecipeStatusMutation("archive")
}

export function useRestoreRecipe() {
  return useRecipeStatusMutation("restore")
}
