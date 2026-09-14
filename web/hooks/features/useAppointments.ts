"use client"

import axios from "axios"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  Appointment,
  AppointmentActionCommand,
  AppointmentFilters,
  AppointmentPeriod,
  CancelAppointmentCommand,
  CreateAppointmentCommand,
  UpdateAppointmentCommand,
} from "@/types/appointment"

export type AppointmentsState =
  | "loading"
  | "ready"
  | "empty"
  | "network-error"
  | "server-error"
  | "unauthorized"

export type AppointmentTransition =
  | "confirm"
  | "complete"
  | "no-show"
  | "cancel"

function classifyAppointmentsError(
  error: unknown,
): "network-error" | "server-error" | "unauthorized" {
  if (!axios.isAxiosError(error)) return "server-error"
  if (error.response?.status === 401 || error.response?.status === 403) {
    return "unauthorized"
  }
  if (!error.response) return "network-error"
  return "server-error"
}

function safeConflictMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null
  const message = (error.response.data as { message?: unknown } | undefined)
    ?.message
  if (typeof message !== "string") return "A agenda mudou. Atualize e tente novamente."
  const normalized = message.trim()
  if (!normalized || normalized.length > 200) {
    return "A agenda mudou. Atualize e tente novamente."
  }
  return normalized
}

export function useAppointments(
  period: AppointmentPeriod,
  filters: AppointmentFilters = {},
  options: { enabled?: boolean } = {},
) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [conflict, setConflict] = useState<string | null>(null)
  const sessionUserId = user?.sub ?? "anonymous"
  const enabled = Boolean(user?.sub && options.enabled !== false)

  const query = useQuery({
    queryKey: queryKeys.appointments(
      sessionUserId,
      period.from,
      period.to,
      filters.clientId,
      filters.status,
    ),
    queryFn: async ({ signal }) => {
      const response = await api.get<Appointment[]>("/appointments", {
        params: {
          from: period.from,
          to: period.to,
          clientId: filters.clientId,
          status: filters.status,
        },
        signal,
      })
      return response.data ?? []
    },
    enabled,
  })

  const invalidateAffectedData = async (clientId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointmentsRoot(sessionUserId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.client(sessionUserId, clientId),
      }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: async (command: CreateAppointmentCommand) => {
      const response = await api.post<Appointment>("/appointments", command)
      return response.data
    },
    onSuccess: (created) => invalidateAffectedData(created.clientId),
    onError: (error) => setConflict(safeConflictMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      command,
    }: {
      appointmentId: string
      command: UpdateAppointmentCommand
    }) => {
      const response = await api.patch<Appointment>(
        `/appointments/${appointmentId}`,
        command,
      )
      return response.data
    },
    onSuccess: (updated) => invalidateAffectedData(updated.clientId),
    onError: (error) => setConflict(safeConflictMessage(error)),
  })

  const transitionMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      transition,
      command,
    }: {
      appointmentId: string
      transition: AppointmentTransition
      command: AppointmentActionCommand | CancelAppointmentCommand
    }) => {
      const response = await api.post<Appointment>(
        `/appointments/${appointmentId}/${transition}`,
        command,
      )
      return response.data
    },
    onSuccess: (updated) => invalidateAffectedData(updated.clientId),
    onError: (error) => setConflict(safeConflictMessage(error)),
  })

  const appointments = query.data ?? []
  let state: AppointmentsState
  if (!user?.sub) state = "unauthorized"
  else if (query.isPending) state = "loading"
  else if (query.error) state = classifyAppointmentsError(query.error)
  else if (appointments.length === 0) state = "empty"
  else state = "ready"

  return {
    appointments,
    state,
    error: query.error,
    conflict,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      transitionMutation.isPending,
    refetch: query.refetch,
    clearConflict: () => setConflict(null),
    loadAppointment: async (appointmentId: string) => {
      const response = await api.get<Appointment>(
        `/appointments/${appointmentId}`,
      )
      return response.data
    },
    createAppointment: (command: CreateAppointmentCommand) => {
      setConflict(null)
      return createMutation.mutateAsync(command)
    },
    updateAppointment: async (
      appointmentId: string,
      command: UpdateAppointmentCommand,
    ) => {
      setConflict(null)
      return updateMutation.mutateAsync({ appointmentId, command })
    },
    transitionAppointment: async (
      appointmentId: string,
      transition: AppointmentTransition,
      command: AppointmentActionCommand | CancelAppointmentCommand,
    ) => {
      setConflict(null)
      return transitionMutation.mutateAsync({
        appointmentId,
        transition,
        command,
      })
    },
  }
}
