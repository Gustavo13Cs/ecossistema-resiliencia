import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export type AlertSummaryItem = {
  id: string
  type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
  createdAt: string
  patient: { id: string; name: string; phone: string }
}

export type DashboardSummary = {
  patientsCount: number
  activeAlertsCount: number
  highAlertsCount: number
  mediumAlertsCount: number
  recentAlerts: AlertSummaryItem[]
  inactivePatients: { id: string; name: string }[]
}

export const useHomeDashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/alerts/summary")
      .then(res => setSummary(res.data))
      .catch(() => {
        // Fallback gracioso se o endpoint falhar
        setSummary({
          patientsCount: 0,
          activeAlertsCount: 0,
          highAlertsCount: 0,
          mediumAlertsCount: 0,
          recentAlerts: [],
          inactivePatients: [],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  return { summary, loading }
}