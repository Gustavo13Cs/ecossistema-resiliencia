"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  CuratedRehabProtocol,
  PhysioExerciseCatalogItem,
  RehabPlan,
} from "./useFisio"

export function usePhysioProtocolCatalog(enabled: boolean) {
  const { user } = useAuth()
  const active = Boolean(enabled && user?.sub && user.role === "PHYSIO")
  return useQuery({
    queryKey: queryKeys.physioProtocolCatalog(user?.sub ?? "anonymous"),
    queryFn: async () => {
      const response = await api.get<CuratedRehabProtocol[]>(
        "/rehab-plans/protocol-catalog",
      )
      return response.data
    },
    enabled: active,
  })
}

export function usePhysioTemplates(enabled: boolean) {
  const { user } = useAuth()
  const active = Boolean(enabled && user?.sub && user.role === "PHYSIO")
  return useQuery({
    queryKey: queryKeys.physioTemplates(user?.sub ?? "anonymous"),
    queryFn: async () => {
      const response = await api.get<RehabPlan[]>("/rehab-plans/templates")
      return response.data
    },
    enabled: active,
  })
}

export function usePhysioExerciseCatalog(
  params: {
    q: string
    muscleGroup: string
    onlyWithIllustration: boolean
  },
  enabled: boolean,
) {
  const { user } = useAuth()
  const active = Boolean(enabled && user?.sub && user.role === "PHYSIO")
  return useQuery({
    queryKey: queryKeys.physioExerciseCatalog(
      user?.sub ?? "anonymous",
      params.q,
      params.muscleGroup,
      params.onlyWithIllustration,
    ),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.q.trim()) searchParams.set("q", params.q.trim())
      if (params.muscleGroup && params.muscleGroup !== "ALL") {
        searchParams.set("muscleGroup", params.muscleGroup)
      }
      if (params.onlyWithIllustration) {
        searchParams.set("onlyWithIllustration", "true")
      }
      const query = searchParams.toString()
      const response = await api.get<PhysioExerciseCatalogItem[]>(
        query ? `/rehab-plans/exercise-catalog?${query}` : "/rehab-plans/exercise-catalog",
      )
      return response.data
    },
    enabled: active,
  })
}
