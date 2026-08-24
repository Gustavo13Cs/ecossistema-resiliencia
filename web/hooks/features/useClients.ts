"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { Client, ClientStatus } from "@/types/client"

export function useClients(status: ClientStatus) {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"

  return useQuery({
    queryKey: queryKeys.clients(sessionUserId, status),
    queryFn: async () => {
      const response = await api.get<Client[]>("/clients", { params: { status } })
      return response.data ?? []
    },
    enabled: Boolean(user?.sub),
  })
}
