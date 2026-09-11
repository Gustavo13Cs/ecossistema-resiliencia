"use client"

import { Calendar } from "lucide-react"
import { FeaturePlaceholder } from "@/components/features/placeholder/FeaturePlaceholder"

export default function AgendaPage() {
  return (
    <FeaturePlaceholder
      title="Agenda Profissional"
      subtitle="Atendimento"
      description="Gerenciamento da rotina de atendimentos clínicos, agendamento de consultas, confirmações e tarefas diárias do profissional."
      icon={Calendar}
      plannedCapabilities={[
        "Calendário diário, semanal e mensal de consultas",
        "Confirmação e lembretes de atendimento",
        "Registro de tarefas e check-ins clínicos por paciente",
        "Integração direta com o prontuário do cliente",
      ]}
    />
  )
}
