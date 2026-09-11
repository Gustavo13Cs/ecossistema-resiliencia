"use client"

import { Layers } from "lucide-react"
import { FeaturePlaceholder } from "@/components/features/placeholder/FeaturePlaceholder"

export default function ModelosPlanosPage() {
  return (
    <FeaturePlaceholder
      title="Modelos de Planos Alimentares"
      subtitle="Nutrição"
      description="Modelos reutilizáveis de cardápios (low carb, cetogênica, mediterrânea, hipercalórica) para acelerar a prescrição e padronizar condutas nutricionais."
      icon={Layers}
      plannedCapabilities={[
        "Templates pré-configurados por faixa calórica e objetivo",
        "Importação rápida para o prontuário de qualquer cliente",
        "Ajuste automático de porções mantendo as proporções de macros",
        "Versionamento e arquivamento de modelos próprios do profissional",
      ]}
    />
  )
}
