import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface PatientAlert {
  id: string
  type: 'INACTIVE_5_DAYS' | 'PLATEAU_3_WEEKS' | 'OVERTRAINING_RISK'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
  patient: { id: string; name: string; phone: string }
  createdAt: string
}

export const useProfessionalAlerts = () => {
  const [alerts, setAlerts] = useState<PatientAlert[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/alerts/dashboard')
        setAlerts(res.data)
      } catch (error) {
        toast.error("Erro ao carregar o painel UTI.")
      } finally {
        setLoadingAlerts(false)
      }
    }
    fetchAlerts()
  }, [])

  return { alerts, loadingAlerts }
}