"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  CreatePhysioPackageInput,
  PhysioSessionPackageRecord,
  UpdatePhysioPackageInput,
} from "@/types/physio"
import { useClinicalQuery } from "./useClinicalQuery"

export function usePhysioPackages(
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
    queryKeys.physioPackages(user?.sub ?? "anonymous", clientId ?? "missing"),
    enabled,
    async signal => {
      const { data } = await api.get<PhysioSessionPackageRecord[]>(
        `/rehab-plans/packages/client/${clientId}`,
        { signal },
      )
      return data ?? []
    },
  )

  return {
    ...query,
    packages: query.data ?? [],
  }
}

function invalidatePackageQueries(
  cache: ReturnType<typeof useQueryClient>,
  sub: string,
  clientId: string,
) {
  return Promise.all([
    cache.invalidateQueries({ queryKey: queryKeys.physioPackages(sub, clientId) }),
    cache.invalidateQueries({ queryKey: queryKeys.physioOverview(sub, clientId) }),
    cache.invalidateQueries({ queryKey: queryKeys.physioWorkspace(sub) }),
    cache.invalidateQueries({ queryKey: queryKeys.physioReportsRoot(sub) }),
  ])
}

export function useCreatePhysioPackage() {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"

  return useMutation({
    mutationFn: async (input: CreatePhysioPackageInput) => {
      if (!user?.sub || user.role !== "PHYSIO") {
        throw new Error("Restabeleça seu acesso")
      }
      const { data } = await api.post<PhysioSessionPackageRecord>(
        "/rehab-plans/packages",
        input,
      )
      return data
    },
    onSuccess: (_data, variables) =>
      invalidatePackageQueries(cache, sub, variables.clientId),
  })
}

export function useUpdatePhysioPackage(clientId: string) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: UpdatePhysioPackageInput
    }) => {
      if (!user?.sub || user.role !== "PHYSIO") {
        throw new Error("Restabeleça seu acesso")
      }
      const { data } = await api.patch<PhysioSessionPackageRecord>(
        `/rehab-plans/packages/${id}`,
        input,
      )
      return data
    },
    onSuccess: () => invalidatePackageQueries(cache, sub, clientId),
  })
}

export function useDeletePhysioPackage(clientId: string) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.sub || user.role !== "PHYSIO") {
        throw new Error("Restabeleça seu acesso")
      }
      const { data } = await api.delete<{ id: string; clientId: string }>(
        `/rehab-plans/packages/${id}`,
      )
      return data
    },
    onSuccess: () => invalidatePackageQueries(cache, sub, clientId),
  })
}
