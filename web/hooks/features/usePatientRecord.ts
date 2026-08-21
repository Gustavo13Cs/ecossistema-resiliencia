import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export function usePatientRecord(patientId?: string) {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"
  const enabled = Boolean(user?.sub && patientId)
  const isNutri = user?.role === 'NUTRITIONIST' || user?.role === 'ADMIN'

  // These requests intentionally survive a temporary observer unmount so a
  // consecutive route can reuse the in-flight promise instead of duplicating it.
  const patientQuery = useQuery({ queryKey: queryKeys.patient(sessionUserId, patientId ?? "missing"), queryFn: async () => (await api.get<any>(`/users/${patientId}`)).data, enabled })
  const assessmentsQuery = useQuery({ queryKey: queryKeys.assessments(sessionUserId, patientId ?? "missing"), queryFn: async () => (await api.get<any[]>(`/assessments/user/${patientId}`)).data ?? [], enabled })
  const anamnesesQuery = useQuery({ queryKey: queryKeys.anamneses(sessionUserId, patientId ?? "missing"), queryFn: async () => (await api.get<any[]>(`/anamneses/user/${patientId}`)).data ?? [], enabled })
  const consultationNotesQuery = useQuery({ queryKey: queryKeys.consultationNotes(sessionUserId, patientId ?? "missing"), queryFn: async () => (await api.get<any[]>(`/consultation-notes/patient/${patientId}`)).data ?? [], enabled: enabled && isNutri })
  const dietHistoryQuery = useQuery({ queryKey: queryKeys.dietHistory(sessionUserId, patientId ?? "missing"), queryFn: async () => (await api.get<any[]>(`/diet-plans/user/${patientId}/history`)).data ?? [], enabled: enabled && isNutri })

  return {
    patient: patientQuery.data ?? null,
    assessments: assessmentsQuery.data ?? [],
    anamneses: anamnesesQuery.data ?? [],
    consultationNotes: consultationNotesQuery.data ?? [],
    dietHistory: dietHistoryQuery.data ?? [],
    loading: patientQuery.isPending,
    patientError: patientQuery.error,
  }
}

