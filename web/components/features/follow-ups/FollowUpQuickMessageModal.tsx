"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MessageSquare, ExternalLink, Sparkles, Send } from "lucide-react"
import type { ClientFollowUpSummary, QuickMessageTemplate } from "@/types/follow-up"

interface FollowUpQuickMessageModalProps {
  item: ClientFollowUpSummary | null
  isOpen: boolean
  onClose: () => void
}

const TEMPLATES: QuickMessageTemplate[] = [
  {
    id: "reminder_preventive",
    title: "Lembrete Preventivo de Retorno",
    category: "REMINDER",
    template:
      "Olá {nome}! Tudo bem? Passando para acompanhar como tem sido sua rotina com o plano. Estamos nos aproximando do prazo ideal do nosso retorno para reavaliarmos sua evolução. Como está sua agenda nesta semana ou na próxima para marcarmos sua consulta?",
  },
  {
    id: "overdue_reengagement",
    title: "Reengajamento de Cliente em Atraso",
    category: "OVERDUE",
    template:
      "Olá {nome}! Senti sua falta por aqui. Sei que a rotina pode ficar corrida, mas a continuidade do acompanhamento é essencial para mantermos seus resultados. Vamos agendar seu retorno para alinharmos os próximos passos?",
  },
  {
    id: "confirmation_48h",
    title: "Confirmação de Consulta Próxima",
    category: "CONFIRMATION",
    template:
      "Olá {nome}! Passando para confirmar nossa consulta de retorno agendada para {data_consulta}. Você poderá comparecer normalmente? Se precisar de algum ajuste de horário, me avise por aqui!",
  },
  {
    id: "no_show_recovery",
    title: "Recuperação Pós-Ausência (No-show)",
    category: "NO_SHOW",
    template:
      "Olá {nome}! Notei que não conseguimos nos encontrar na nossa última data agendada. Espero que esteja tudo bem! Que tal escolhermos um novo dia e horário para seu retorno esta semana?",
  },
]

export function FollowUpQuickMessageModal({
  item,
  isOpen,
  onClose,
}: FollowUpQuickMessageModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("reminder_preventive")
  const [messageText, setMessageText] = useState("")

  useEffect(() => {
    if (!item) return

    // Pick appropriate default template based on client status
    let defaultId = "reminder_preventive"
    if (item.status === "OVERDUE") defaultId = "overdue_reengagement"
    else if (item.status === "NO_SHOW") defaultId = "no_show_recovery"
    else if (item.status === "UPCOMING_7_DAYS" && item.nextAppointment) defaultId = "confirmation_48h"

    setSelectedTemplateId(defaultId)
    applyTemplate(defaultId, item)
  }, [item, isOpen])

  const applyTemplate = (templateId: string, currentItem: ClientFollowUpSummary) => {
    const t = TEMPLATES.find((tpl) => tpl.id === templateId)
    if (!t) return

    const clientName = currentItem.client.name.split(" ")[0]
    const nextDate = currentItem.nextAppointment
      ? new Date(currentItem.nextAppointment.startsAt).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "em breve"

    const interpolated = t.template
      .replace(/{nome}/g, clientName)
      .replace(/{data_consulta}/g, nextDate)

    setMessageText(interpolated)
  }

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (item) applyTemplate(templateId, item)
  }

  if (!item) return null

  // Clean phone number for whatsapp link
  const rawPhone = item.client.phone?.replace(/\D/g, "")
  const hasValidPhone = Boolean(rawPhone && rawPhone.length >= 10)
  const whatsappUrl = hasValidPhone
    ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(messageText)}`
    : null

  const handleSendWhatsApp = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600">
            <MessageSquare className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Disparo Rápido de Agendamento</span>
          </div>
          <DialogTitle className="text-lg font-black text-[var(--sm-ink)]">
            Mensagem para {item.client.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--sm-muted)]">
            {hasValidPhone
              ? `Telefone cadastrado: ${item.client.phone}. Selecione um modelo e personalize a mensagem.`
              : "Atenção: este cliente não possui telefone válido cadastrado no prontuário."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template pills */}
          <div>
            <Label className="text-xs font-semibold text-[var(--sm-muted)]">Modelo de Mensagem</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`rounded-[var(--sm-radius-sm)] border p-2 text-left text-xs transition ${
                    selectedTemplateId === tmpl.id
                      ? "border-[var(--sm-brand)] bg-[var(--sm-brand-subtle)] font-bold text-[var(--sm-brand)]"
                      : "border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-muted)] hover:border-slate-300"
                  }`}
                >
                  {tmpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Editable text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="message-preview" className="text-xs font-semibold text-[var(--sm-ink)]">
                Texto da Mensagem
              </Label>
              <span className="text-[11px] text-[var(--sm-muted)]">
                {messageText.length} caracteres
              </span>
            </div>
            <Textarea
              id="message-preview"
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="text-xs leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            disabled={!hasValidPhone || !messageText.trim()}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Send className="size-4" />
            <span>Abrir no WhatsApp</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
