"use client"

import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { calculateClientFollowUp } from "@/hooks/features/useFollowUps"
import type { PersonalAssessmentRaw } from "@/hooks/features/usePersonalEvolution"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { getPlanWeek, validatePeriodization } from "@/lib/workout-periodization"
import type { Appointment } from "@/types/appointment"
import type { Client } from "@/types/client"
import type { Periodization, PeriodPhase } from "@/types/workout-p3"
import type { DraftSummary } from "@/types/workout-draft"

export type WorkoutCycleStatus =
  | "NO_ACTIVE_WORKOUT"
  | "CYCLE_COMPLETED"
  | "DELOAD_WEEK"
  | "ENDING_SOON"
  | "ACTIVE_ON_TRACK"

export type AssessmentCycleStatus =
  | "NEVER_ASSESSED"
  | "ASSESSMENT_OVERDUE"
  | "ASSESSMENT_DUE_SOON"
  | "ASSESSMENT_UP_TO_DATE"

export interface PersonalWorkoutRow {
  id: string
  clientId: string | null
  title: string
  goal?: string | null
  durationWeeks?: number | null
  periodization?: Periodization | null
  isActive: boolean
  createdAt: string
  finalizedAt?: string | null
}

export interface PersonalFollowUpItem {
  client: Client
  activeWorkout: PersonalWorkoutRow | null
  openDraft: DraftSummary | null
  workoutCycleStatus: WorkoutCycleStatus
  currentWeek: number | null
  totalWeeks: number | null
  currentPhaseName: string | null
  currentPhaseType: PeriodPhase["type"] | null
  remainingWorkoutDays: number | null
  assessmentStatus: AssessmentCycleStatus
  lastAssessmentDate: string | null
  daysSinceLastAssessment: number | null
  lastAppointment: Appointment | null
  nextAppointment: Appointment | null
  daysSinceLastAppointment: number | null
  daysUntilNextAppointment: number | null
  hasRecentNoShow: boolean
  urgencyScore: number
}

export interface PersonalFollowUpsKpi {
  totalActiveStudents: number
  workoutActionNeededCount: number
  deloadOrEndingSoonCount: number
  assessmentPendingCount: number
  scheduledNextSessionCount: number
}

function civilDaysBetween(earlierIsoOrCivil: string, laterMs: number): number {
  const d1 = new Date(earlierIsoOrCivil)
  const start1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate())
  const d2 = new Date(laterMs)
  const start2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate())
  return Math.max(0, Math.round((start2 - start1) / 86_400_000))
}

export function calculatePersonalFollowUpItem(params: {
  client: Client
  workouts: readonly PersonalWorkoutRow[]
  openDrafts: readonly DraftSummary[]
  assessments: readonly PersonalAssessmentRaw[]
  appointments: readonly Appointment[]
  nowMs: number
}): PersonalFollowUpItem {
  const { client, workouts, openDrafts, assessments, appointments, nowMs } =
    params

  const activeWorkout =
    workouts.find((w) => w.clientId === client.id && w.isActive) ?? null

  const openDraft =
    openDrafts.find((d) => d.clientId === client.id && d.status === "OPEN") ??
    null

  let workoutCycleStatus: WorkoutCycleStatus = "NO_ACTIVE_WORKOUT"
  let currentWeek: number | null = null
  let totalWeeks: number | null = activeWorkout?.durationWeeks ?? null
  let currentPhaseName: string | null = null
  let currentPhaseType: PeriodPhase["type"] | null = null
  let remainingWorkoutDays: number | null = null

  if (activeWorkout) {
    const duration = activeWorkout.durationWeeks ?? null
    const periodization = activeWorkout.periodization ?? null
    const hasValidPeriodization =
      duration !== null &&
      periodization !== null &&
      validatePeriodization(periodization, duration, true).length === 0

    if (hasValidPeriodization && periodization && duration) {
      const planWeek = getPlanWeek(periodization, duration, new Date(nowMs))
      currentWeek = planWeek.week
      totalWeeks = duration
      const phase =
        periodization.phases.find(
          (p) => planWeek.week >= p.startWeek && planWeek.week <= p.endWeek,
        ) ?? null
      currentPhaseName = phase?.name ?? null
      currentPhaseType = phase?.type ?? null

      const startMs = Date.parse(`${periodization.startsOn}T00:00:00Z`)
      const todayMs = Date.parse(`${planWeek.today}T00:00:00Z`)
      const elapsedDays = Math.floor((todayMs - startMs) / 86_400_000)
      const totalDays = duration * 7
      remainingWorkoutDays = Math.max(0, totalDays - elapsedDays)

      if (planWeek.status === "COMPLETED") {
        workoutCycleStatus = "CYCLE_COMPLETED"
      } else if (phase?.type === "DELOAD") {
        workoutCycleStatus = "DELOAD_WEEK"
      } else if (remainingWorkoutDays <= 14 || planWeek.week >= duration - 1) {
        workoutCycleStatus = "ENDING_SOON"
      } else {
        workoutCycleStatus = "ACTIVE_ON_TRACK"
      }
    } else if (duration && duration > 0) {
      const refDate = activeWorkout.finalizedAt ?? activeWorkout.createdAt
      const elapsedDays = civilDaysBetween(refDate, nowMs)
      const totalDays = duration * 7
      currentWeek = Math.max(
        1,
        Math.min(duration, Math.floor(elapsedDays / 7) + 1),
      )
      totalWeeks = duration
      remainingWorkoutDays = Math.max(0, totalDays - elapsedDays)

      if (elapsedDays >= totalDays) {
        workoutCycleStatus = "CYCLE_COMPLETED"
      } else if (remainingWorkoutDays <= 14) {
        workoutCycleStatus = "ENDING_SOON"
      } else {
        workoutCycleStatus = "ACTIVE_ON_TRACK"
      }
    } else {
      workoutCycleStatus = "ACTIVE_ON_TRACK"
    }
  }

  // Avaliações Físicas do Aluno
  const clientAssessments = assessments
    .filter((a) => a.clientId === client.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const latestAssessment = clientAssessments[0] ?? null
  const lastAssessmentDate = latestAssessment?.date ?? null
  const daysSinceLastAssessment = lastAssessmentDate
    ? civilDaysBetween(lastAssessmentDate, nowMs)
    : null

  let assessmentStatus: AssessmentCycleStatus = "NEVER_ASSESSED"
  if (daysSinceLastAssessment !== null) {
    if (daysSinceLastAssessment > 45) {
      assessmentStatus = "ASSESSMENT_OVERDUE"
    } else if (daysSinceLastAssessment >= 30) {
      assessmentStatus = "ASSESSMENT_DUE_SOON"
    } else {
      assessmentStatus = "ASSESSMENT_UP_TO_DATE"
    }
  }

  // Agenda
  const agendaFollowUp = calculateClientFollowUp(
    client,
    [...appointments],
    nowMs,
  )
  const hasRecentNoShow = agendaFollowUp.status === "NO_SHOW"

  // Score de urgência para ordenação inteligente
  let urgencyScore = 0
  if (workoutCycleStatus === "NO_ACTIVE_WORKOUT") urgencyScore += 100
  else if (workoutCycleStatus === "CYCLE_COMPLETED") urgencyScore += 90
  else if (workoutCycleStatus === "DELOAD_WEEK") urgencyScore += 75
  else if (workoutCycleStatus === "ENDING_SOON") urgencyScore += 60

  if (assessmentStatus === "NEVER_ASSESSED") urgencyScore += 45
  else if (assessmentStatus === "ASSESSMENT_OVERDUE") urgencyScore += 40
  else if (assessmentStatus === "ASSESSMENT_DUE_SOON") urgencyScore += 20

  if (hasRecentNoShow) urgencyScore += 35
  else if (!agendaFollowUp.nextAppointment) urgencyScore += 15

  return {
    client,
    activeWorkout,
    openDraft,
    workoutCycleStatus,
    currentWeek,
    totalWeeks,
    currentPhaseName,
    currentPhaseType,
    remainingWorkoutDays,
    assessmentStatus,
    lastAssessmentDate,
    daysSinceLastAssessment,
    lastAppointment: agendaFollowUp.lastAppointment,
    nextAppointment: agendaFollowUp.nextAppointment,
    daysSinceLastAppointment: agendaFollowUp.daysSinceLastAppointment,
    daysUntilNextAppointment: agendaFollowUp.daysUntilNextAppointment,
    hasRecentNoShow,
    urgencyScore,
  }
}

export function summarizePersonalFollowUpsKpi(
  items: readonly PersonalFollowUpItem[],
): PersonalFollowUpsKpi {
  let workoutActionNeededCount = 0
  let deloadOrEndingSoonCount = 0
  let assessmentPendingCount = 0
  let scheduledNextSessionCount = 0

  for (const item of items) {
    if (
      item.workoutCycleStatus === "NO_ACTIVE_WORKOUT" ||
      item.workoutCycleStatus === "CYCLE_COMPLETED"
    ) {
      workoutActionNeededCount++
    }
    if (
      item.workoutCycleStatus === "DELOAD_WEEK" ||
      item.workoutCycleStatus === "ENDING_SOON"
    ) {
      deloadOrEndingSoonCount++
    }
    if (
      item.assessmentStatus === "NEVER_ASSESSED" ||
      item.assessmentStatus === "ASSESSMENT_OVERDUE"
    ) {
      assessmentPendingCount++
    }
    if (item.nextAppointment !== null) {
      scheduledNextSessionCount++
    }
  }

  return {
    totalActiveStudents: items.length,
    workoutActionNeededCount,
    deloadOrEndingSoonCount,
    assessmentPendingCount,
    scheduledNextSessionCount,
  }
}

export function usePersonalFollowUps() {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"
  const isPersonal = Boolean(user?.sub && user.role === "PERSONAL")
  const queryClient = useQueryClient()

  const clientsQuery = useClients("ACTIVE")

  const workoutsQuery = useQuery({
    queryKey: queryKeys.workouts(sessionUserId),
    queryFn: async () => {
      const response = await api.get<PersonalWorkoutRow[]>("/workouts")
      return response.data ?? []
    },
    enabled: isPersonal,
  })

  const draftsQuery = useQuery({
    queryKey: queryKeys.workoutDrafts(sessionUserId),
    queryFn: async () => {
      const response = await api.get<{ items: DraftSummary[] }>(
        "/workouts/drafts",
      )
      return response.data?.items ?? []
    },
    enabled: isPersonal,
  })

  const assessmentsQuery = useQuery({
    queryKey: [
      ...queryKeys.personalEvolution(sessionUserId),
      "follow-ups-assessments",
    ],
    queryFn: async () => {
      const response = await api.get<PersonalAssessmentRaw[]>("/assessments")
      return response.data ?? []
    },
    enabled: isPersonal,
  })

  const appointmentsQuery = useQuery({
    queryKey: [
      ...queryKeys.appointmentsRoot(sessionUserId),
      "personal-follow-ups-windows",
    ],
    queryFn: async () => {
      const now = Date.now()
      const ms35Days = 35 * 24 * 60 * 60 * 1000
      const windows = [
        [now - 2 * ms35Days, now - ms35Days],
        [now - ms35Days, now],
        [now, now + ms35Days],
      ] as const

      const slices = await Promise.all(
        windows.map(([fromMs, toMs]) =>
          api
            .get<Appointment[]>("/appointments", {
              params: {
                from: new Date(fromMs).toISOString(),
                to: new Date(toMs).toISOString(),
              },
            })
            .then((r) => r.data ?? [])
            .catch(() => [] as Appointment[]),
        ),
      )

      const deduped = new Map<string, Appointment>()
      for (const slice of slices) {
        for (const appt of slice) {
          if (appt?.id) deduped.set(appt.id, appt)
        }
      }
      return Array.from(deduped.values())
    },
    enabled: isPersonal,
    staleTime: 30_000,
  })

  const items = useMemo(() => {
    const clients = clientsQuery.data ?? []
    const workouts = workoutsQuery.data ?? []
    const openDrafts = draftsQuery.data ?? []
    const assessments = Array.isArray(assessmentsQuery.data)
      ? assessmentsQuery.data
      : []
    const appointments = appointmentsQuery.data ?? []
    const nowMs = Date.now()

    return clients.map((client) =>
      calculatePersonalFollowUpItem({
        client,
        workouts,
        openDrafts,
        assessments,
        appointments,
        nowMs,
      }),
    )
  }, [
    clientsQuery.data,
    workoutsQuery.data,
    draftsQuery.data,
    assessmentsQuery.data,
    appointmentsQuery.data,
  ])

  const kpi = useMemo(() => summarizePersonalFollowUpsKpi(items), [items])

  const refetch = async () => {
    await Promise.all([
      clientsQuery.refetch(),
      workoutsQuery.refetch(),
      draftsQuery.refetch(),
      assessmentsQuery.refetch(),
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointmentsRoot(sessionUserId),
      }),
    ])
  }

  return {
    items,
    kpi,
    activeClients: clientsQuery.data ?? [],
    loading:
      clientsQuery.isPending ||
      workoutsQuery.isPending ||
      draftsQuery.isPending ||
      assessmentsQuery.isPending ||
      appointmentsQuery.isPending,
    error:
      clientsQuery.error ??
      workoutsQuery.error ??
      draftsQuery.error ??
      assessmentsQuery.error ??
      appointmentsQuery.error,
    refetch,
  }
}
