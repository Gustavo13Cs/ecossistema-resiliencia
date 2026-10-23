"use client"

import { useLayoutEffect, useRef } from "react"
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { WorkoutDraftResource } from "@/types/workout-draft"
import type { SaveWorkoutTemplateInput, WorkoutTemplateDetail, WorkoutTemplateFilters, WorkoutTemplatePage, WorkoutTemplateSummary } from "@/types/workout-template"
import { useClinicalQuery } from "./useClinicalQuery"

type Options = { clientId?: string; workoutId?: string; templateId?: string; cursor?: string; filters?: WorkoutTemplateFilters; enabled?: boolean }
export function useWorkoutTemplates(options: Options = {}) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const owner = user?.sub ?? "anonymous"
  const role = user?.role
  const { clientId, workoutId, templateId, cursor, filters = {} } = options
  const root = ["workout-templates", owner] as const
  const accessKey = [...root, "access"]
  const access = useQuery({ queryKey: accessKey, queryFn: skipToken, initialData: false, staleTime: Infinity, gcTime: Infinity }).data
  const enabled = Boolean(user?.sub && role === "PERSONAL" && options.enabled !== false && !access)
  // O cancelamento encerra também retries do cliente HTTP; a guarda pós-await
  // impede que uma operação já concluída adote outra conta ou prontuário.
  const session = useRef({ owner, role, clientId, workoutId, active: true, controller: new AbortController() })
  useLayoutEffect(() => {
    session.current = { owner, role, clientId, workoutId, active: true, controller: new AbortController() }
    return () => { session.current.active = false; session.current.controller.abort() }
  }, [owner, role, clientId, workoutId])
  const sameScope = () => Boolean(user?.sub) && session.current.active && session.current.owner === owner && session.current.role === "PERSONAL" && session.current.clientId === clientId && session.current.workoutId === workoutId
  function assertCurrent() {
    if (!sameScope() || cache.getQueryData(accessKey)) throw new Error("A sessão dos modelos mudou")
  }
  async function deny(error: unknown) {
    if (!isAxiosError(error) || ![401, 403].includes(error.response?.status ?? 0)) return
    cache.setQueryData(accessKey, true)
    await cache.cancelQueries({ queryKey: root })
    cache.setQueriesData({ queryKey: root, predicate: query => query.queryKey[2] !== "access" }, null)
    if (sameScope()) { session.current.controller.abort(); importMutation.reset(); saveMutation.reset() }
  }
  async function read<T>(signal: AbortSignal, load: () => Promise<T>) {
    try {
      if (signal.aborted || cache.getQueryData(accessKey)) throw new Error("Modelos indisponíveis")
      const result = await load()
      if (signal.aborted || cache.getQueryData(accessKey)) throw new Error("Modelos indisponíveis")
      return result
    } catch (error) { await deny(error); throw error }
  }
  const listQuery = useClinicalQuery([...root, "list", filters, cursor ?? "first"], enabled && !templateId, signal => read(signal, async () => {
    const { data } = await api.get<WorkoutTemplatePage>("/workouts/templates", { params: { ...filters, cursor, limit: 20 }, signal })
    return data
  }))
  const detailQuery = useClinicalQuery([...root, "detail", templateId ?? "missing"], enabled && Boolean(templateId), signal => read(signal, async () => {
    const { data } = await api.get<WorkoutTemplateDetail>(`/workouts/templates/${templateId}`, { signal })
    if (data.id !== templateId) throw new Error("Modelo incompatível com a consulta")
    return data
  }))
  const mutationKey = [...root, "mutation", role, clientId, workoutId, access]
  function verifyDraft(data: WorkoutDraftResource, id?: string) {
    assertCurrent()
    if (!data.id || data.clientId !== clientId || data.status !== "OPEN" || (id && data.id !== id)) throw new Error("Rascunho incompatível com o prontuário")
    return data
  }
  const importMutation = useMutation({
    mutationKey: [...mutationKey, "import"], gcTime: 0,
    mutationFn: async (id: string): Promise<WorkoutDraftResource & { recoveredExisting?: boolean }> => {
      assertCurrent()
      if (!clientId || !id) throw new Error("Prontuário indisponível")
      const signal = session.current.controller.signal
      try {
        const { data } = await api.post<WorkoutDraftResource>(`/workouts/templates/${id}/create-draft`, { clientId }, { signal })
        return verifyDraft(data)
      } catch (error) {
        assertCurrent()
        await deny(error)
        if (isAxiosError<{ code?: string; id?: string; clientId?: string }>(error) && error.response?.status === 409) {
          const conflict = error.response.data
          if (conflict.code === "DRAFT_EXISTS" && conflict.clientId === clientId && conflict.id) {
            assertCurrent()
            try {
              const { data } = await api.get<WorkoutDraftResource>(`/workouts/drafts/${conflict.id}`, { signal })
              return { ...verifyDraft(data, conflict.id), recoveredExisting: true }
            } catch (verificationError) { await deny(verificationError); throw verificationError }
          }
        }
        throw error
      }
    },
    // A lista não pode desmontar o seletor antes de apresentar a recuperação OPEN.
    onSuccess: () => { void cache.invalidateQueries({ queryKey: queryKeys.workoutDraftsRoot(owner), refetchType: "none" }) },
  })
  const saveMutation = useMutation({
    mutationKey: [...mutationKey, "save"], gcTime: 0,
    mutationFn: async (input: SaveWorkoutTemplateInput) => {
      assertCurrent()
      if (!clientId || !workoutId) throw new Error("Ficha indisponível")
      try {
        const { data } = await api.post<{ clientId: string; template: WorkoutTemplateSummary }>(`/workouts/templates/from-workout/${workoutId}`, input, { signal: session.current.controller.signal })
        assertCurrent()
        if (data.clientId !== clientId || !data.template.id || data.template.isGlobal) throw new Error("Modelo incompatível com o prontuário")
        return data
      } catch (error) { await deny(error); throw error }
    },
    onSuccess: () => { void cache.invalidateQueries({ queryKey: root }) },
  })
  return { listQuery, detailQuery, importMutation, saveMutation, accessDenied: access }
}
