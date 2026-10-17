"use client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { CreateAssessmentInput, PhysicalAssessment } from "@/types/assessment"
import { useClinicalQuery } from "./useClinicalQuery"
export type { PhysicalAssessment } from "@/types/assessment"

export function useClientAssessments(clientId: string, options: { enabled?: boolean } = {}) {
  const { user } = useAuth()
  const createMutation = useCreateClientAssessment(clientId)
  const sub = user?.sub ?? "anonymous"
  const allowed = Boolean(user?.sub && ["PERSONAL", "NUTRITIONIST", "PHYSIO"].includes(user.role))
  const query = useClinicalQuery(queryKeys.assessments(sub, clientId), Boolean(allowed && clientId && options.enabled !== false), async signal => {
    const response = await api.get<PhysicalAssessment[]>(`/assessments/client/${clientId}`, { signal })
    return response.data ?? []
  })
  return {
    assessments: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createMutation,
  }
}

// A gravação não registra outro observador na query compartilhada do histórico.
export function useCreateClientAssessment(clientId: string) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"
  const allowed = Boolean(user?.sub && ["PERSONAL", "NUTRITIONIST", "PHYSIO"].includes(user.role))
  return useMutation({
    mutationFn: async (input: CreateAssessmentInput) => {
      if (!allowed || !clientId) throw new Error("Prontuário indisponível")
      const response = await api.post<PhysicalAssessment>("/assessments", { ...input, clientId })
      return response.data
    },
    onMutate: () => ({ sub, clientId }),
    onSuccess: async (_created, _input, context) => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: queryKeys.assessments(context.sub, context.clientId) }),
        cache.invalidateQueries({ queryKey: queryKeys.trainingOverview(context.sub, context.clientId) }),
        cache.invalidateQueries({ queryKey: queryKeys.patientOverview(context.sub, context.clientId) }),
      ])
    },
  })
}
