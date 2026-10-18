"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AxiosError, AxiosHeaders, isAxiosError } from "axios"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { DraftAck, DraftCreateInput, DraftPage, DraftRebaseInput, DraftSaveInput, DraftVersionInput, FinalizedDraftResult, WorkoutDraftResource } from "@/types/workout-draft"
import { useClinicalQuery } from "./useClinicalQuery"

type DraftAccessState = { generation: number; deniedStatus: 401 | 403 | null }
const initialAccess: DraftAccessState = { generation: 0, deniedStatus: null }

function accessDeniedError(status: 401 | 403) {
  return new AxiosError("Restabeleça seu acesso aos rascunhos", AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
    status, statusText: status === 401 ? "Unauthorized" : "Forbidden", data: null,
    headers: {}, config: { headers: new AxiosHeaders() },
  })
}

export function useWorkoutDrafts(options: { clientId?: string; draftId?: string; cursor?: string; enabled?: boolean } = {}) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const owner = user?.sub ?? "anonymous"
  const { clientId, draftId, cursor } = options
  const isPersonal = Boolean(user?.sub && user.role === "PERSONAL")
  const role = user?.role
  const accessKey = [...queryKeys.workoutDraftsRoot(owner), "access"] as const
  // Metadados sem payload clínico, compartilhados apenas pelo QueryClient e pela conta.
  // O clear do ciclo autenticado existente encerra também este contexto negado.
  const accessQuery = useQuery({
    queryKey: accessKey, queryFn: skipToken, initialData: initialAccess,
    enabled: false, staleTime: Infinity, gcTime: Infinity,
  })
  const access = accessQuery.data ?? initialAccess
  const enabled = isPersonal && options.enabled !== false && access.deniedStatus === null
  const deniedError = useMemo(() => access.deniedStatus ? accessDeniedError(access.deniedStatus) : null, [access.deniedStatus])
  const session = useRef<{ owner: string; role: string | undefined; clientId?: string; draftId?: string; active: boolean; createdDraftId?: string }>({ owner, role, clientId, draftId, active: true })
  useLayoutEffect(() => {
    session.current = { owner, role, clientId, draftId, active: true }
    return () => { session.current.active = false }
  }, [owner, role, clientId, draftId])
  const sameScope = () => session.current.active && session.current.owner === owner && session.current.role === "PERSONAL" && session.current.clientId === clientId && session.current.draftId === draftId
  function currentAccess() { return cache.getQueryData<DraftAccessState>(accessKey) ?? initialAccess }
  const sameContext = () => sameScope() && currentAccess().deniedStatus === null && currentAccess().generation === access.generation

  async function denyOwner(status: 401 | 403) {
    const previous = currentAccess()
    cache.setQueryData<DraftAccessState>(accessKey, { generation: previous.generation + 1, deniedStatus: status })
    // Invalida leituras antes de qualquer await; cancela antes de remover payloads.
    await cache.cancelQueries({ queryKey: queryKeys.workoutDraftsRoot(owner) })
    cache.setQueriesData({ queryKey: queryKeys.workoutDraftsRoot(owner), predicate: query => query.queryKey[2] !== "access" }, null)
    if (sameScope()) {
      session.current.createdDraftId = undefined
      session.current.active = false
      resetMutations()
    }
  }
  async function read<T>(signal: AbortSignal, load: () => Promise<T>): Promise<T> {
    const generation = access.generation
    const assertAvailable = () => {
      const live = currentAccess()
      // A query pode continuar em outro observador após a saída do iniciador.
      if (!isPersonal || signal.aborted || live.deniedStatus !== null || live.generation !== generation) throw new Error("Consulta clínica indisponível")
    }
    assertAvailable()
    try {
      const data = await load()
      assertAvailable()
      return data
    } catch (error) {
      if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) await denyOwner(error.response.status)
      throw error
    }
  }
  const listQuery = useClinicalQuery(
    queryKeys.workoutDrafts(owner, clientId, cursor), enabled && !draftId,
    signal => read(signal, async () => {
      const { data } = await api.get<DraftPage>("/workouts/drafts", { params: { clientId, cursor, limit: 20 }, signal })
      if (data.items.some(item => item.client.id !== item.clientId || (clientId && item.clientId !== clientId))) {
        throw new Error("Rascunho incompatível com o prontuário solicitado")
      }
      return data
    }),
  )
  const detailKey = queryKeys.workoutDraft(owner, clientId ?? "missing", draftId ?? "missing")
  const detailQuery = useClinicalQuery(detailKey, Boolean(enabled && clientId && draftId), signal => read(signal, async () => {
    const { data } = await api.get<WorkoutDraftResource>(`/workouts/drafts/${draftId}`, { signal })
    if (data.id !== draftId || data.clientId !== clientId) throw new Error("Rascunho incompatível com o prontuário solicitado")
    return data
  }))

  async function write<T extends DraftAck>(operation: "create" | "save" | "rebase" | "finalize" | "discard", input: DraftCreateInput | DraftSaveInput | DraftRebaseInput | DraftVersionInput): Promise<T> {
    if (!isPersonal || !clientId || !sameContext()) {
      throw new Error("Contexto de rascunho indisponível")
    }
    const targetId = draftId ?? session.current.createdDraftId
    if (operation !== "create" && !targetId) throw new Error("Contexto de rascunho indisponível")
    const url = operation === "create" ? "/workouts/drafts" : `/workouts/drafts/${targetId}${operation === "save" ? "" : `/${operation}`}`
    try {
      const { data } = operation === "save"
        ? await api.put<T>(url, input)
        : await api.post<T>(url, operation === "create" ? { ...input, clientId } : input)
      if (!sameContext()) throw new Error("A sessão do rascunho mudou")
      if (data.clientId !== clientId || (operation !== "create" && data.id !== targetId)) throw new Error("Rascunho incompatível com o prontuário solicitado")
      if (operation === "create") session.current.createdDraftId = data.id
      return data
    } catch (error) {
      if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) await denyOwner(error.response.status)
      throw error
    }
  }
  async function invalidate(requestOwner: string, result: DraftAck, finalizedWorkoutId?: string) {
    const keys: readonly (readonly string[])[] = [
      queryKeys.workoutDraftsRoot(requestOwner), queryKeys.client(requestOwner, result.clientId),
      queryKeys.trainingOverview(requestOwner, result.clientId), queryKeys.patientOverview(requestOwner, result.clientId),
      ...(finalizedWorkoutId ? [
        queryKeys.trainingWorkspace(requestOwner), queryKeys.workouts(requestOwner),
        queryKeys.activeWorkout(requestOwner, result.clientId), queryKeys.workout(requestOwner, result.clientId, finalizedWorkoutId),
      ] : []),
    ]
    await Promise.all(keys.map(queryKey => cache.invalidateQueries({ queryKey })))
  }
  // TanStack descarta o resultado/variáveis observáveis ao trocar mutationKey.
  // O owner da invalidação é capturado no início, nunca inferido após o await.
  const mutationKey = [...queryKeys.workoutDraftsRoot(owner), "mutation", role, clientId, draftId, access.generation, access.deniedStatus]
  const createMutation = useMutation({
    mutationKey: [...mutationKey, "create"], gcTime: 0,
    mutationFn: (input: DraftCreateInput) => write<WorkoutDraftResource>("create", input),
    onMutate: () => ({ owner }),
    onSuccess: (result, _input, context) => invalidate(context.owner, result),
  })
  const saveMutation = useMutation({
    mutationKey: [...mutationKey, "save"], gcTime: 0,
    mutationFn: (input: DraftSaveInput) => write<WorkoutDraftResource>("save", input),
    onMutate: () => ({ owner }),
    onSuccess: (result, _input, context) => invalidate(context.owner, result),
  })
  const rebaseMutation = useMutation({
    mutationKey: [...mutationKey, "rebase"], gcTime: 0,
    mutationFn: (input: DraftRebaseInput) => write<WorkoutDraftResource>("rebase", input),
    onMutate: () => ({ owner }),
    onSuccess: (result, _input, context) => invalidate(context.owner, result),
  })
  const finalizeMutation = useMutation({
    mutationKey: [...mutationKey, "finalize"], gcTime: 0,
    mutationFn: async (input: DraftVersionInput) => {
      const result = await write<FinalizedDraftResult>("finalize", input)
      if (result.workout.id !== result.finalizedWorkoutId || result.workout.clientId !== clientId) throw new Error("Prescrição incompatível com o prontuário solicitado")
      return result
    },
    onMutate: () => ({ owner }),
    onSuccess: (result, _input, context) => invalidate(context.owner, result, result.finalizedWorkoutId),
  })
  const discardMutation = useMutation({
    mutationKey: [...mutationKey, "discard"], gcTime: 0,
    mutationFn: (input: DraftVersionInput) => write<DraftAck>("discard", input),
    onMutate: () => ({ owner }),
    onSuccess: (result, _input, context) => invalidate(context.owner, result),
  })
  function resetMutations() {
    createMutation.reset(); saveMutation.reset(); rebaseMutation.reset(); finalizeMutation.reset(); discardMutation.reset()
  }
  const deniedState = deniedError ? {
    data: undefined, error: deniedError, status: "error" as const,
    isError: true as const, isSuccess: false as const, isPending: false as const, isLoading: false as const,
  } : {}
  return {
    listQuery: { ...listQuery, ...deniedState }, detailQuery: { ...detailQuery, ...deniedState },
    createMutation, saveMutation, rebaseMutation, finalizeMutation, discardMutation,
  }
}
