import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { Client } from "@/types/client"

export type ClientRecordStatus =
  | "loading"
  | "ready"
  | "not-found"
  | "unauthorized"
  | "network-error"
  | "server-error"

function classifyClientRecordError(error: unknown): Exclude<ClientRecordStatus, "loading" | "ready"> {
  if (!axios.isAxiosError(error)) return "server-error"
  if (error.response?.status === 404) return "not-found"
  if (error.response?.status === 401 || error.response?.status === 403) return "unauthorized"
  if (!error.response) return "network-error"
  return "server-error"
}

export function useClientRecord(clientId?: string) {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"
  const enabled = Boolean(user?.sub && clientId)

  const query = useQuery({
    queryKey: queryKeys.client(sessionUserId, clientId ?? "missing"),
    queryFn: async () => {
      const response = await api.get<Client>(`/clients/${clientId}`)
      return response.data
    },
    enabled,
  })

  let status: ClientRecordStatus
  if (!user?.sub) status = "unauthorized"
  else if (!clientId) status = "not-found"
  else if (query.isPending) status = "loading"
  else if (query.error) status = classifyClientRecordError(query.error)
  else status = "ready"

  return {
    client: query.data ?? null,
    status,
    error: query.error,
    refetch: query.refetch,
  }
}
