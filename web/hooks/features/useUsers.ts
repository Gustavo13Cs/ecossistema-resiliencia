import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export interface UserListItem {
  id: string
  name: string
  email?: string
  [key: string]: any
}

export function useUsers() {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"
  const query = useQuery({
    queryKey: queryKeys.users(sessionUserId),
    queryFn: async ({ signal }) => {
      const response = await api.get<UserListItem[]>("/users", { signal })
      return response.data ?? []
    },
    enabled: Boolean(user?.sub),
  })

  return {
    users: query.data ?? [],
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
