"use client"

import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { TrainingClientOverview } from "@/types/training"
import { useClinicalQuery } from "./useClinicalQuery"

export function useTrainingOverview(clientId?: string, options: { enabled?: boolean } = {}) {
  const { user } = useAuth()
  const enabled = Boolean(user?.sub && user.role === "PERSONAL" && clientId && options.enabled !== false)

  return useClinicalQuery(
    queryKeys.trainingOverview(user?.sub ?? "anonymous", clientId ?? "missing"),
    enabled,
    async signal => {
      const { data } = await api.get<TrainingClientOverview>(`/workouts/client/${clientId}/overview`, { signal })
      if (data.client.id !== clientId) throw new Error("Prontuário incompatível com a consulta")
      return data
    },
  )
}
