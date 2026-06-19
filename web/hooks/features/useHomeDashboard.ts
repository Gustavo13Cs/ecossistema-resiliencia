import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export const useHomeDashboard = () => {
  const [patientsCount, setPatientsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get("/users")
        setPatientsCount(response.data.length || 0)
      } catch (error) {
        toast.error("Erro ao carregar os dados do painel.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return { patientsCount, loading }
}