"use client"

import { BarChart3 } from "lucide-react"
import { FeaturePlaceholder } from "@/components/features/placeholder/FeaturePlaceholder"

export default function RelatoriosPage() {
  return (
    <FeaturePlaceholder
      title="Relatórios & Métricas de Gestão"
      subtitle="Gestão"
      description="Painel gerencial para nutricionistas com indicadores de retenção, taxa de adesão a planos alimentares, volume de atendimentos e crescimento da base privada."
      icon={BarChart3}
      plannedCapabilities={[
        "Taxa de retenção e evasão de clientes por período",
        "Métricas de adesão a planos e check-ins",
        "Volume de novos clientes e prontuários ativos",
        "Exportação de dados consolidados em CSV/PDF",
      ]}
    />
  )
}
