"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  CreateCustomExerciseInput,
  ExerciseLibraryItem,
  MuscleGroup,
} from "@/types/workout"
import { useClinicalQuery } from "./useClinicalQuery"

export function useExerciseLibrary(options: {
  q?: string
  muscleGroup?: MuscleGroup | ""
  enabled?: boolean
} = {}) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sessionUserId = user?.sub ?? "anonymous"
  const isPersonal = Boolean(user?.sub && user.role === "PERSONAL")
  const enabled = isPersonal && options.enabled !== false
  const normalizedQ = (options.q ?? "").trim()
  const muscleGroup = options.muscleGroup ?? ""

  const libraryQuery = useClinicalQuery(
    queryKeys.exerciseLibrary(sessionUserId, normalizedQ, muscleGroup || "ALL"),
    enabled,
    async signal => {
      const params: Record<string, string> = {}
      if (normalizedQ) params.q = normalizedQ
      if (muscleGroup) params.muscleGroup = muscleGroup
      const { data } = await api.get<ExerciseLibraryItem[]>(
        "/workouts/exercise-library",
        { params, signal },
      )
      return data ?? []
    },
  )

  const createCustomMutation = useMutation({
    mutationFn: async (input: CreateCustomExerciseInput) => {
      if (!isPersonal) throw new Error("Acesso restrito ao Personal")
      const { data } = await api.post<ExerciseLibraryItem>(
        "/workouts/exercise-library",
        input,
      )
      return data
    },
    onMutate: () => ({ sessionUserId }),
    onSuccess: async (_created, _input, context) => {
      await cache.invalidateQueries({
        queryKey: queryKeys.exerciseLibraryRoot(context.sessionUserId),
      })
    },
  })

  const deleteCustomMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isPersonal) throw new Error("Acesso restrito ao Personal")
      const { data } = await api.delete<{ id: string }>(
        `/workouts/exercise-library/${id}`,
      )
      return data
    },
    onMutate: () => ({ sessionUserId }),
    onSuccess: async (_deleted, _id, context) => {
      await cache.invalidateQueries({
        queryKey: queryKeys.exerciseLibraryRoot(context.sessionUserId),
      })
    },
  })

  return {
    libraryQuery,
    createCustomMutation,
    deleteCustomMutation,
  }
}
