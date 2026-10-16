"use client"
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { isAxiosError } from "axios"

// A negação apaga o payload em memória sem remover a query observada ou seu erro.
export function useClinicalQuery<T>(key: QueryKey, enabled: boolean, read: (signal: AbortSignal) => Promise<T>) {
  const cache = useQueryClient()
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      if (!enabled) throw new Error("Consulta clínica indisponível")
      try {
        return await read(signal)
      } catch (error) {
        if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
          cache.setQueryData(key, null)
        }
        throw error
      }
    },
    enabled,
    retry: false,
  })
  return { ...query, data: enabled && !query.error ? query.data : undefined }
}
