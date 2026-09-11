"use client"

import { UtensilsCrossed } from "lucide-react"
import { FeaturePlaceholder } from "@/components/features/placeholder/FeaturePlaceholder"

export default function ReceitasPage() {
  return (
    <FeaturePlaceholder
      title="Banco de Receitas"
      subtitle="Nutrição"
      description="Biblioteca de preparações e receitas culinárias saudáveis categorizadas por objetivo (hipertrofia, emagrecimento, restrições alimentares) para enriquecer os planos."
      icon={UtensilsCrossed}
      plannedCapabilities={[
        "Criação e categorização de receitas com fotos",
        "Cálculo automático de macros e calorias por porção",
        "Associação direta de receitas às refeições do plano alimentar",
        "Filtros por alérgenos (sem glúten, sem lactose, vegano)",
      ]}
    />
  )
}
