import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export type MealLogStatus = 'FOLLOWED' | 'SUBSTITUTED' | 'SKIPPED'

export const MEAL_LOG_CONFIG: Record<MealLogStatus, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  FOLLOWED: {
    label: 'Segui o plano',
    emoji: '✅',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
  },
  SUBSTITUTED: {
    label: 'Substituí algum alimento',
    emoji: '🔄',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
  },
  SKIPPED: {
    label: 'Pulei a refeição',
    emoji: '❌',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-300',
  },
}

export function useMealLog(onSuccess?: (mealId: string, status: MealLogStatus) => void) {
  const [loading, setLoading] = useState(false)

  const submitLog = async (mealId: string, status: MealLogStatus, notes?: string) => {
    setLoading(true)
    try {
      await api.post('/meal-logs', { mealId, status, notes: notes || undefined })

      const config = MEAL_LOG_CONFIG[status]
      toast.success(`${config.emoji} ${config.label} registrado!`)
      onSuccess?.(mealId, status)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao registrar refeição.')
    } finally {
      setLoading(false)
    }
  }

  return { submitLog, loading }
}
