"use client"

import axios from "axios"
import { useClients } from "@/hooks/features/useClients"
import type { Client } from "@/types/client"

export type ProfessionalDashboardStatus =
  | "loading"
  | "ready"
  | "empty"
  | "network-error"
  | "server-error"
  | "unauthorized"

const PRIVATE_UNAVAILABLE_STATUS_CODES = new Set([401, 403, 404])

function sortRecentClients(clients: readonly Client[]) {
  return clients
    .map((client, index) => ({
      client,
      index,
      timestamp: Date.parse(client.updatedAt),
    }))
    .sort((left, right) => {
      const leftIsValid = Number.isFinite(left.timestamp)
      const rightIsValid = Number.isFinite(right.timestamp)

      if (leftIsValid && rightIsValid) {
        return right.timestamp - left.timestamp || left.index - right.index
      }
      if (leftIsValid) return -1
      if (rightIsValid) return 1
      return left.index - right.index
    })
    .slice(0, 5)
    .map(({ client }) => client)
}

function classifyErrors(errors: readonly unknown[]): ProfessionalDashboardStatus | null {
  const axiosErrors = errors.filter(axios.isAxiosError)

  if (
    axiosErrors.some((error) =>
      PRIVATE_UNAVAILABLE_STATUS_CODES.has(error.response?.status ?? 0),
    )
  ) {
    return "unauthorized"
  }

  if (axiosErrors.some((error) => !error.response)) {
    return "network-error"
  }

  return errors.length > 0 ? "server-error" : null
}

export function useProfessionalDashboard() {
  const activeQuery = useClients("ACTIVE")
  const archivedQuery = useClients("ARCHIVED")
  const activeClients = activeQuery.data ?? []
  const archivedClients = archivedQuery.data ?? []
  const errors = [activeQuery.error, archivedQuery.error].filter(
    (error): error is NonNullable<typeof error> => error !== null,
  )

  let status: ProfessionalDashboardStatus
  if (activeQuery.isPending || archivedQuery.isPending) {
    status = "loading"
  } else {
    status = classifyErrors(errors)
      ?? (activeClients.length === 0 && archivedClients.length === 0 ? "empty" : "ready")
  }

  return {
    activeClients,
    archivedClients,
    recentClients: sortRecentClients(activeClients),
    status,
  }
}
