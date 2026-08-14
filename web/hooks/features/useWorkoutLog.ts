import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export type ExerciseSetInput = {
  exerciseId: string
  exerciseName: string
  plannedSets: string
  plannedReps: string
  sets: { setNumber: number; repsActual: number; weightKg: number | null }[]
}

export function useWorkoutLog(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false)

  const submitLog = async (payload: {
    workoutId: string
    splitId: string
    pse: number
    notes: string
    exercises: ExerciseSetInput[]
  }) => {
    setLoading(true)
    try {
      // Achata os sets de todos os exercícios em uma lista única
      const sets = payload.exercises.flatMap((ex) =>
        ex.sets.map((s) => ({
          exerciseId: ex.exerciseId,
          setNumber: s.setNumber,
          repsActual: s.repsActual,
          weightKg: s.weightKg ?? undefined,
        }))
      )

      await api.post('/workout-logs', {
        workoutId: payload.workoutId,
        splitId: payload.splitId,
        pse: payload.pse,
        notes: payload.notes || undefined,
        sets,
      })

      toast.success('Treino registrado! Continue evoluindo! 💪')
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao registrar treino.')
    } finally {
      setLoading(false)
    }
  }

  return { submitLog, loading }
}
