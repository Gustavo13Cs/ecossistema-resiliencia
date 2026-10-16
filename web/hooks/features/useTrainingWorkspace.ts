"use client"

import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { TrainingWorkspace } from "@/types/training"
import { useClinicalQuery } from "./useClinicalQuery"

export function useTrainingWorkspace() {
  const { user } = useAuth()
  const enabled = Boolean(user?.sub && user.role === "PERSONAL")

  return useClinicalQuery(
    queryKeys.trainingWorkspace(user?.sub ?? "anonymous"),
    enabled,
    async signal => {
      const { data } = await api.get<TrainingWorkspace>("/workouts/workspace", { signal })
      return data
    },
  )
}
