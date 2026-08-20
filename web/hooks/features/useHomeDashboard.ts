import { useEffect } from "react"
import { toast } from "sonner"
import { useUsers } from "@/hooks/features/useUsers"

export const useHomeDashboard = () => {
  const { users: patients, loading, error } = useUsers()

  useEffect(() => {
    if (error) toast.error("Erro ao carregar os dados do painel.")
  }, [error])

  return { patients, patientsCount: patients.length, loading }
}
