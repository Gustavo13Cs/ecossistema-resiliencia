import axios from "axios"
import { QueryClient } from "@tanstack/react-query"

export const QUERY_STALE_TIME = 60_000
export const QUERY_GC_TIME = 5 * 60_000
const DEFAULT_RETRY_DELAY = 1_000
const MAX_RETRY_DELAY = 5_000

export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= 1 || !axios.isAxiosError(error)) return false
  if (!error.response) return true

  const status = error.response.status
  return status === 408 || status === 429 || status >= 500
}

export function queryRetryDelay(_attemptIndex: number, error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) {
    return DEFAULT_RETRY_DELAY
  }

  const retryAfter = error.response.headers["retry-after"]
  if (typeof retryAfter !== "string") return DEFAULT_RETRY_DELAY

  const seconds = Number(retryAfter)
  const delay = Number.isFinite(seconds)
    ? seconds * 1_000
    : Date.parse(retryAfter) - Date.now()

  if (!Number.isFinite(delay)) return DEFAULT_RETRY_DELAY
  return Math.max(0, Math.min(delay, MAX_RETRY_DELAY))
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME,
        gcTime: QUERY_GC_TIME,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        retryDelay: queryRetryDelay,
      },
      mutations: { retry: false },
    },
  })
}
