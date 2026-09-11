import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export interface PhysicalAssessment {
  id: string
  clientId: string | null
  userId: string | null
  date: string
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
}

export function useClientAssessments(clientId: string) {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"

  const query = useQuery({
    queryKey: queryKeys.assessments(sessionUserId, clientId),
    queryFn: async () => {
      const response = await api.get<PhysicalAssessment[]>(`/assessments/client/${clientId}`)
      return response.data ?? []
    },
    enabled: Boolean(user?.sub && clientId),
  })

  return {
    assessments: query.data ?? [],
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
