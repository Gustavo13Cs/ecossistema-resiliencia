import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { MealLogStatus } from './useMealLog'

export type MealLogEntry = {
  id: string
  loggedAt: string
  status: MealLogStatus
  notes: string | null
  meal: { name: string; time: string | null }
}

export type MealAdherenceStats = {
  total: number
  followedPct: number
  substitutedPct: number
  skippedPct: number
  weekAdherencePct: number
  byMeal: Record<string, { total: number; followed: number; substituted: number; skipped: number }>
}

function calcStats(logs: MealLogEntry[]): MealAdherenceStats {
  const total = logs.length
  if (total === 0) {
    return { total: 0, followedPct: 0, substitutedPct: 0, skippedPct: 0, weekAdherencePct: 0, byMeal: {} }
  }

  const followed = logs.filter(l => l.status === 'FOLLOWED').length
  const substituted = logs.filter(l => l.status === 'SUBSTITUTED').length
  const skipped = logs.filter(l => l.status === 'SKIPPED').length

  // Adesão da semana (FOLLOWED + SUBSTITUTED / total, excluindo os pulados)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const weekLogs = logs.filter(l => new Date(l.loggedAt) >= weekAgo)
  const weekOk = weekLogs.filter(l => l.status !== 'SKIPPED').length
  const weekAdherencePct = weekLogs.length > 0
    ? Math.round((weekOk / weekLogs.length) * 100)
    : 0

  // Adesão por nome de refeição
  const byMeal: MealAdherenceStats['byMeal'] = {}
  for (const log of logs) {
    const name = log.meal.name
    if (!byMeal[name]) byMeal[name] = { total: 0, followed: 0, substituted: 0, skipped: 0 }
    byMeal[name].total++
    if (log.status === 'FOLLOWED') byMeal[name].followed++
    else if (log.status === 'SUBSTITUTED') byMeal[name].substituted++
    else byMeal[name].skipped++
  }

  return {
    total,
    followedPct: Math.round((followed / total) * 100),
    substitutedPct: Math.round((substituted / total) * 100),
    skippedPct: Math.round((skipped / total) * 100),
    weekAdherencePct,
    byMeal,
  }
}

export function useMealLogs(patientId: string | undefined) {
  const [logs, setLogs] = useState<MealLogEntry[]>([])
  const [stats, setStats] = useState<MealAdherenceStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    api.get(`/meal-logs/patient/${patientId}`)
      .then(res => {
        setLogs(res.data)
        setStats(calcStats(res.data))
      })
      .catch(err => setError(err?.response?.data?.message || 'Erro ao carregar logs de dieta'))
      .finally(() => setLoading(false))
  }, [patientId])

  return { logs, stats, loading, error }
}
