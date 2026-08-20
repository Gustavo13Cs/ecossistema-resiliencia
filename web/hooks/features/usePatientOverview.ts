import { api } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { queryKeys } from "@/lib/query-keys"

export interface PatientOverview {
  patient: {
    id: string
    name: string
    goal?: string | null
    allergies?: string | null
    pathologies?: string | null
    height?: number | null
    initialWeight?: number | null
    gender?: string | null
    birthDate?: string | null
  }
  activeDietPlan: {
    id: string
    title: string
    goal: string
    targetKcal: number
    proteinG: number
    carbsG: number
    fatG: number
    createdAt: string
    creator?: { name: string; role: string }
  } | null
  activeWorkout: {
    id: string
    title: string
    goal?: string | null
    durationWeeks?: number | null
    createdAt: string
    creator?: { name: string; role: string }
    splits: { id: string; name: string; focus?: string | null }[]
  } | null
  activeRehabPlan: {
    id: string
    title: string
    goal?: string | null
    durationWeeks?: number | null
    createdAt: string
    creator?: { name: string; role: string }
  } | null
  latestAssessment: {
    id: string
    date: string
    weight?: number | null
    bodyFat?: number | null
    muscleMass?: number | null
    waist?: number | null
    abdomen?: number | null
  } | null
  previousAssessment: {
    weight?: number | null
    bodyFat?: number | null
    date: string
  } | null
  weightDelta: number | null
  latestLabExam: {
    id: string
    date: string
    notes?: string | null
    markers: { id: string; name: string; value: number; unit: string }[]
  } | null
  activeAlerts: {
    id: string
    type: string
    severity: string
    message: string
    createdAt: string
  }[]
  latestPhysioAssessment: {
    id: string
    date: string
    painLevel?: number | null
    chiefComplaint?: string | null
  } | null
  conflictWarning: {
    message: string
    physioDate: string
    painLevel: number
  } | null
  recentTimeline: {
    label: string
    date: string
    type: string
    author: string
  }[]
}

export function usePatientOverview(patientId?: string) {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: queryKeys.patientOverview(user?.sub ?? "anonymous", patientId ?? "missing"),
    queryFn: async () => (await api.get<PatientOverview>(`/users/${patientId}/overview`)).data,
    enabled: Boolean(user?.sub && patientId),
  })

  return {
    overview: query.data ?? null,
    loading: query.isPending,
    error: query.error && !query.data ? "Falha ao carregar a visão geral do paciente." : null,
  }
}
