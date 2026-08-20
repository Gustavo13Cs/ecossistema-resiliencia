import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { queryKeys } from "@/lib/query-keys"

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
  const { user } = useAuth()
  const query = useQuery({
    queryKey: queryKeys.diet(user?.sub ?? "anonymous", userId ?? "missing"),
    queryFn: async () => {
      try {
        return (await api.get<DietPlan>(`/diet-plans/user/${userId}/active`)).data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null
        throw error
      }
    },
    enabled: Boolean(user?.sub && userId),
  })

  return { dietPlan: query.data ?? null, loading: query.isPending, error: query.error ? "Falha ao carregar o seu plano alimentar. Tente novamente mais tarde." : null }
}
