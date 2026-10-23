"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { CreateWorkoutInput, WorkoutDetail, WorkoutPrescription, WorkoutSummary } from "@/types/workout"
import { useClinicalQuery } from "./useClinicalQuery"

export function useWorkouts(options: { clientId?: string; workoutId?: string; week?: number; enabled?: boolean }) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sessionUserId = user?.sub ?? "anonymous"
  const { clientId, workoutId, week } = options
  const isPersonal = Boolean(user?.sub && user.role === "PERSONAL")
  const enabled = isPersonal && options.enabled !== false

  const listQuery = useClinicalQuery(
    queryKeys.workouts(sessionUserId),
    enabled && !clientId && !workoutId,
    async signal => {
      const { data } = await api.get<WorkoutSummary[]>("/workouts", { signal })
      return data ?? []
    },
  )
  const detailQuery = useClinicalQuery(
    queryKeys.workout(sessionUserId, clientId ?? "missing", workoutId ?? "missing", week),
    Boolean(enabled && clientId && workoutId),
    async signal => {
      const { data } = await api.get<WorkoutDetail>(`/workouts/${workoutId}`, { signal, ...(week !== undefined ? { params: { week } } : {}) })
      if (data.id !== workoutId || data.clientId !== clientId || data.client.id !== clientId) {
        throw new Error("Treino incompatível com o prontuário solicitado")
      }
      return data
    },
  )
  const activeQuery = useClinicalQuery(
    queryKeys.activeWorkout(sessionUserId, clientId ?? "missing"),
    Boolean(enabled && clientId && !workoutId),
    async signal => {
      const { data } = await api.get<WorkoutPrescription | null>(`/workouts/client/${clientId}/active`, { signal })
      if (data && data.clientId !== clientId) throw new Error("Treino incompatível com o prontuário solicitado")
      return data
    },
  )
  const createMutation = useMutation({
    mutationFn: async (input: CreateWorkoutInput) => {
      if (!isPersonal) throw new Error("Acesso restrito ao Personal")
      const { data } = await api.post<WorkoutPrescription>("/workouts", input)
      return data
    },
    onMutate: () => ({ sessionUserId }),
    onSuccess: async (_created, input, context) => {
      const owner = context.sessionUserId
      await Promise.all([
        cache.invalidateQueries({ queryKey: queryKeys.trainingWorkspace(owner) }),
        cache.invalidateQueries({ queryKey: queryKeys.workouts(owner) }),
        cache.invalidateQueries({ queryKey: queryKeys.trainingOverview(owner, input.clientId) }),
        cache.invalidateQueries({ queryKey: [...queryKeys.workoutsRoot(owner), "client", input.clientId] }),
      ])
    },
  })

  return { listQuery, detailQuery, activeQuery, createMutation }
}
