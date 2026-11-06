"use client"

import { useLayoutEffect, useRef } from "react"
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { WorkoutDraftResource } from "@/types/workout-draft"
import type {
  CreateStandaloneWorkoutTemplateInput,
  SaveWorkoutTemplateInput,
  UpdateWorkoutTemplateInput,
  WorkoutTemplateDetail,
  WorkoutTemplateFilters,
  WorkoutTemplatePage,
  WorkoutTemplateSummary,
} from "@/types/workout-template"
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

// Hook exclusivo de mutações e leitura sob demanda para a Central de Modelos (/modelos-treinos),
// sem registrar observadores desabilitados sobre queries ativas.
export function useWorkoutTemplateHubMutations() {
  const { user } = useAuth()
  const cache = useQueryClient()
  const owner = user?.sub ?? "anonymous"
  const role = user?.role
  const root = ["workout-templates", owner] as const
  const accessKey = [...root, "access"] as const

  const access = useQuery({
    queryKey: accessKey,
    queryFn: skipToken,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  }).data

  const session = useRef({
    owner,
    role,
    active: true,
    controller: new AbortController(),
  })

  useLayoutEffect(() => {
    session.current = {
      owner,
      role,
      active: true,
      controller: new AbortController(),
    }
    return () => {
      session.current.active = false
      session.current.controller.abort()
    }
  }, [owner, role])

  const sameScope = () =>
    Boolean(user?.sub) &&
    session.current.active &&
    session.current.owner === owner &&
    session.current.role === "PERSONAL"

  function assertCurrent() {
    if (!sameScope() || cache.getQueryData(accessKey)) {
      throw new Error("A sessão dos modelos mudou")
    }
  }

  async function deny(error: unknown) {
    if (!isAxiosError(error) || ![401, 403].includes(error.response?.status ?? 0)) return
    cache.setQueryData(accessKey, true)
    await cache.cancelQueries({ queryKey: root })
    cache.setQueriesData({ queryKey: root, predicate: query => query.queryKey[2] !== "access" }, null)
    if (sameScope()) {
      session.current.controller.abort()
    }
  }

  async function loadTemplateDetail(templateId: string): Promise<WorkoutTemplateDetail> {
    assertCurrent()
    try {
      const { data } = await api.get<WorkoutTemplateDetail>(
        `/workouts/templates/${templateId}`,
        { signal: session.current.controller.signal },
      )
      assertCurrent()
      if (data.id !== templateId) {
        throw new Error("Modelo incompatível com a consulta")
      }
      return data
    } catch (error) {
      await deny(error)
      throw error
    }
  }

  const createStandaloneMutation = useMutation({
    mutationKey: [...root, "hub", "create"],
    gcTime: 0,
    mutationFn: async (input: CreateStandaloneWorkoutTemplateInput) => {
      assertCurrent()
      try {
        const { data } = await api.post<WorkoutTemplateDetail>(
          "/workouts/templates",
          input,
          { signal: session.current.controller.signal },
        )
        assertCurrent()
        if (!data.id || data.isGlobal) {
          throw new Error("Modelo criado incompatível")
        }
        return data
      } catch (error) {
        await deny(error)
        throw error
      }
    },
    onMutate: () => ({ owner }),
    onSuccess: async (_created, _input, context) => {
      await cache.invalidateQueries({ queryKey: ["workout-templates", context.owner] })
    },
  })

  const updateTemplateMutation = useMutation({
    mutationKey: [...root, "hub", "update"],
    gcTime: 0,
    mutationFn: async ({
      templateId,
      input,
    }: {
      templateId: string
      input: UpdateWorkoutTemplateInput
    }) => {
      assertCurrent()
      try {
        const { data } = await api.patch<WorkoutTemplateDetail>(
          `/workouts/templates/${templateId}`,
          input,
          { signal: session.current.controller.signal },
        )
        assertCurrent()
        if (data.id !== templateId || data.isGlobal) {
          throw new Error("Modelo atualizado incompatível")
        }
        return data
      } catch (error) {
        await deny(error)
        throw error
      }
    },
    onMutate: () => ({ owner }),
    onSuccess: async (_updated, _vars, context) => {
      await cache.invalidateQueries({ queryKey: ["workout-templates", context.owner] })
    },
  })

  const duplicateTemplateMutation = useMutation({
    mutationKey: [...root, "hub", "duplicate"],
    gcTime: 0,
    mutationFn: async ({
      templateId,
      title,
    }: {
      templateId: string
      title?: string
    }) => {
      assertCurrent()
      try {
        const { data } = await api.post<WorkoutTemplateDetail>(
          `/workouts/templates/${templateId}/duplicate`,
          title ? { title } : {},
          { signal: session.current.controller.signal },
        )
        assertCurrent()
        if (!data.id || data.isGlobal) {
          throw new Error("Cópia de modelo incompatível")
        }
        return data
      } catch (error) {
        await deny(error)
        throw error
      }
    },
    onMutate: () => ({ owner }),
    onSuccess: async (_duplicated, _vars, context) => {
      await cache.invalidateQueries({ queryKey: ["workout-templates", context.owner] })
    },
  })

  const archiveTemplateMutation = useMutation({
    mutationKey: [...root, "hub", "archive"],
    gcTime: 0,
    mutationFn: async (templateId: string) => {
      assertCurrent()
      try {
        const { data } = await api.post<WorkoutTemplateSummary>(
          `/workouts/templates/${templateId}/archive`,
          {},
          { signal: session.current.controller.signal },
        )
        assertCurrent()
        if (data.id !== templateId) {
          throw new Error("Resposta de arquivamento incompatível")
        }
        return data
      } catch (error) {
        await deny(error)
        throw error
      }
    },
    onMutate: () => ({ owner }),
    onSuccess: async (_archived, _id, context) => {
      await cache.invalidateQueries({ queryKey: ["workout-templates", context.owner] })
    },
  })

  const restoreTemplateMutation = useMutation({
    mutationKey: [...root, "hub", "restore"],
    gcTime: 0,
    mutationFn: async (templateId: string) => {
      assertCurrent()
      try {
        const { data } = await api.post<WorkoutTemplateSummary>(
          `/workouts/templates/${templateId}/restore`,
          {},
          { signal: session.current.controller.signal },
        )
        assertCurrent()
        if (data.id !== templateId) {
          throw new Error("Resposta de restauração incompatível")
        }
        return data
      } catch (error) {
        await deny(error)
        throw error
      }
    },
    onMutate: () => ({ owner }),
    onSuccess: async (_restored, _id, context) => {
      await cache.invalidateQueries({ queryKey: ["workout-templates", context.owner] })
    },
  })

  const applyToClientMutation = useMutation({
    mutationKey: [...root, "hub", "apply"],
    gcTime: 0,
    mutationFn: async ({
      templateId,
      clientId,
    }: {
      templateId: string
      clientId: string
    }): Promise<WorkoutDraftResource & { recoveredExisting?: boolean }> => {
      assertCurrent()
      if (!clientId || !templateId) {
        throw new Error("Prontuário ou modelo indisponível")
      }
      const signal = session.current.controller.signal
      const verify = (draft: WorkoutDraftResource, expectedId?: string) => {
        assertCurrent()
        if (
          !draft.id ||
          draft.clientId !== clientId ||
          draft.status !== "OPEN" ||
          (expectedId && draft.id !== expectedId)
        ) {
          throw new Error("Rascunho incompatível com o aluno selecionado")
        }
        return draft
      }
      try {
        const { data } = await api.post<WorkoutDraftResource>(
          `/workouts/templates/${templateId}/create-draft`,
          { clientId },
          { signal },
        )
        return verify(data)
      } catch (error) {
        assertCurrent()
        await deny(error)
        if (
          isAxiosError<{ code?: string; id?: string; clientId?: string }>(error) &&
          error.response?.status === 409
        ) {
          const conflict = error.response.data
          if (conflict.code === "DRAFT_EXISTS" && conflict.clientId === clientId && conflict.id) {
            assertCurrent()
            try {
              const { data } = await api.get<WorkoutDraftResource>(
                `/workouts/drafts/${conflict.id}`,
                { signal },
              )
              return { ...verify(data, conflict.id), recoveredExisting: true }
            } catch (verificationError) {
              await deny(verificationError)
              throw verificationError
            }
          }
        }
        throw error
      }
    },
    onSuccess: () => {
      void cache.invalidateQueries({
        queryKey: queryKeys.workoutDraftsRoot(owner),
        refetchType: "none",
      })
    },
  })

  return {
    accessDenied: Boolean(access),
    loadTemplateDetail,
    createStandaloneMutation,
    updateTemplateMutation,
    duplicateTemplateMutation,
    archiveTemplateMutation,
    restoreTemplateMutation,
    applyToClientMutation,
  }
}
