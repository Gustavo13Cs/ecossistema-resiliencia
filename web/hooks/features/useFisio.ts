"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
export interface RehabExercise {
  id: string
  name: string
  sets?: string | null
  reps?: string | null
  notes?: string | null
}

export interface RehabSession {
  id: string
  name: string
  focus?: string | null
  exercises: RehabExercise[]
}

export interface RehabPlan {
  id: string
  title: string
  durationWeeks?: number | null
  goal?: string | null
  notes?: string | null
  sessions: RehabSession[]
}

export function useFisio(clientId?: string) {
  const { user } = useAuth()
  const enabled = Boolean(user?.sub && clientId)
  const query = useQuery({
    queryKey: queryKeys.rehabPlan(user?.sub ?? "anonymous", clientId ?? "unselected"),
    queryFn: async () => {
      const response = await api.get<RehabPlan | null>(`/rehab-plans/client/${clientId}/active`)
      return response.data
    },
    enabled,
  })

  return {
    rehabPlan: enabled ? query.data ?? null : null,
    loading: enabled && query.isPending,
    error: enabled && query.isError ? "Falha ao carregar o protocolo de reabilitação. Tente novamente." : null,
  }
}
