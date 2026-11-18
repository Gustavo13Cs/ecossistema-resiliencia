"use client"

import { useEffect, useState } from "react"
import { Check, Copy, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { PersonalFollowUpItem } from "@/hooks/features/usePersonalFollowUps"

export interface PersonalFollowUpQuickMessageModalProps {
  item: PersonalFollowUpItem | null
  isOpen: boolean
  onClose: () => void
}

type MessageTemplateKey =
  | "workout_renewal"
  | "deload_week"
  | "reassessment"
  | "schedule_session"

function buildTemplateText(
  key: MessageTemplateKey,
  item: PersonalFollowUpItem,
): string {
  const firstName = item.client.name.split(" ")[0] || item.client.name
  const workoutTitle = item.activeWorkout?.title ?? "seu planejamento de treino"

  switch (key) {
    case "workout_renewal":
      return `Olá, ${firstName}! Tudo bem? Estamos chegando na reta final do bloco "${workoutTitle}". Quero alinhar com você como se sentiu nas últimas semanas para ajustarmos o próximo mesociclo de treinos. Qual o melhor horário para conversarmos?`
    case "deload_week":
      return `Olá, ${firstName}! Passando para lembrar que esta semana entramos na fase de Deload (recuperação regenerativa) da ficha "${workoutTitle}". Reduza o volume conforme indicado na planilha e mantenha repetições em reserva (RIR 4-5) para supercompensar antes do novo bloco!`
    case "reassessment":
      return `Olá, ${firstName}! Tudo ótimo? Já completamos o ciclo desde a sua última avaliação física e de força (1RM). Vamos agendar nossa nova bateria de medidas e testes para registrarmos sua evolução e calibrarmos as cargas do próximo bloco?`
    case "schedule_session":
      return `Olá, ${firstName}! Como está a rotina de treinos nesta semana? Vi que ainda não deixamos nossa próxima sessão/acompanhamento reservado na agenda. Me avise sua disponibilidade para garantirmos seu horário!`
  }
}

export function PersonalFollowUpQuickMessageModal({
  item,
  isOpen,
  onClose,
}: PersonalFollowUpQuickMessageModalProps) {
  const [templateKey, setTemplateKey] =
    useState<MessageTemplateKey>("workout_renewal")
  const [customText, setCustomText] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!item) return
    let initialKey: MessageTemplateKey = "workout_renewal"
    if (item.workoutCycleStatus === "DELOAD_WEEK") {
      initialKey = "deload_week"
    } else if (
      item.assessmentStatus === "NEVER_ASSESSED" ||
      item.assessmentStatus === "ASSESSMENT_OVERDUE"
    ) {
      initialKey = "reassessment"
    } else if (!item.nextAppointment) {
      initialKey = "schedule_session"
    }
    setTemplateKey(initialKey)
    setCustomText(buildTemplateText(initialKey, item))
    setCopied(false)
  }, [item])

  if (!item) return null

  const handleSelectTemplate = (nextKey: MessageTemplateKey) => {
    setTemplateKey(nextKey)
    setCustomText(buildTemplateText(nextKey, item))
    setCopied(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customText)
      setCopied(true)
      toast.success("Mensagem copiada para a área de transferência!")
    } catch {
      toast.error("Não foi possível copiar automaticamente.")
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="bg-[var(--sm-surface)] sm:max-w-lg">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-[var(--sm-ink)]">
              Mensagem Rápida · {item.client.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--sm-muted)]">
              Escolha um roteiro de acompanhamento do Personal e copie para enviar ao aluno.
            </DialogDescription>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(
            [
              ["workout_renewal", "Troca de Bloco"],
              ["deload_week", "Orientação de Deload"],
              ["reassessment", "Convocar Reavaliação"],
              ["schedule_session", "Agendar Sessão"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectTemplate(key)}
              className={`rounded-[var(--sm-radius-sm)] px-3 py-1.5 text-xs font-bold transition ${
                templateKey === key
                  ? "bg-[var(--sm-brand)] text-white"
                  : "bg-[var(--sm-surface-muted)] text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <Textarea
            aria-label="Texto da mensagem para o aluno"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="min-h-32 text-sm"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Fechar
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => void handleCopy()} className="gap-2">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiado!" : "Copiar mensagem"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
