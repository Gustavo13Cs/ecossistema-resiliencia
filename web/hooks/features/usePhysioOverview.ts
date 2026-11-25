"use client"

import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { PhysioClientOverview } from "@/types/physio"
import { useClinicalQuery } from "./useClinicalQuery"

export function usePhysioOverview(
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

  return useClinicalQuery(
    queryKeys.physioOverview(user?.sub ?? "anonymous", clientId ?? "missing"),
    enabled,
    async (signal) => {
      const { data } = await api.get<PhysioClientOverview>(
        `/rehab-plans/client/${clientId}/overview`,
        { signal },
      )
      if (data.client.id !== clientId) {
        throw new Error("Prontuário incompatível com a consulta")
      }
      return data
    },
  )
}
