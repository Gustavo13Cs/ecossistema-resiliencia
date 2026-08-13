import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { api } from "@/lib/api"
import type { AgendaDay } from "@/types/agenda"

const LOAD_ERROR = "Não foi possível carregar a agenda. Tente novamente."
const MUTATION_ERROR = "Não foi possível atualizar a tarefa. Tente novamente."

function localDayUtcRange(selectedDate: string) {
  const [year, month, day] = selectedDate.split("-").map(Number)

  if (!year || !month || !day) {
    throw new Error("Data selecionada inválida.")
  }

  return {
    from: new Date(year, month - 1, day, 0, 0, 0, 0).toISOString(),
    to: new Date(year, month - 1, day, 23, 59, 59, 999).toISOString(),
  }
}

function safeApiMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback

  const message = error.response?.data?.message
  if (typeof message !== "string" || message.length === 0 || message.length > 200) {
    return fallback
  }

  return message
}

export function useAgenda(patientId: string | undefined, selectedDate: string) {
  const [data, setData] = useState<AgendaDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const loadAgenda = useCallback(
    async (signal?: AbortSignal) => {
      if (!patientId) {
        setData(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { from, to } = localDayUtcRange(selectedDate)
        const response = await api.get<AgendaDay>(`/agenda/patient/${patientId}`, {
          params: { from, to },
          signal,
        })
        setData(response.data)
      } catch (requestError) {
        if (axios.isCancel(requestError)) return
        setData(null)
        setError(safeApiMessage(requestError, LOAD_ERROR))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [patientId, selectedDate],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadAgenda(controller.signal)
    return () => controller.abort()
  }, [loadAgenda])

  const refetch = useCallback(() => loadAgenda(), [loadAgenda])

  const mutate = useCallback(
    async (occurrenceId: string, operation: () => Promise<unknown>) => {
      setMutatingId(occurrenceId)
      try {
        await operation()
        await refetch()
      } catch (requestError) {
        throw new Error(safeApiMessage(requestError, MUTATION_ERROR))
      } finally {
        setMutatingId(null)
      }
    },
    [refetch],
  )

  const complete = useCallback(
    (occurrenceId: string, patientNote?: string) =>
      mutate(occurrenceId, () =>
        api.post(`/agenda/occurrences/${occurrenceId}/complete`, {
          ...(patientNote ? { patientNote } : {}),
        }),
      ),
    [mutate],
  )

  const skip = useCallback(
    (occurrenceId: string, reason: string) =>
      mutate(occurrenceId, () =>
        api.post(`/agenda/occurrences/${occurrenceId}/skip`, { reason }),
      ),
    [mutate],
  )

  return { data, loading, error, complete, skip, refetch, mutatingId }
}
