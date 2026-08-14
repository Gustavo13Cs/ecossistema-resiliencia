import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export type PatientExportData = {
  exportedAt: string
  patient: {
    id: string
    name: string
    email: string
    phone: string | null
    birthDate: string | null
    gender: string | null
    goal: string | null
    height: number | null
    initialWeight: number | null
    allergies: string | null
    pathologies: string | null
    exerciseType: string | null
    exerciseFrequency: string | null
    createdAt: string
  }
  activeDiet: {
    title: string
    goal: string | null
    targetKcal: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
    fiberG: number | null
    durationDays: number | null
    creator: { name: string; role: string } | null
    meals: Array<{
      id: string
      name: string
      time: string | null
      items: Array<{
        id: string
        quantity: number
        measure: string
        food: { name: string; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null } | null
      }>
    }>
  } | null
  activeWorkout: {
    title: string
    goal: string | null
    durationWeeks: number | null
    creator: { name: string; role: string } | null
    splits: Array<{
      id: string
      name: string
      focus: string | null
      exercises: Array<{
        id: string
        name: string
        sets: string
        reps: string
        rest: string | null
        notes: string | null
      }>
    }>
  } | null
  activeRehab: {
    title: string
    goal: string | null
    durationWeeks: number | null
    creator: { name: string; role: string } | null
    sessions: Array<{
      id: string
      name: string
      focus: string | null
      exercises: Array<{
        id: string
        name: string
        sets: string
        reps: string
        notes: string | null
      }>
    }>
  } | null
  lastAssessment: {
    date: string
    weight: number | null
    bodyFat: number | null
    muscleMass: number | null
    waist: number | null
    abdomen: number | null
    hips: number | null
    benchPress1RM: number | null
    squat1RM: number | null
    notes: string | null
  } | null
  lastLabExam: {
    date: string
    notes: string | null
    markers: Array<{ name: string; value: number; unit: string }>
  } | null
  lastAnamnesis: {
    clinicalHistory: string | null
    medications: string | null
    pathologies: string | null
    symptoms: string | null
    familyHistory: string | null
    bowelMovement: string | null
    waterIntake: number | null
    alcoholAndSmoking: string | null
    createdAt: string
  } | null
}

export function usePatientExport(patientId: string) {
  const [data, setData] = useState<PatientExportData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchExportData = async (): Promise<PatientExportData | null> => {
    setLoading(true)
    try {
      const res = await api.get(`/users/${patientId}/export`)
      setData(res.data)
      return res.data
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao carregar dados para exportação.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, fetchExportData }
}
