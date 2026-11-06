"use client"

import { useLayoutEffect, useRef } from "react"
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  CreateTrainingAnamnesisInput,
  TrainingAnamnesisRecord,
} from "@/types/training-anamnesis"
import { useClinicalQuery } from "./useClinicalQuery"

export function useCreateTrainingAnamnesis(clientId: string) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const owner = user?.sub ?? "anonymous"
  const role = user?.role
  const key = queryKeys.trainingAnamneses(owner, clientId)
  const accessKey = ["training-anamneses", owner, "access"] as const

  const session = useRef({
    owner,
    role,
    clientId,
    active: true,
    controller: new AbortController(),
  })

  useLayoutEffect(() => {
    session.current = {
      owner,
      role,
      clientId,
      active: true,
      controller: new AbortController(),
    }
    return () => {
      session.current.active = false
      session.current.controller.abort()
    }
  }, [owner, role, clientId])

  const sameScope = () =>
    Boolean(user?.sub) &&
    session.current.active &&
    session.current.owner === owner &&
    session.current.role === "PERSONAL" &&
    session.current.clientId === clientId

  async function deny(error: unknown) {
    if (
      !isAxiosError(error) ||
      ![401, 403].includes(error.response?.status ?? 0)
    ) {
      return
    }
    cache.setQueryData(accessKey, true)
    await cache.cancelQueries({ queryKey: ["training-anamneses", owner] })
    cache.setQueriesData(
      {
        queryKey: ["training-anamneses", owner],
        predicate: query => query.queryKey[2] !== "access",
      },
      null,
    )
    if (sameScope()) {
      session.current.controller.abort()
    }
  }

  return useMutation({
    mutationKey: [...key, "create"],
    gcTime: 0,
    mutationFn: async (
      input: Omit<CreateTrainingAnamnesisInput, "clientId">,
    ) => {
      if (!sameScope() || cache.getQueryData(accessKey)) {
        throw new Error("A sessão da anamnese mudou")
      }
      try {
        const { data } = await api.post<TrainingAnamnesisRecord>(
          "/workouts/anamneses",
          { ...input, clientId },
          { signal: session.current.controller.signal },
        )
        if (!sameScope() || data.clientId !== clientId) {
          throw new Error("Anamnese incompatível com o prontuário")
        }
        return data
      } catch (error) {
        await deny(error)
        throw error
      }
    },
    onMutate: () => ({ owner, clientId }),
    onSuccess: async (_created, _input, context) => {
      await cache.invalidateQueries({
        queryKey: queryKeys.trainingAnamneses(context.owner, context.clientId),
      })
    },
  })
}

export function useTrainingAnamnesis(
  clientId: string,
  options: { enabled?: boolean } = {},
) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const owner = user?.sub ?? "anonymous"
  const role = user?.role
  const key = queryKeys.trainingAnamneses(owner, clientId)
  const accessKey = ["training-anamneses", owner, "access"] as const
  const createMutation = useCreateTrainingAnamnesis(clientId)

  const access = useQuery({
    queryKey: accessKey,
    queryFn: skipToken,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  }).data

  const enabled = Boolean(
    user?.sub &&
      role === "PERSONAL" &&
      clientId &&
      options.enabled !== false &&
      !access,
  )

  async function deny(error: unknown) {
    if (
      !isAxiosError(error) ||
      ![401, 403].includes(error.response?.status ?? 0)
    ) {
      return
    }
    cache.setQueryData(accessKey, true)
    await cache.cancelQueries({ queryKey: ["training-anamneses", owner] })
    cache.setQueriesData(
      {
        queryKey: ["training-anamneses", owner],
        predicate: query => query.queryKey[2] !== "access",
      },
      null,
    )
  }

  const anamnesesQuery = useClinicalQuery(key, enabled, async signal => {
    try {
      const { data } = await api.get<TrainingAnamnesisRecord[]>(
        `/workouts/anamneses/client/${clientId}`,
        { signal },
      )
      return Array.isArray(data)
        ? data.filter(item => item.clientId === clientId)
        : []
    } catch (error) {
      await deny(error)
      throw error
    }
  })

  const list = anamnesesQuery.data ?? []

  return {
    anamnesesQuery,
    anamneses: list,
    latestAnamnesis: list[0] ?? null,
    createMutation,
    accessDenied: Boolean(access),
  }
}
