"use client"

import { TrendingUp } from "lucide-react"
import { FeaturePlaceholder } from "@/components/features/placeholder/FeaturePlaceholder"

export default function EvolucaoPage() {
  return (
    <FeaturePlaceholder
      title="Evolução Clínica"
      subtitle="Atendimento"
      description="Visualização temporal agregada da evolução dos pacientes, cruzando peso, percentual de gordura, massa muscular e indicadores de adesão."
      icon={TrendingUp}
      plannedCapabilities={[
        "Gráficos comparativos de múltiplas avaliações",
        "Comparativo visual de fotos corporais antes e depois",
        "Linha do tempo de adesão às metas nutricionais",
        "Exportação de relatórios evolutivos para o cliente",
      ]}
    />
  )
}
