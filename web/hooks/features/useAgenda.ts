import { useCallback, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { AgendaDay } from "@/types/agenda"

const LOAD_ERROR = "Não foi possível carregar a agenda. Tente novamente."
const MUTATION_ERROR = "Não foi possível atualizar a tarefa. Tente novamente."

function localDayUtcRange(selectedDate: string) {
  const [year, month, day] = selectedDate.split("-").map(Number)
  if (!year || !month || !day) throw new Error("Data selecionada inválida.")
  return { from: new Date(year, month - 1, day, 0, 0, 0, 0).toISOString(), to: new Date(year, month - 1, day, 23, 59, 59, 999).toISOString() }
}

function safeApiMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback
  const message = error.response?.data?.message
  return typeof message === "string" && message.length > 0 && message.length <= 200 ? message : fallback
}

export function useAgenda(patientId: string | undefined, selectedDate: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const range = useMemo(() => localDayUtcRange(selectedDate), [selectedDate])
  const key = queryKeys.agenda(user?.sub ?? "anonymous", patientId ?? "missing", range.from, range.to)
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => (await api.get<AgendaDay>(`/agenda/patient/${patientId}`, { params: range, signal })).data,
    enabled: Boolean(user?.sub && patientId),
  })

  const refetch = useCallback(async () => { await query.refetch() }, [query])
  const mutate = useCallback(async (occurrenceId: string, operation: () => Promise<unknown>) => {
    setMutatingId(occurrenceId)
    try {
      try { await operation() } catch (error) { throw new Error(safeApiMessage(error, MUTATION_ERROR)) }
      await queryClient.invalidateQueries({ queryKey: key })
    } finally { setMutatingId(null) }
  }, [key, queryClient])

  const complete = useCallback((occurrenceId: string, patientNote?: string) => mutate(occurrenceId, () => api.post(`/agenda/occurrences/${occurrenceId}/complete`, { ...(patientNote ? { patientNote } : {}) })), [mutate])
  const skip = useCallback((occurrenceId: string, reason: string) => mutate(occurrenceId, () => api.post(`/agenda/occurrences/${occurrenceId}/skip`, { reason })), [mutate])

  return { data: query.data ?? null, loading: query.isPending, error: query.error ? safeApiMessage(query.error, LOAD_ERROR) : null, complete, skip, refetch, mutatingId }
}
