"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  WebVitalDeviceCategory,
  WebVitalsSnapshot,
} from "@/types/observability"

export interface UseWebVitalsDashboardOptions {
  route?: string | null
  device?: WebVitalDeviceCategory | null
  top?: number
}

export function useWebVitalsDashboard({
  route = null,
  device = null,
  top = 25,
}: UseWebVitalsDashboardOptions = {}) {
  const { user } = useAuth()
  const sessionUserId = user?.role === "ADMIN" ? user.sub : undefined

  return useQuery<WebVitalsSnapshot>({
    queryKey: sessionUserId
      ? queryKeys.webVitals(sessionUserId, route, device)
      : ["observability-web-vitals", "anonymous"],
    enabled: Boolean(sessionUserId),
    retry: false,
    staleTime: 15_000,
    queryFn: async () => {
      const params: Record<string, string | number> = { top }
      if (route) params.route = route
      if (device) params.device = device
      const { data } = await api.get<WebVitalsSnapshot>(
        "/observability/web-vitals",
        { params },
      )
      return data
    },
  })
}
