import { useState, useEffect } from "react"
import { api } from "@/lib/api"

// 1. As tipagens rigorosas que vão acabar com aquele erro "any" da Imagem 2!
export interface Food {
  id: string
  name: string
}

export interface MealItem {
  id: string
  quantity: number
  measure: string
  notes?: string | null
  food?: Food
}

export interface Meal {
  id: string
  name: string
  time?: string | null
  notes?: string | null
  items: MealItem[]
}

export interface DietPlan {
  id: string
  title: string
  goal: string
  notes?: string | null
  meals: Meal[]
}

// 2. O Hook que faz a comunicação com o Backend
export function useDiet(userId?: string) {
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    let isMounted = true

    const fetchDiet = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get<DietPlan>(`/diet-plans/user/${userId}/active`)
        if (isMounted) setDietPlan(res.data)
      } catch (err: any) {
        if (isMounted) {
          if (err.response?.status === 404) {
            setDietPlan(null)
          } else {
            setError("Falha ao carregar o seu plano alimentar. Tente novamente mais tarde.")
          }
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchDiet()

    return () => { isMounted = false }
  }, [userId])

  return { dietPlan, loading, error }
}