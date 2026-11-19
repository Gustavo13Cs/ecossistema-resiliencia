"use client"

import { collectPages, getArrayPage, legacyPage } from "@/lib/pagination"
import { useListPage, useClampPage } from "./useListPage"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { queryKeys } from "@/lib/query-keys"
import type { Client, ClientStatus } from "@/types/client"

export function useClients(
  status: ClientStatus,
  options: { enabled?: boolean } = {},
) {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"

  return useQuery({
    queryKey: queryKeys.clients(sessionUserId, status),
    queryFn: ({ signal }) => collectPages<Client>(page => getArrayPage<Client>("/clients", { status, page, pageSize: 100 }, { status }, signal)),
    enabled: Boolean(user?.sub && options.enabled !== false),
  })
}

export function useClientsPage(status: ClientStatus, search: string) {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"
  const q = search.trim()
  const { page, setPage } = useListPage(JSON.stringify([sessionUserId, status, q]))
  const query = useQuery({
    queryKey: [...queryKeys.clients(sessionUserId, status), "page", q, page],
    enabled: Boolean(user?.sub),
    queryFn: async ({ signal }) => {
      const result = await getArrayPage<Client>("/clients", { status, q: q || undefined, page, pageSize: 25 }, { status }, signal)
      if (!result.legacyItems) return result
      const filtered = result.legacyItems.filter(client => [client.name, client.email, client.phone, client.goal].some(value => (value ?? "").toLocaleLowerCase("pt-BR").includes(q.toLocaleLowerCase("pt-BR"))))
      return legacyPage(filtered, { page, pageSize: 25 })
    },
  })
  useClampPage(page, setPage, query.data?.pagination)
  return { ...query, page, setPage }
}
