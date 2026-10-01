import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

interface PatientAlert {
  id: string
  type: "INACTIVE_5_DAYS" | "PLATEAU_3_WEEKS" | "OVERTRAINING_RISK"
  severity: "HIGH" | "MEDIUM" | "LOW"
  message: string
  client: { id: string; name: string; phone: string | null }
  createdAt: string
}

export const useProfessionalAlerts = () => {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: queryKeys.professionalAlerts(user?.sub ?? "anonymous"),
    queryFn: async () => (await api.get<PatientAlert[]>("/alerts/dashboard")).data,
    enabled: Boolean(user?.sub) && user?.role === "PERSONAL",
  })

  useEffect(() => {
    if (query.error) toast.error("Erro ao carregar o painel UTI.")
  }, [query.error])

  return { alerts: query.data ?? [], loadingAlerts: query.isPending }
}
