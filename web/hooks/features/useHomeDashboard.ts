import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export const useHomeDashboard = () => {
  const [patients, setPatients] = useState<any[]>([])
  const [patientsCount, setPatientsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get("/users")
        const data = response.data || []
        setPatients(data)
        setPatientsCount(data.length)
      } catch (error) {
        toast.error("Erro ao carregar os dados do painel.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return { patients, patientsCount, loading }
}