"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  CreatePhysioDischargeInput,
  PhysioDischargeRecord,
  PhysioManagementReport,
  PhysioReportPeriod,
} from "@/types/physio"
import { useClinicalQuery } from "./useClinicalQuery"

export function usePhysioDischarges(
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
    queryKeys.physioDischarges(user?.sub ?? "anonymous", clientId ?? "missing"),
    enabled,
    async signal => {
      const { data } = await api.get<PhysioDischargeRecord[]>(
        `/rehab-plans/discharges/client/${clientId}`,
        { signal },
      )
      return data ?? []
    },
  )

  return {
    ...query,
    discharges: query.data ?? [],
  }
}

export function usePhysioManagementReport(period: PhysioReportPeriod) {
  const { user } = useAuth()
  const enabled = Boolean(user?.sub && user.role === "PHYSIO")

  return useClinicalQuery(
    queryKeys.physioReports(user?.sub ?? "anonymous", period),
    enabled,
    async signal => {
      const { data } = await api.get<PhysioManagementReport>(
        `/rehab-plans/discharges/reports?period=${period}`,
        { signal },
      )
      return data
    },
  )
}

function invalidateDischargeQueries(
  cache: ReturnType<typeof useQueryClient>,
  sub: string,
  clientId: string,
) {
  return Promise.all([
    cache.invalidateQueries({ queryKey: queryKeys.physioDischarges(sub, clientId) }),
    cache.invalidateQueries({ queryKey: queryKeys.physioPackages(sub, clientId) }),
    cache.invalidateQueries({ queryKey: queryKeys.physioOverview(sub, clientId) }),
    cache.invalidateQueries({ queryKey: queryKeys.rehabPlan(sub, clientId) }),
    cache.invalidateQueries({ queryKey: queryKeys.physioWorkspace(sub) }),
    cache.invalidateQueries({ queryKey: queryKeys.physioReportsRoot(sub) }),
  ])
}

export function useCreatePhysioDischarge() {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"

  return useMutation({
    mutationFn: async (input: CreatePhysioDischargeInput) => {
      if (!user?.sub || user.role !== "PHYSIO") {
        throw new Error("Restabeleça seu acesso")
      }
      const { data } = await api.post<PhysioDischargeRecord>(
        "/rehab-plans/discharges",
        input,
      )
      return data
    },
    onSuccess: (_data, variables) =>
      invalidateDischargeQueries(cache, sub, variables.clientId),
  })
}

export function useDeletePhysioDischarge(clientId: string) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.sub || user.role !== "PHYSIO") {
        throw new Error("Restabeleça seu acesso")
      }
      const { data } = await api.delete<{ id: string; clientId: string }>(
        `/rehab-plans/discharges/${id}`,
      )
      return data
    },
    onSuccess: () => invalidateDischargeQueries(cache, sub, clientId),
  })
}
