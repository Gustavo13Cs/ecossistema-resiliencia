"use client"

import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { PhysioAssessmentRecord } from "@/types/physio"
import { useClinicalQuery } from "./useClinicalQuery"

export function usePhysioAssessments(
  clientId?: string,
  options: { enabled?: boolean } = {},
) {
  const { user } = useAuth()
  const enabled = Boolean(
    user?.sub &&
      user.role === "PHYSIO" &&
      clientId &&
      options.enabled !== false,
  )

  const query = useClinicalQuery(
    queryKeys.physioAssessments(user?.sub ?? "anonymous", clientId ?? "missing"),
    enabled,
    async (signal) => {
      const { data } = await api.get<PhysioAssessmentRecord[]>(
        `/physio-assessments/client/${clientId}`,
        { signal },
      )
      return data ?? []
    },
  )

  return {
    ...query,
    assessments: query.data ?? [],
  }
}
