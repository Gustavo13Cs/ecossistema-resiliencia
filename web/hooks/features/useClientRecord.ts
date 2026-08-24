import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export function useClientRecord(clientId?: string) {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"
  const enabled = Boolean(user?.sub && clientId)

  const clientQuery = useQuery({
    queryKey: queryKeys.client(sessionUserId, clientId ?? "missing"),
    queryFn: async () => {
      try {
        const res = await api.get<any>(`/clients/${clientId}`)
        return res.data
      } catch {
        const res = await api.get<any>(`/users/${clientId}`)
        return res.data
      }
    },
    enabled,
  })

  const dietQuery = useQuery({
    queryKey: queryKeys.diet(sessionUserId, clientId ?? "missing"),
    queryFn: async () => {
      try {
        return (await api.get<any>(`/diet-plans/user/${clientId}/active`)).data
      } catch {
        return null
      }
    },
    enabled,
  })

  const dietHistoryQuery = useQuery({
    queryKey: queryKeys.dietHistory(sessionUserId, clientId ?? "missing"),
    queryFn: async () => {
      try {
        return (await api.get<any[]>(`/diet-plans/user/${clientId}/history`)).data ?? []
      } catch {
        return []
      }
    },
    enabled,
  })

  const workoutQuery = useQuery({
    queryKey: ["workout", sessionUserId, clientId],
    queryFn: async () => {
      try {
        return (await api.get<any>(`/workouts/user/${clientId}/active`)).data
      } catch {
        return null
      }
    },
    enabled,
  })

  const rehabQuery = useQuery({
    queryKey: ["rehab", sessionUserId, clientId],
    queryFn: async () => {
      try {
        return (await api.get<any>(`/rehab-plans/user/${clientId}/active`)).data
      } catch {
        return null
      }
    },
    enabled,
  })

  const supplementQuery = useQuery({
    queryKey: ["supplement", sessionUserId, clientId],
    queryFn: async () => {
      try {
        return (await api.get<any>(`/supplements/user/${clientId}/active`)).data
      } catch {
        return null
      }
    },
    enabled,
  })

  const assessmentsQuery = useQuery({
    queryKey: queryKeys.assessments(sessionUserId, clientId ?? "missing"),
    queryFn: async () => (await api.get<any[]>(`/assessments/user/${clientId}`)).data ?? [],
    enabled,
  })

  const physioAssessmentsQuery = useQuery({
    queryKey: ["physio-assessments", sessionUserId, clientId],
    queryFn: async () => (await api.get<any[]>(`/physio-assessments/user/${clientId}`)).data ?? [],
    enabled,
  })

  const anamnesesQuery = useQuery({
    queryKey: queryKeys.anamneses(sessionUserId, clientId ?? "missing"),
    queryFn: async () => (await api.get<any[]>(`/anamneses/user/${clientId}`)).data ?? [],
    enabled,
  })

  const consultationNotesQuery = useQuery({
    queryKey: queryKeys.consultationNotes(sessionUserId, clientId ?? "missing"),
    queryFn: async () => (await api.get<any[]>(`/consultation-notes/patient/${clientId}`)).data ?? [],
    enabled,
  })

  const labExamsQuery = useQuery({
    queryKey: ["lab-exams", sessionUserId, clientId],
    queryFn: async () => (await api.get<any[]>(`/lab-exams/patient/${clientId}`)).data ?? [],
    enabled,
  })

  return {
    client: clientQuery.data ?? null,
    activeDiet: dietQuery.data ?? null,
    dietHistory: dietHistoryQuery.data ?? [],
    activeWorkout: workoutQuery.data ?? null,
    activeRehab: rehabQuery.data ?? null,
    activeSupplement: supplementQuery.data ?? null,
    assessments: assessmentsQuery.data ?? [],
    physioAssessments: physioAssessmentsQuery.data ?? [],
    anamneses: anamnesesQuery.data ?? [],
    consultationNotes: consultationNotesQuery.data ?? [],
    labExams: labExamsQuery.data ?? [],
    loading: clientQuery.isPending,
    clientError: clientQuery.error,
    refetchAll: () => {
      clientQuery.refetch()
      dietQuery.refetch()
      dietHistoryQuery.refetch()
      workoutQuery.refetch()
      rehabQuery.refetch()
      supplementQuery.refetch()
      assessmentsQuery.refetch()
      physioAssessmentsQuery.refetch()
      anamnesesQuery.refetch()
      consultationNotesQuery.refetch()
      labExamsQuery.refetch()
    },
  }
}
