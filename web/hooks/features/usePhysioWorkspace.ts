"use client"

import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { PhysioWorkspace } from "@/types/physio"
import { useClinicalQuery } from "./useClinicalQuery"

export function usePhysioWorkspace() {
  const { user } = useAuth()
  const enabled = Boolean(user?.sub && user.role === "PHYSIO")

  return useClinicalQuery(
    queryKeys.physioWorkspace(user?.sub ?? "anonymous"),
    enabled,
    async (signal) => {
      const { data } = await api.get<PhysioWorkspace>("/rehab-plans/workspace", {
        signal,
      })
      return data
    },
  )
}
