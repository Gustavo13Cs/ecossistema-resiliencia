import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export type WorkoutLogSet = {
  id: string
  setNumber: number
  repsActual: number
  weightKg: number | null
  exercise: { name: string }
}

export type WorkoutLogEntry = {
  id: string
  executedAt: string
  pse: number | null
  notes: string | null
  workout: { title: string }
  split: { name: string; focus: string | null }
  sets: WorkoutLogSet[]
}

export type WorkoutLogMetrics = {
  totalSessions: number
  weekSessions: number
  avgPse: number | null
  streak: number
}

function calcMetrics(logs: WorkoutLogEntry[]): WorkoutLogMetrics {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const weekSessions = logs.filter(l => new Date(l.executedAt) >= weekAgo).length

  const pseValues = logs.filter(l => l.pse != null).map(l => l.pse as number)
  const avgPse = pseValues.length > 0
    ? Math.round((pseValues.reduce((a, b) => a + b, 0) / pseValues.length) * 10) / 10
    : null

  // Calcula streak de dias consecutivos com treino
  let streak = 0
  const daySet = new Set(logs.map(l => new Date(l.executedAt).toDateString()))
  const today = new Date()
  for (let i = 0; i < 60; i++) {
    const day = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    if (daySet.has(day.toDateString())) streak++
    else if (i > 0) break
  }

  return { totalSessions: logs.length, weekSessions, avgPse, streak }
}

export function useWorkoutLogs(patientId: string | undefined) {
  const [logs, setLogs] = useState<WorkoutLogEntry[]>([])
  const [metrics, setMetrics] = useState<WorkoutLogMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    api.get(`/workout-logs/patient/${patientId}`)
      .then(res => {
        setLogs(res.data)
        setMetrics(calcMetrics(res.data))
      })
      .catch(err => setError(err?.response?.data?.message || 'Erro ao carregar logs de treino'))
      .finally(() => setLoading(false))
  }, [patientId])

  return { logs, metrics, loading, error }
}
