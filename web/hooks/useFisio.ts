import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export interface RehabExercise {
  id: string
  name: string
  sets?: string | null
  reps?: string | null
  notes?: string | null
}

export interface RehabSession {
  id: string
  name: string 
  focus?: string | null 
  exercises: RehabExercise[]
}

export interface RehabPlan {
  id: string
  title: string
  goal?: string | null
  notes?: string | null 
  sessions: RehabSession[]
}

export function useFisio(userId?: string) {
  const [rehabPlan, setRehabPlan] = useState<RehabPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    let isMounted = true

    const fetchFisio = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get<RehabPlan>(`/rehab-plans/user/${userId}/active`)
        if (isMounted) setRehabPlan(res.data)
      } catch (err: any) {
        if (isMounted) {
          if (err.response?.status === 404) {
            setRehabPlan(null)
          } else {
            setError("Falha ao carregar o seu protocolo de reabilitação. Verifique a sua conexão.")
          }
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchFisio()

    return () => { isMounted = false }
  }, [userId])

  return { rehabPlan, loading, error }
}