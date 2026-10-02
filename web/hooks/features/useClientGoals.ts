"use client"

import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { toast } from "sonner"
import type { ClientGoalCommitment, ClientGoalInput, GoalProgress, GoalAlert, GoalsKpiSummary, ClientWithGoalSummary, RateFeasibility } from "@/types/goal"
import type { Client } from "@/types/client"

interface AssessmentItem {
  id: string
  clientId: string | null
  date: string
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
}

function calculateProgress(goal: ClientGoalCommitment, latest: AssessmentItem | null, client: Client): GoalProgress {
  const currentWeightKg = latest?.weight ?? null
  const startWeight = goal.startWeightKg ?? client.initialWeight ?? null
  const targetWeight = goal.targetWeightKg
  const weightDeltaKg = currentWeightKg !== null && startWeight !== null ? Math.round((currentWeightKg - startWeight) * 10) / 10 : null
  const weightRemainingKg = currentWeightKg !== null && targetWeight !== null ? Math.round((targetWeight - currentWeightKg) * 10) / 10 : null
  const start = new Date(goal.startDate).getTime()
  const target = new Date(goal.targetDate).getTime()
  const daysTotal = Math.max(1, Math.round((target - start) / 86400000))
  const daysPassed = Math.max(0, Math.round((Date.now() - start) / 86400000))
  const daysRemaining = Math.max(0, Math.round((target - Date.now()) / 86400000))
  const totalChange = startWeight !== null && targetWeight !== null ? targetWeight - startWeight : null
  const percentAchieved = goal.status === "ACHIEVED" ? 100 : totalChange !== null && Math.abs(totalChange) >= 0.1 && weightDeltaKg !== null
    ? Math.min(100, Math.max(0, Math.round(weightDeltaKg / totalChange * 100))) : 0
  const requiredWeeklyRateKg = Math.round(Math.abs(weightRemainingKg ?? totalChange ?? 0) / Math.max(0.5, daysRemaining / 7) * 100) / 100
  const actualWeeklyRateKg = latest?.weight != null && weightDeltaKg !== null ? Math.round(Math.abs(weightDeltaKg) / Math.max(0.5, daysPassed / 7) * 100) / 100 : null
  let rateFeasibility: RateFeasibility = "HEALTHY"
  if (goal.category === "HEALTH_MAINTENANCE") rateFeasibility = "MAINTAIN"
  else if (goal.category === "WEIGHT_LOSS") rateFeasibility = requiredWeeklyRateKg > 1.2 ? "UNREALISTIC" : requiredWeeklyRateKg > 0.75 ? "AGGRESSIVE" : "HEALTHY"
  else rateFeasibility = requiredWeeklyRateKg > 0.6 ? "UNREALISTIC" : requiredWeeklyRateKg > 0.35 ? "AGGRESSIVE" : "HEALTHY"
  return { currentWeightKg, currentBodyFatPercent: latest?.bodyFat ?? null, currentMuscleMassKg: latest?.muscleMass ?? null,
    weightDeltaKg, weightRemainingKg, percentAchieved, daysTotal, daysPassed, daysRemaining, requiredWeeklyRateKg,
    actualWeeklyRateKg, rateFeasibility, habitsAdherence: null }
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
  if (progress.habitsAdherence && progress.habitsAdherence.overall < 65) {
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

export function useClientGoals() {
  const { user } = useAuth()
  const sessionId = user?.sub ?? "anonymous"
  const cache = useQueryClient()
  const { data: clients = [], isLoading: clientsLoading, error: clientsError } = useClients("ACTIVE")
  const enabled = Boolean(user?.sub)
  const goalKey = queryKeys.clientGoals(sessionId)
  const goalsQuery = useQuery({ queryKey: goalKey, enabled, queryFn: async () => (await api.get<ClientGoalCommitment[]>("/client-goals")).data })
  const assessmentsQuery = useQuery({ queryKey: ["assessments-all", sessionId], enabled,
    queryFn: async () => (await api.get<AssessmentItem[]>("/assessments")).data })
  const goals = enabled ? goalsQuery.data ?? [] : []
  const assessments = enabled ? assessmentsQuery.data ?? [] : []
  const clientsWithGoals: ClientWithGoalSummary[] = useMemo(() => clients.map(client => {
    const goal = goals.find(entry => entry.clientId === client.id) ?? null
    const latest = assessments.filter(entry => entry.clientId === client.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null
    const progress = goal ? calculateProgress(goal, latest, client) : null
    const alerts = goal && progress && progress.weightDeltaKg !== null && latest?.weight != null && goal.status !== "ACHIEVED" ? detectAlerts(goal, progress, client) : []
    return { client, goal, progress, alerts }
  }), [clients, goals, assessments])
  const kpiSummary: GoalsKpiSummary = useMemo(() => {
    const withGoals = clientsWithGoals.filter(item => item.goal)
    const achievedCount = withGoals.filter(item => item.goal?.status === "ACHIEVED" || item.progress?.percentAchieved === 100).length
    const remaining = withGoals.filter(item => item.goal?.status !== "ACHIEVED" && item.progress?.percentAchieved !== 100)
    const atRiskCount = remaining.filter(item => item.alerts.length > 0 || item.goal?.status === "AT_RISK").length
    const onTrackCount = remaining.filter(item => item.alerts.length === 0 && item.goal?.status !== "AT_RISK" && item.progress?.currentWeightKg !== null).length
    const activeGoalsCount = withGoals.length
    return { totalClients: clients.length, activeGoalsCount, achievedCount, atRiskCount, onTrackCount,
      onTrackPercent: activeGoalsCount ? Math.round(onTrackCount / activeGoalsCount * 100) : 0,
      atRiskPercent: activeGoalsCount ? Math.round(atRiskCount / activeGoalsCount * 100) : 0, averageHabitsAdherence: null }
  }, [clients.length, clientsWithGoals])
  const allAlerts = clientsWithGoals.flatMap(item => item.alerts)
  const saveMutation = useMutation({ mutationFn: async (input: ClientGoalInput) => {
    if (!user?.sub) throw new Error("Sessão indisponível")
    const { category, status, startDate, targetDate, startWeightKg, targetWeightKg, startBodyFatPercent, targetBodyFatPercent, targetMuscleMassKg, clinicalNotes } = input
    const { waterTargetMl, sleepTargetHours, mealsAdherencePercent, dailyStepsTarget, habitsNotes } = input.habits
    return (await api.put<ClientGoalCommitment>(`/client-goals/${input.clientId}`, { category, status, startDate, targetDate,
      startWeightKg, targetWeightKg, startBodyFatPercent, targetBodyFatPercent, targetMuscleMassKg, clinicalNotes,
      habits: { waterTargetMl, sleepTargetHours, mealsAdherencePercent, dailyStepsTarget, habitsNotes } })).data
  } })
  const deleteMutation = useMutation({ mutationFn: async (clientId: string) => {
    if (!user?.sub) throw new Error("Sessão indisponível")
    await api.delete(`/client-goals/${clientId}`)
  } })
  const saveGoal = async (input: ClientGoalInput): Promise<ClientGoalCommitment> => {
    try {
      const saved = await saveMutation.mutateAsync(input)
      await cache.invalidateQueries({ queryKey: goalKey })
      toast.success("Meta clínica salva com sucesso!")
      return saved
    } catch (error) { toast.error("Não foi possível salvar a meta clínica."); throw error }
  }
  const deleteGoal = async (clientId: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(clientId)
      await cache.invalidateQueries({ queryKey: goalKey })
      toast.success("Meta removida.")
    } catch (error) { toast.error("Não foi possível remover a meta."); throw error }
  }
  const markGoalAchieved = async (clientId: string): Promise<ClientGoalCommitment> => {
    const goal = goals.find(entry => entry.clientId === clientId)
    if (!goal) { toast.error("Carregue a meta antes de alterá-la."); throw new Error("Meta indisponível") }
    return saveGoal({ ...goal, status: "ACHIEVED" })
  }
  return { clientsWithGoals, kpiSummary, allAlerts, availableClients: enabled ? clients : [],
    loading: enabled && (clientsLoading || goalsQuery.isPending || assessmentsQuery.isPending),
    error: clientsError ?? goalsQuery.error ?? assessmentsQuery.error,
    saving: saveMutation.isPending || deleteMutation.isPending, saveGoal, deleteGoal, markGoalAchieved }
}
