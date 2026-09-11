"use client"

import { FlaskConical } from "lucide-react"
import { FeaturePlaceholder } from "@/components/features/placeholder/FeaturePlaceholder"

export default function ExamesPage() {
  return (
    <FeaturePlaceholder
      title="Central de Exames Laboratoriais"
      subtitle="Acompanhamento"
      description="Visão consolidada de exames bioquímicos e laboratoriais solicitados e recebidos, com rastreamento de biomarcadores (lipidograma, glicemia, hemograma, tireoide)."
      icon={FlaskConical}
      plannedCapabilities={[
        "Filtro de exames por cliente e por data de coleta",
        "Comparativo longitudinal de marcadores com valores de referência",
        "Upload e armazenamento seguro de laudos em PDF",
        "Emissão de pedidos de exames laboratoriais padronizados",
      ]}
    />
  )
}
