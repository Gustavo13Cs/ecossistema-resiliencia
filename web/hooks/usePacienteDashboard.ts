import { useState, useEffect } from "react"
import { api } from "@/lib/api"

// 1. AS INTERFACES REAIS (Fim do 'any')
export interface Meal {
  id: string
  name: string
  time: string | null
  notes?: string | null
}

export interface DietPlan {
  id: string
  title: string
  goal: string
  targetKcal?: number | null
  notes?: string | null
  meals: Meal[]
}

export interface UserData {
  id: string
  name: string
  initialWeight?: number | null
}

// 2. A LÓGICA DE NEGÓCIO ISOLADA
export function usePacienteDashboard(userId?: string) {
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [nextMeal, setNextMeal] = useState<Meal | null>(null)
  const [waterGoal, setWaterGoal] = useState<number | null>(null) // Estado nulo explícito
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null) // Feedback de erro explícito

  useEffect(() => {
    if (!userId) return

    let isMounted = true // Previne memory leaks se o componente desmontar rápido

    async function fetchDashboardData() {
      setLoading(true)
      setError(null)

      try {
        // Fetch Paralelo para máxima performance
        const [userRes, dietRes] = await Promise.allSettled([
          api.get<UserData>(`/users/${userId}`),
          api.get<DietPlan>(`/diet-plans/user/${userId}/active`)
        ])

        if (!isMounted) return

        // --- TRATAMENTO DE USUÁRIO E ÁGUA ---
        if (userRes.status === 'fulfilled' && userRes.value.data) {
          const weight = userRes.value.data.initialWeight
          if (weight && weight > 0) {
            setWaterGoal(Number(((weight * 35) / 1000).toFixed(1)))
          } else {
            setWaterGoal(null) // O paciente não tem peso, não assumimos nada.
          }
        }

        // --- TRATAMENTO DE DIETA E PRÓXIMA REFEIÇÃO ---
        if (dietRes.status === 'fulfilled' && dietRes.value.data) {
          const dieta = dietRes.value.data
          setDietPlan(dieta)

          if (dieta.meals && dieta.meals.length > 0) {
            const agora = new Date()
            const minutosAtuais = agora.getHours() * 60 + agora.getMinutes()

            const refeicoesOrdenadas = [...dieta.meals].sort((a, b) => {
              const minA = a.time ? parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]) : 0
              const minB = b.time ? parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]) : 0
              return minA - minB
            })

            const proxima = refeicoesOrdenadas.find((meal) => {
              if (!meal.time) return false
              const [h, m] = meal.time.split(':').map(Number)
              return (h * 60 + m) > minutosAtuais
            })

            setNextMeal(proxima || null)
          }
        } else if (dietRes.status === 'rejected' && dietRes.reason.response?.status !== 404) {
          // Se for 404, ele só não tem dieta. Se for outro erro, lançamos aviso.
          throw new Error("Falha ao carregar o plano alimentar.")
        }

      } catch (err) {
        if (isMounted) setError("Ocorreu um erro ao carregar os seus dados de saúde.")
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchDashboardData()

    return () => {
      isMounted = false
    }
  }, [userId])

  return { dietPlan, nextMeal, waterGoal, loading, error }
}