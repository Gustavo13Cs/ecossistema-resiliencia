"use client"

import { Target } from "lucide-react"
import { FeaturePlaceholder } from "@/components/features/placeholder/FeaturePlaceholder"

export default function MetasPage() {
  return (
    <FeaturePlaceholder
      title="Metas Clínicas & Hábitos"
      subtitle="Acompanhamento"
      description="Definição de marcos quantitativos e qualitativos (consumo de água, passos diários, peso alvo, percentual de gordura) e acompanhamento do progresso dos clientes."
      icon={Target}
      plannedCapabilities={[
        "Metas de composição corporal com prazos estimados",
        "Metas de adesão diária a água, sono e refeições",
        "Painel de atingimento de metas da base de clientes",
        "Alertas de clientes distantes do objetivo pactuado",
      ]}
    />
  )
}
