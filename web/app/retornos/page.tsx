"use client"

import { CalendarClock } from "lucide-react"
import { FeaturePlaceholder } from "@/components/features/placeholder/FeaturePlaceholder"

export default function RetornosPage() {
  return (
    <FeaturePlaceholder
      title="Gestão de Retornos"
      subtitle="Acompanhamento"
      description="Monitoramento proativo do ciclo de consultas de retorno e reavaliações, evitando evasão de clientes e mantendo a continuidade do tratamento."
      icon={CalendarClock}
      plannedCapabilities={[
        "Fila de clientes com retorno previsto para os próximos 7/15/30 dias",
        "Alertas de clientes em atraso ou sem consulta marcada",
        "Disparo rápido de mensagens de agendamento",
        "Histórico de periodicidade entre retornos",
      ]}
    />
  )
}
