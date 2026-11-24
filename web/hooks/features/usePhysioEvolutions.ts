"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  CreatePhysioSessionEvolutionInput,
  PhysioSessionEvolution,
  UpdatePhysioSessionEvolutionInput,
} from "@/types/physio"
import { useClinicalQuery } from "./useClinicalQuery"

export function usePhysioEvolutions(
  clientId?: string,
  options: { enabled?: boolean } = {},
) {
  const { user } = useAuth()
  const enabled = Boolean(
    user?.sub &&
      user.role === "PHYSIO" &&
      clientId &&
      options.enabled !== false,
  )

  const query = useClinicalQuery(
    queryKeys.physioEvolutions(user?.sub ?? "anonymous", clientId ?? "missing"),
    enabled,
    async (signal) => {
      const { data } = await api.get<PhysioSessionEvolution[]>(
        `/rehab-plans/evolutions/client/${clientId}`,
        { signal },
      )
      return data ?? []
    },
  )

  return {
    ...query,
    evolutions: query.data ?? [],
  }
}

export function useAppointmentPhysioEvolution(
  appointmentId?: string,
  options: { enabled?: boolean } = {},
) {
  const { user } = useAuth()
  const enabled = Boolean(
    user?.sub &&
      user.role === "PHYSIO" &&
      appointmentId &&
      options.enabled !== false,
  )

  return useClinicalQuery(
    queryKeys.physioAppointmentEvolution(
      user?.sub ?? "anonymous",
      appointmentId ?? "missing",
    ),
    enabled,
    async (signal) => {
      const { data } = await api.get<PhysioSessionEvolution | null>(
        `/rehab-plans/evolutions/appointment/${appointmentId}`,
        { signal },
      )
      return data ?? null
    },
  )
}

function invalidatePhysioQueries(
  cache: ReturnType<typeof useQueryClient>,
  sub: string,
  clientId: string,
  appointmentId?: string | null,
) {
  const tasks: Promise<void>[] = [
    cache.invalidateQueries({ queryKey: queryKeys.physioWorkspace(sub) }),
    cache.invalidateQueries({ queryKey: queryKeys.physioOverview(sub, clientId) }),
    cache.invalidateQueries({ queryKey: queryKeys.physioEvolutions(sub, clientId) }),
    cache.invalidateQueries({ queryKey: queryKeys.patientOverview(sub, clientId) }),
  ]
  if (appointmentId) {
    tasks.push(
      cache.invalidateQueries({
        queryKey: queryKeys.physioAppointmentEvolution(sub, appointmentId),
      }),
    )
  }
  return Promise.all(tasks)
}

export function useCreatePhysioEvolution() {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"
  const allowed = Boolean(user?.sub && user.role === "PHYSIO")

  return useMutation({
    mutationFn: async (input: CreatePhysioSessionEvolutionInput) => {
      if (!allowed) throw new Error("Acesso permitido somente a fisioterapeuta")
      const { data } = await api.post<PhysioSessionEvolution>(
        "/rehab-plans/evolutions",
        input,
      )
      return data
    },
    onMutate: () => ({ sub }),
    onSuccess: async (created, input, context) => {
      await invalidatePhysioQueries(
        cache,
        context.sub,
        created.clientId || input.clientId,
        created.appointmentId ?? input.appointmentId,
      )
    },
  })
}

export function useUpdatePhysioEvolution(clientId: string) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"
  const allowed = Boolean(user?.sub && user.role === "PHYSIO")

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: UpdatePhysioSessionEvolutionInput
    }) => {
      if (!allowed) throw new Error("Acesso permitido somente a fisioterapeuta")
      const { data } = await api.patch<PhysioSessionEvolution>(
        `/rehab-plans/evolutions/${id}`,
        input,
      )
      return data
    },
    onMutate: () => ({ sub, clientId }),
    onSuccess: async (updated, _vars, context) => {
      await invalidatePhysioQueries(
        cache,
        context.sub,
        updated.clientId || context.clientId,
        updated.appointmentId,
      )
    },
  })
}

export function useDeletePhysioEvolution(clientId: string) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const sub = user?.sub ?? "anonymous"
  const allowed = Boolean(user?.sub && user.role === "PHYSIO")

  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string
      appointmentId?: string | null
    }) => {
      if (!allowed) throw new Error("Acesso permitido somente a fisioterapeuta")
      const { data } = await api.delete<{ id: string; clientId: string }>(
        `/rehab-plans/evolutions/${id}`,
      )
      return data
    },
    onMutate: (_vars) => ({ sub, clientId }),
    onSuccess: async (deleted, vars, context) => {
      await invalidatePhysioQueries(
        cache,
        context.sub,
        deleted.clientId || context.clientId,
        vars.appointmentId,
      )
    },
  })
}
