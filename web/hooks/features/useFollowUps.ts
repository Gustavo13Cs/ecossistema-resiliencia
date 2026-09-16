"use client"

import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { Appointment } from "@/types/appointment"
import type {
  ClientFollowUpSummary,
  FollowUpStatus,
  ChurnRiskLevel,
  RegularityLevel,
  FollowUpsKpi,
} from "@/types/follow-up"

export function calculateClientFollowUp(
  client: ReturnType<typeof useClients>["data"] extends (infer U)[] | undefined ? U : never,
  appointments: Appointment[],
  nowMs: number,
): ClientFollowUpSummary {
  const clientAppointments = appointments
    .filter((a) => a.clientId === client.id)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())

  const today = new Date(nowMs)
  today.setHours(0, 0, 0, 0)
  const startOfTodayMs = today.getTime()

  // Future / Active Scheduled Appointments:
  // Any appointment with status SCHEDULED or CONFIRMED that starts today or in the future
  const futureAppointments = clientAppointments.filter((a) => {
    const isScheduledOrConfirmed = a.status === "SCHEDULED" || a.status === "CONFIRMED"
    const appStartMs = new Date(a.startsAt).getTime()
    return isScheduledOrConfirmed && appStartMs >= startOfTodayMs
  })

  // Past Appointments:
  // Any appointment with status COMPLETED, or any appointment that started before today and was not cancelled
  const pastAppointments = clientAppointments.filter((a) => {
    const appStartMs = new Date(a.startsAt).getTime()
    if (a.status === "COMPLETED") return true
    return appStartMs < startOfTodayMs && a.status !== "CANCELLED"
  })

  // Completed appointments for cadence:
  const completedAppointments = pastAppointments.filter(
    (a) =>
      a.status === "COMPLETED" ||
      (new Date(a.endsAt).getTime() < startOfTodayMs && a.status !== "NO_SHOW"),
  )

  const lastAppointment =
    completedAppointments.length > 0
      ? completedAppointments[completedAppointments.length - 1]
      : pastAppointments.length > 0
      ? pastAppointments[pastAppointments.length - 1]
      : null

  const nextAppointment = futureAppointments.length > 0 ? futureAppointments[0] : null

  // Calendar days calculations
  let daysSinceLastAppointment: number | null = null
  if (lastAppointment) {
    const lastDate = new Date(lastAppointment.startsAt)
    const lastDayStart = new Date(
      lastDate.getFullYear(),
      lastDate.getMonth(),
      lastDate.getDate(),
    ).getTime()
    daysSinceLastAppointment = Math.max(
      0,
      Math.round((startOfTodayMs - lastDayStart) / (1000 * 60 * 60 * 24)),
    )
  }

  let daysUntilNextAppointment: number | null = null
  if (nextAppointment) {
    const nextDate = new Date(nextAppointment.startsAt)
    const nextDayStart = new Date(
      nextDate.getFullYear(),
      nextDate.getMonth(),
      nextDate.getDate(),
    ).getTime()
    daysUntilNextAppointment = Math.max(
      0,
      Math.round((nextDayStart - startOfTodayMs) / (1000 * 60 * 60 * 24)),
    )
  }

  // Check recent no-show
  const lastRawAppointment =
    clientAppointments.length > 0
      ? clientAppointments[clientAppointments.length - 1]
      : null
  const isRecentNoShow =
    lastRawAppointment?.status === "NO_SHOW" && !nextAppointment

  // Status classification
  let status: FollowUpStatus = "UNSCHEDULED"
  if (nextAppointment && daysUntilNextAppointment !== null) {
    if (daysUntilNextAppointment <= 7) status = "UPCOMING_7_DAYS"
    else if (daysUntilNextAppointment <= 15) status = "UPCOMING_15_DAYS"
    else if (daysUntilNextAppointment <= 30) status = "UPCOMING_30_DAYS"
    else status = "UPCOMING_30_DAYS"
  } else if (isRecentNoShow) {
    status = "NO_SHOW"
  } else if (daysSinceLastAppointment !== null) {
    if (daysSinceLastAppointment <= 7) {
      status = "COMPLETED_RECENT"
    } else if (daysSinceLastAppointment > 35) {
      status = "OVERDUE"
    } else {
      status = "UNSCHEDULED"
    }
  } else {
    // Never had an appointment - check client registration date
    const clientAgeDays = Math.floor(
      (nowMs - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    )
    if (clientAgeDays > 35) {
      status = "OVERDUE"
    } else {
      status = "UNSCHEDULED"
    }
  }

  // Churn risk classification
  let churnRisk: ChurnRiskLevel = "LOW"
  if (status === "NO_SHOW") {
    churnRisk = "HIGH"
  } else if (status === "OVERDUE") {
    churnRisk = (daysSinceLastAppointment ?? 40) > 60 ? "HIGH" : "MEDIUM"
  } else if (status === "UNSCHEDULED") {
    churnRisk = (daysSinceLastAppointment ?? 0) > 25 ? "MEDIUM" : "LOW"
  } else {
    churnRisk = "LOW"
  }

  // Cadence / Average interval calculation
  let averageIntervalDays: number | null = null
  let regularity: RegularityLevel = "NEW_CLIENT"

  if (completedAppointments.length >= 2) {
    const intervals: number[] = []
    for (let i = 1; i < completedAppointments.length; i++) {
      const prev = new Date(completedAppointments[i - 1].startsAt).getTime()
      const curr = new Date(completedAppointments[i].startsAt).getTime()
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24))
      if (diffDays > 0) intervals.push(diffDays)
    }

    if (intervals.length > 0) {
      const sum = intervals.reduce((acc, val) => acc + val, 0)
      averageIntervalDays = Math.round(sum / intervals.length)

      if (averageIntervalDays >= 20 && averageIntervalDays <= 38) {
        regularity = "EXCELLENT"
      } else if (averageIntervalDays <= 50) {
        regularity = "REGULAR"
      } else {
        regularity = "IRREGULAR"
      }
    }
  } else {
    regularity = "NEW_CLIENT"
  }

  return {
    client,
    lastAppointment,
    nextAppointment,
    daysSinceLastAppointment,
    daysUntilNextAppointment,
    status,
    churnRisk,
    regularity,
    averageIntervalDays,
    completedAppointmentsCount: completedAppointments.length,
    appointmentsHistory: clientAppointments,
  }
}

export function useFollowUps() {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"
  const queryClient = useQueryClient()

  // 1. Fetch active clients
  const {
    data: clients = [],
    isLoading: isLoadingClients,
    error: clientsError,
    refetch: refetchClients,
  } = useClients("ACTIVE")

  // 2. Fetch appointments in multi-window slices to strictly satisfy the backend 42-day MAX_RANGE limit
  const {
    data: appointments = [],
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: [...queryKeys.appointmentsRoot(sessionUserId), "follow-ups-windows"],
    queryFn: async () => {
      const now = new Date()
      const ms35Days = 35 * 24 * 60 * 60 * 1000
      const tNow = now.getTime()
      const tMinus35 = tNow - ms35Days
      const tMinus70 = tNow - 2 * ms35Days
      const tPlus35 = tNow + ms35Days

      // 3 windows of 35 days each (all <= 42 days limit):
      const slice1Promise = api
        .get<Appointment[]>("/appointments", {
          params: {
            from: new Date(tMinus70).toISOString(),
            to: new Date(tMinus35).toISOString(),
          },
        })
        .then((r) => r.data ?? [])
        .catch(() => [] as Appointment[])

      const slice2Promise = api
        .get<Appointment[]>("/appointments", {
          params: {
            from: new Date(tMinus35).toISOString(),
            to: new Date(tNow).toISOString(),
          },
        })
        .then((r) => r.data ?? [])
        .catch(() => [] as Appointment[])

      const slice3Promise = api
        .get<Appointment[]>("/appointments", {
          params: {
            from: new Date(tNow).toISOString(),
            to: new Date(tPlus35).toISOString(),
          },
        })
        .then((r) => r.data ?? [])
        .catch(() => [] as Appointment[])

      const [slice1, slice2, slice3] = await Promise.all([slice1Promise, slice2Promise, slice3Promise])

      const appointmentsMap = new Map<string, Appointment>()
      ;[...slice1, ...slice2, ...slice3].forEach((app) => {
        if (app?.id) {
          appointmentsMap.set(app.id, app)
        }
      })

      return Array.from(appointmentsMap.values())
    },
    enabled: Boolean(user?.sub),
    staleTime: 1000 * 30, // 30 seconds
  })

  // 3. Process clients into follow-up summaries
  const followUpSummaries = useMemo(() => {
    const nowMs = Date.now()
    return clients.map((client) => calculateClientFollowUp(client, appointments, nowMs))
  }, [clients, appointments])

  // 4. Calculate KPIs
  const kpiSummary: FollowUpsKpi = useMemo(() => {
    const totalClients = followUpSummaries.length
    let upcoming30Days = 0
    let upcoming7Days = 0
    let overdueCount = 0
    let unscheduledCount = 0
    let retainedClientsCount = 0

    let totalCadenceSum = 0
    let clientsWithCadence = 0

    followUpSummaries.forEach((summary) => {
      if (
        summary.status === "UPCOMING_7_DAYS" ||
        summary.status === "UPCOMING_15_DAYS" ||
        summary.status === "UPCOMING_30_DAYS"
      ) {
        upcoming30Days++
        retainedClientsCount++
      }

      if (summary.status === "UPCOMING_7_DAYS") {
        upcoming7Days++
      }

      if (summary.status === "OVERDUE") {
        overdueCount++
      }

      if (summary.status === "UNSCHEDULED" || summary.status === "NO_SHOW") {
        unscheduledCount++
      }

      // Also count clients who visited recently as retained
      if (
        summary.status === "COMPLETED_RECENT" ||
        (summary.daysSinceLastAppointment !== null && summary.daysSinceLastAppointment <= 35)
      ) {
        retainedClientsCount++
      }

      if (summary.averageIntervalDays) {
        totalCadenceSum += summary.averageIntervalDays
        clientsWithCadence++
      }
    })

    const retentionRatePercent =
      totalClients > 0
        ? Math.min(100, Math.round((retainedClientsCount / totalClients) * 100))
        : 0

    const averageCadenceDays =
      clientsWithCadence > 0 ? Math.round(totalCadenceSum / clientsWithCadence) : 30

    return {
      totalClients,
      upcoming30Days,
      upcoming7Days,
      overdueCount,
      unscheduledCount,
      retentionRatePercent,
      averageCadenceDays,
    }
  }, [followUpSummaries])

  const refetchAll = async () => {
    await Promise.all([refetchClients(), refetchAppointments()])
    await queryClient.invalidateQueries({
      queryKey: queryKeys.appointmentsRoot(sessionUserId),
    })
  }

  return {
    followUpSummaries,
    kpiSummary,
    loading: isLoadingClients || isLoadingAppointments,
    error: clientsError || appointmentsError,
    refetch: refetchAll,
    activeClients: clients,
  }
}
