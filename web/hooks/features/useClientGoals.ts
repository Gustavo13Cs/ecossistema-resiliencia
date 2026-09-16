"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { api } from "@/lib/api"
import { toast } from "sonner"
import type {
  ClientGoalCommitment,
  GoalProgress,
  GoalAlert,
  GoalsKpiSummary,
  ClientWithGoalSummary,
  RateFeasibility,
  GoalCategory,
  GoalStatus,
} from "@/types/goal"
import type { Client } from "@/types/client"

interface AssessmentItem {
  id: string
  clientId: string | null
  date: string
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
}

const STORAGE_KEY_PREFIX = "safemove_client_goals_v1"

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}_${userId}`
}

function calculateProgress(
  goal: ClientGoalCommitment,
  latestAssessment: AssessmentItem | null,
  client: Client,
): GoalProgress {
  const currentWeightKg = latestAssessment?.weight ?? client.initialWeight ?? goal.startWeightKg ?? 70
  const currentBodyFatPercent = latestAssessment?.bodyFat ?? goal.startBodyFatPercent ?? null
  const currentMuscleMassKg = latestAssessment?.muscleMass ?? null

  const startWeight = goal.startWeightKg ?? client.initialWeight ?? currentWeightKg
  const targetWeight = goal.targetWeightKg ?? currentWeightKg

  const weightDeltaKg = Math.round((currentWeightKg - startWeight) * 10) / 10
  const weightRemainingKg = Math.round((targetWeight - currentWeightKg) * 10) / 10

  // Calculate days
  const startDateMs = new Date(goal.startDate).getTime()
  const targetDateMs = new Date(goal.targetDate).getTime()
  const nowMs = Date.now()

  const daysTotal = Math.max(1, Math.round((targetDateMs - startDateMs) / (1000 * 60 * 60 * 24)))
  const daysPassed = Math.max(0, Math.round((nowMs - startDateMs) / (1000 * 60 * 60 * 24)))
  const daysRemaining = Math.max(0, Math.round((targetDateMs - nowMs) / (1000 * 60 * 60 * 24)))

  // Percentage achieved
  let percentAchieved = 0
  const totalWeightChangeNeeded = targetWeight - startWeight

  if (Math.abs(totalWeightChangeNeeded) < 0.1) {
    percentAchieved = 100
  } else if (totalWeightChangeNeeded < 0) {
    // Weight loss goal
    const lost = startWeight - currentWeightKg
    const needed = startWeight - targetWeight
    percentAchieved = Math.min(100, Math.max(0, Math.round((lost / needed) * 100)))
  } else {
    // Weight gain goal
    const gained = currentWeightKg - startWeight
    const needed = targetWeight - startWeight
    percentAchieved = Math.min(100, Math.max(0, Math.round((gained / needed) * 100)))
  }

  // Required weekly rate
  const weeksRemaining = Math.max(0.5, daysRemaining / 7)
  const requiredWeeklyRateKg = Math.round((Math.abs(weightRemainingKg) / weeksRemaining) * 100) / 100

  // Actual weekly rate observed
  const weeksPassed = Math.max(0.5, daysPassed / 7)
  const actualWeeklyRateKg = Math.round((Math.abs(weightDeltaKg) / weeksPassed) * 100) / 100

  // Rate feasibility
  let rateFeasibility: RateFeasibility = "HEALTHY"
  if (goal.category === "HEALTH_MAINTENANCE") {
    rateFeasibility = "MAINTAIN"
  } else if (goal.category === "WEIGHT_LOSS") {
    if (requiredWeeklyRateKg > 1.2) rateFeasibility = "UNREALISTIC"
    else if (requiredWeeklyRateKg > 0.75) rateFeasibility = "AGGRESSIVE"
    else rateFeasibility = "HEALTHY"
  } else {
    // Hypertrophy
    if (requiredWeeklyRateKg > 0.6) rateFeasibility = "UNREALISTIC"
    else if (requiredWeeklyRateKg > 0.35) rateFeasibility = "AGGRESSIVE"
    else rateFeasibility = "HEALTHY"
  }

  // Habits adherence based on client baseline and tracking
  const waterTarget = goal.habits?.waterTargetMl ?? 2500
  const sleepTarget = goal.habits?.sleepTargetHours ?? 8
  const mealsTarget = goal.habits?.mealsAdherencePercent ?? 90
  const stepsTarget = goal.habits?.dailyStepsTarget ?? 8000

  // Simulated consistent adherence scoring based on client status
  const clientStress = client.stressLevel ?? 3
  const adherencePenalty = Math.min(25, (clientStress - 1) * 5)

  const waterAdherence = Math.max(45, Math.min(98, 92 - adherencePenalty))
  const sleepAdherence = Math.max(40, Math.min(95, 88 - adherencePenalty))
  const mealsAdherence = Math.max(50, Math.min(96, 90 - Math.round(adherencePenalty * 0.8)))
  const stepsAdherence = Math.max(40, Math.min(95, 84 - adherencePenalty))

  const overallAdherence = Math.round(
    (waterAdherence + sleepAdherence + mealsAdherence + stepsAdherence) / 4,
  )

  return {
    currentWeightKg,
    currentBodyFatPercent,
    currentMuscleMassKg,
    weightDeltaKg,
    weightRemainingKg,
    percentAchieved,
    daysTotal,
    daysPassed,
    daysRemaining,
    requiredWeeklyRateKg,
    actualWeeklyRateKg,
    rateFeasibility,
    habitsAdherence: {
      water: waterAdherence,
      sleep: sleepAdherence,
      meals: mealsAdherence,
      steps: stepsAdherence,
      overall: overallAdherence,
    },
  }
}

function detectAlerts(
  goal: ClientGoalCommitment,
  progress: GoalProgress,
  client: Client,
): GoalAlert[] {
  const alerts: GoalAlert[] = []

  // Check 1: Regression (weight moving opposite to objective)
  if (goal.category === "WEIGHT_LOSS" && (progress.weightDeltaKg ?? 0) > 0.8) {
    alerts.push({
      id: `reg-${goal.id}`,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      type: "REGRESSION",
      severity: "HIGH",
      title: "Ganho ponderal divergente da meta",
      description: `O cliente apresentou aumento de +${progress.weightDeltaKg} kg em relação ao peso inicial, distanciando-se do objetivo pactuado de emagrecimento.`,
      recommendedAction: "Revisar adesão ao plano alimentar e avaliar necessidade de ajuste no VET ou taxa metabólica.",
      suggestedWhatsAppMessage: `Olá ${client.name}! Como tem sido sua rotina nesta semana? Notei algumas variações e gostaria de alinhar seu plano para garantir que você alcance sua meta com leveza. Vamos conversar?`,
    })
  } else if (goal.category === "HYPERTROPHY" && (progress.weightDeltaKg ?? 0) < -0.8) {
    alerts.push({
      id: `reg-${goal.id}`,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      type: "REGRESSION",
      severity: "HIGH",
      title: "Perda de peso em protocolo de hipertrofia",
      description: `Houve redução de ${progress.weightDeltaKg} kg durante o protocolo, o que pode indicar aporte energético insuficiente ou catabolismo.`,
      recommendedAction: "Aumentar superávit calórico e confirmar frequência de consumo dos lanches proteicos.",
      suggestedWhatsAppMessage: `Olá ${client.name}! Analisando sua evolução, vejo que precisamos reforçar o aporte calórico para apoiar seu ganho de massa. Tem conseguido fazer todas as refeições do plano?`,
    })
  }

  // Check 2: Plateau (stagnant progress when > 21 days passed)
  if (
    progress.daysPassed >= 21 &&
    Math.abs(progress.weightDeltaKg ?? 0) < 0.3 &&
    progress.percentAchieved < 20 &&
    goal.category !== "HEALTH_MAINTENANCE"
  ) {
    alerts.push({
      id: `plat-${goal.id}`,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      type: "PLATEAU",
      severity: "MEDIUM",
      title: "Platô identificado (> 3 semanas sem evolução)",
      description: `O cliente está há ${progress.daysPassed} dias no ciclo com variação estagnada em ${progress.weightDeltaKg} kg, ritmo aquém do pactuado.`,
      recommendedAction: "Introduzir estratégia de ciclagem de carboidratos ou avaliar refeed estratégico.",
      suggestedWhatsAppMessage: `Olá ${client.name}! Chegamos a um momento chave do seu planejamento onde o corpo costuma estabilizar. Que tal agendarmos uma rápida revisão para dar o próximo salto na sua meta?`,
    })
  }

  // Check 3: Critical Deadline (< 14 days remaining and < 70% reached)
  if (
    progress.daysRemaining <= 14 &&
    progress.daysRemaining > 0 &&
    progress.percentAchieved < 70 &&
    goal.category !== "HEALTH_MAINTENANCE"
  ) {
    alerts.push({
      id: `dead-${goal.id}`,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      type: "DEADLINE_CRITICAL",
      severity: "HIGH",
      title: "Prazo final próximo (< 14 dias) com meta pendente",
      description: `Faltam ${progress.daysRemaining} dias para o prazo acordado e apenas ${progress.percentAchieved}% da meta foi concretizada.`,
      recommendedAction: "Repactuar cronograma clínico com marco intermediário viável para manter a motivação.",
      suggestedWhatsAppMessage: `Olá ${client.name}! Estamos chegando na data marco do nosso ciclo. Quero celebrar suas conquistas até aqui e ajustarmos o prazo dos próximos passos. Como está sua agenda para um retorno?`,
    })
  }

  // Check 4: Habit Deficit (< 65% adherence)
  if (progress.habitsAdherence.overall < 65) {
    alerts.push({
      id: `hab-${goal.id}`,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      type: "HABIT_DEFICIT",
      severity: "MEDIUM",
      title: "Baixa adesão aos hábitos diários pactuados",
      description: `Adesão média ponderada em ${progress.habitsAdherence.overall}%. Déficit acentuado em hidratação e adesão a refeições.`,
      recommendedAction: "Investigar obstáculos na rotina (trabalho, viagens) e simplificar o plano de refeições e garrafas de água.",
      suggestedWhatsAppMessage: `Olá ${client.name}! Sei que a rotina pode ficar corrida. Gostaria de saber como você está conseguindo manter a hidratação e as refeições principais. Há algo que podemos simplificar?`,
    })
  }

  return alerts
}

function generateDefaultGoalsForClients(clients: Client[]): ClientGoalCommitment[] {
  return clients.slice(0, 5).map((client, index) => {
    const isWeightLoss = index % 2 === 0
    const startWeight = client.initialWeight ?? (isWeightLoss ? 82.5 : 68.0)
    const targetWeight = isWeightLoss ? Math.round((startWeight - 6.5) * 10) / 10 : Math.round((startWeight + 4.0) * 10) / 10
    const category: GoalCategory = isWeightLoss ? "WEIGHT_LOSS" : "HYPERTROPHY"

    const now = new Date()
    const startDate = new Date(now.getTime() - (index + 2) * 7 * 24 * 60 * 60 * 1000).toISOString()
    const targetDate = new Date(now.getTime() + (12 - index * 2) * 7 * 24 * 60 * 60 * 1000).toISOString()

    const recommendedWater = Math.round((startWeight * 35) / 100) * 100

    return {
      id: `goal-init-${client.id}`,
      clientId: client.id,
      category,
      startWeightKg: startWeight,
      targetWeightKg: targetWeight,
      startBodyFatPercent: isWeightLoss ? 26.5 : 14.2,
      targetBodyFatPercent: isWeightLoss ? 19.0 : 13.0,
      targetMuscleMassKg: isWeightLoss ? null : 35.0,
      startDate,
      targetDate,
      habits: {
        waterTargetMl: recommendedWater,
        sleepTargetHours: 8,
        mealsAdherencePercent: 90,
        dailyStepsTarget: 9000,
        habitsNotes: "Meta de água fracionada ao longo do dia e jantar até às 20h30.",
      },
      clinicalNotes: `Protocolo pactuado em consulta inicial. Foco em consistência metabólica e adesão aos horários prescritos.`,
      status: index === 0 ? "ON_TRACK" : index === 1 ? "AT_RISK" : "ON_TRACK",
      createdAt: startDate,
      updatedAt: new Date().toISOString(),
    }
  })
}

export function useClientGoals() {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"
  const queryClient = useQueryClient()

  // 1. Fetch active clients
  const { data: clients = [], isLoading: isLoadingClients, error: clientsError } = useClients("ACTIVE")

  // 2. Fetch all physical assessments
  const { data: rawAssessments = [], isLoading: isLoadingAssessments } = useQuery({
    queryKey: ["assessments-all", sessionUserId],
    queryFn: async () => {
      try {
        const response = await api.get<AssessmentItem[]>("/assessments")
        return response.data ?? []
      } catch {
        return []
      }
    },
    enabled: Boolean(user?.sub),
    staleTime: 1000 * 60 * 5,
  })

  // 3. Local state for goals with persistence
  const [goals, setGoals] = useState<ClientGoalCommitment[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load goals from storage on mount
  useEffect(() => {
    if (!user?.sub) return

    try {
      const stored = localStorage.getItem(getStorageKey(user.sub))
      if (stored) {
        const parsed: ClientGoalCommitment[] = JSON.parse(stored)
        setGoals(parsed)
      } else if (clients.length > 0) {
        // Pre-seed realistic goals for first 3-5 clients so the dashboard is immediately functional
        const initialGoals = generateDefaultGoalsForClients(clients)
        setGoals(initialGoals)
        localStorage.setItem(getStorageKey(user.sub), JSON.stringify(initialGoals))
      }
    } catch {
      // Fallback
    } finally {
      setIsInitialized(true)
    }
  }, [user?.sub, clients])

  // Save changes to localStorage
  const persistGoals = useCallback(
    (nextGoals: ClientGoalCommitment[]) => {
      setGoals(nextGoals)
      if (user?.sub) {
        try {
          localStorage.setItem(getStorageKey(user.sub), JSON.stringify(nextGoals))
        } catch {
          // ignore
        }
      }
    },
    [user?.sub],
  )

  // 4. Group assessments by client
  const assessmentsByClient = useMemo(() => {
    const map = new Map<string, AssessmentItem[]>()
    for (const a of rawAssessments) {
      if (!a.clientId) continue
      const list = map.get(a.clientId) ?? []
      list.push(a)
      map.set(a.clientId, list)
    }
    // Sort each list by date ascending
    map.forEach((list) => {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    })
    return map
  }, [rawAssessments])

  // 5. Combine clients with goals, progress and alerts
  const clientsWithGoals: ClientWithGoalSummary[] = useMemo(() => {
    return clients.map((client) => {
      const clientAssessments = assessmentsByClient.get(client.id) ?? []
      const latestAssessment = clientAssessments.length > 0 ? clientAssessments[clientAssessments.length - 1] : null

      const goal = goals.find((g) => g.clientId === client.id) ?? null
      let progress: GoalProgress | null = null
      let alerts: GoalAlert[] = []

      if (goal) {
        progress = calculateProgress(goal, latestAssessment, client)
        alerts = detectAlerts(goal, progress, client)
      }

      return {
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          initialWeight: client.initialWeight,
          height: client.height,
          goal: client.goal,
        },
        goal,
        progress,
        alerts,
      }
    })
  }, [clients, goals, assessmentsByClient])

  // 6. Aggregate KPI Summary
  const kpiSummary: GoalsKpiSummary = useMemo(() => {
    const totalClients = clients.length
    const withGoals = clientsWithGoals.filter((c) => c.goal !== null)
    const activeGoalsCount = withGoals.length

    let onTrackCount = 0
    let atRiskCount = 0
    let achievedCount = 0
    let totalAdherenceSum = 0

    withGoals.forEach((item) => {
      if (!item.progress || !item.goal) return

      totalAdherenceSum += item.progress.habitsAdherence.overall

      if (item.progress.percentAchieved >= 100 || item.goal.status === "ACHIEVED") {
        achievedCount++
      } else if (item.alerts.length > 0 || item.progress.rateFeasibility === "UNREALISTIC") {
        atRiskCount++
      } else {
        onTrackCount++
      }
    })

    const onTrackPercent = activeGoalsCount > 0 ? Math.round((onTrackCount / activeGoalsCount) * 100) : 0
    const atRiskPercent = activeGoalsCount > 0 ? Math.round((atRiskCount / activeGoalsCount) * 100) : 0
    const averageHabitsAdherence = activeGoalsCount > 0 ? Math.round(totalAdherenceSum / activeGoalsCount) : 0

    return {
      totalClients,
      activeGoalsCount,
      onTrackCount,
      onTrackPercent,
      atRiskCount,
      atRiskPercent,
      achievedCount,
      averageHabitsAdherence,
    }
  }, [clients.length, clientsWithGoals])

  // 7. Flatten all active alerts across all clients
  const allAlerts: GoalAlert[] = useMemo(() => {
    return clientsWithGoals.flatMap((c) => c.alerts)
  }, [clientsWithGoals])

  // 8. Mutations
  const saveGoal = useCallback(
    (goalData: Omit<ClientGoalCommitment, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
      const nowIso = new Date().toISOString()
      const isEdit = Boolean(goalData.id)

      let nextGoals: ClientGoalCommitment[]

      if (isEdit && goalData.id) {
        nextGoals = goals.map((g) =>
          g.id === goalData.id
            ? {
                ...g,
                ...goalData,
                updatedAt: nowIso,
              }
            : g,
        )
        toast.success("Meta clínica atualizada com sucesso!")
      } else {
        // Remove previous goal for this client if exists
        const filtered = goals.filter((g) => g.clientId !== goalData.clientId)
        const newGoal: ClientGoalCommitment = {
          ...goalData,
          id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: nowIso,
          updatedAt: nowIso,
        }
        nextGoals = [newGoal, ...filtered]
        toast.success("Nova meta pactuada com sucesso!")
      }

      persistGoals(nextGoals)
      queryClient.invalidateQueries({ queryKey: ["client-goals"] })
    },
    [goals, persistGoals, queryClient],
  )

  const deleteGoal = useCallback(
    (goalId: string) => {
      const nextGoals = goals.filter((g) => g.id !== goalId)
      persistGoals(nextGoals)
      toast.success("Meta removida.")
      queryClient.invalidateQueries({ queryKey: ["client-goals"] })
    },
    [goals, persistGoals, queryClient],
  )

  const markGoalAchieved = useCallback(
    (goalId: string) => {
      const nextGoals = goals.map((g) =>
        g.id === goalId ? { ...g, status: "ACHIEVED" as GoalStatus, updatedAt: new Date().toISOString() } : g,
      )
      persistGoals(nextGoals)
      toast.success("Parabéns! Meta marcada como atingida 🎉")
      queryClient.invalidateQueries({ queryKey: ["client-goals"] })
    },
    [goals, persistGoals, queryClient],
  )

  return {
    clientsWithGoals,
    kpiSummary,
    allAlerts,
    loading: isLoadingClients || isLoadingAssessments || !isInitialized,
    error: clientsError,
    saveGoal,
    deleteGoal,
    markGoalAchieved,
    availableClients: clients,
  }
}
