"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  CreatePhysioFunctionalScaleInput,
  PhysioFunctionalScaleRecord,
  PhysioScaleType,
} from "@/types/physio"
import { useClinicalQuery } from "./useClinicalQuery"

export function usePhysioScales(
  clientId?: string,
  options: { enabled?: boolean; scaleType?: PhysioScaleType } = {},
) {
  const { user } = useAuth()
  const enabled = Boolean(
    user?.sub &&
      user.role === "PHYSIO" &&
      clientId &&
      options.enabled !== false,
  )

  const query = useClinicalQuery(
    queryKeys.physioScales(user?.sub ?? "anonymous", clientId ?? "missing"),
    enabled,
    async (signal) => {
      const params = options.scaleType
        ? { scaleType: options.scaleType }
        : undefined
      const { data } = await api.get<PhysioFunctionalScaleRecord[]>(
        `/rehab-plans/scales/client/${clientId}`,
        { signal, params },
      )
      return data ?? []
    },
  )

  return {
    ...query,
    scales: query.data ?? [],
  }
}

export function useCreatePhysioScale() {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"
  const allowed = Boolean(user?.sub && user.role === "PHYSIO")

  return useMutation({
    mutationFn: async (input: CreatePhysioFunctionalScaleInput) => {
      if (!allowed) throw new Error("Acesso permitido somente a fisioterapeuta")
      const { data } = await api.post<PhysioFunctionalScaleRecord>(
        "/rehab-plans/scales",
        input,
      )
      return data
    },
    onMutate: () => ({ sub }),
    onSuccess: async (created, input, context) => {
      const targetClientId = created.clientId || input.clientId
      await Promise.all([
        cache.invalidateQueries({
          queryKey: queryKeys.physioScales(context.sub, targetClientId),
        }),
        cache.invalidateQueries({
          queryKey: queryKeys.physioOverview(context.sub, targetClientId),
        }),
      ])
    },
  })
}

export function useDeletePhysioScale(clientId: string) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"
  const allowed = Boolean(user?.sub && user.role === "PHYSIO")

  return useMutation({
    mutationFn: async (id: string) => {
      if (!allowed) throw new Error("Acesso permitido somente a fisioterapeuta")
      const { data } = await api.delete<{ id: string; clientId: string }>(
        `/rehab-plans/scales/${id}`,
      )
      return data
    },
    onMutate: () => ({ sub, clientId }),
    onSuccess: async (deleted, _id, context) => {
      const targetClientId = deleted.clientId || context.clientId
      await Promise.all([
        cache.invalidateQueries({
          queryKey: queryKeys.physioScales(context.sub, targetClientId),
        }),
        cache.invalidateQueries({
          queryKey: queryKeys.physioOverview(context.sub, targetClientId),
        }),
      ])
    },
  })
}
