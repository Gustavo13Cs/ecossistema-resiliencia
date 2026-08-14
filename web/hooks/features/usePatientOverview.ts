import { useState, useEffect } from "react"
import { api } from "@/lib/api"

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
  const [overview, setOverview] = useState<PatientOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) return

    let isMounted = true

    const fetchOverview = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get<PatientOverview>(`/users/${patientId}/overview`)
        if (isMounted) setOverview(res.data)
      } catch (err: any) {
        if (isMounted) {
          setError("Falha ao carregar a visão geral do paciente.")
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchOverview()

    return () => { isMounted = false }
  }, [patientId])

  return { overview, loading, error }
}
