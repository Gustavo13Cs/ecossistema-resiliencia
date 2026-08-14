"use client"

import { useState } from "react"
import { Check, Clock3, UserRound, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AgendaOccurrence, AgendaTaskCategory } from "@/types/agenda"

const categoryLabels: Record<AgendaTaskCategory, string> = {
  NUTRITION: "Nutrição",
  TRAINING: "Treino",
  REHABILITATION: "Reabilitação",
  SUPPLEMENT: "Suplemento",
  HYDRATION: "Hidratação",
  CUSTOM: "Outro",
}

const statusLabels: Record<AgendaOccurrence["status"], string> = {
  PENDING: "Pendente",
  COMPLETED: "Concluída",
  SKIPPED: "Pulada",
  OVERDUE: "Atrasada",
  CANCELLED: "Cancelada",
}

type AgendaTaskCardProps = {
  occurrence: AgendaOccurrence
  mutating: boolean
  onComplete: (occurrenceId: string) => Promise<void>
  onSkip: (occurrenceId: string, reason: string) => Promise<void>
}

export function AgendaTaskCard({
  occurrence,
  mutating,
  onComplete,
  onSkip,
}: AgendaTaskCardProps) {
  const [skipOpen, setSkipOpen] = useState(false)
  const [skipReason, setSkipReason] = useState("")
  const actionable = occurrence.status === "PENDING" || occurrence.status === "OVERDUE"
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(occurrence.scheduledFor))

  const handleSkip = async () => {
    const reason = skipReason.trim()
    if (!reason) return
    try {
      await onSkip(occurrence.id, reason)
      setSkipReason("")
      setSkipOpen(false)
    } catch {
      // The page reports the mutation error and the dialog stays open for retry.
    }
  }

  return (
    <Card className="gap-4 border-slate-200 py-5">
      <CardHeader className="gap-3 px-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <Clock3 className="size-4" aria-hidden="true" />
            {time}
          </span>
          <Badge variant="secondary">{categoryLabels[occurrence.task.category]}</Badge>
          {occurrence.task.priority === "HIGH" ? (
            <Badge variant="destructive">Alta prioridade</Badge>
          ) : null}
          <Badge variant="outline">{statusLabels[occurrence.status]}</Badge>
        </div>
        <CardTitle className="text-lg text-slate-900">{occurrence.task.title}</CardTitle>
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <UserRound className="size-4" aria-hidden="true" />
          {occurrence.task.professional.name}
        </p>
      </CardHeader>

      <CardContent className="space-y-4 px-5">
        {occurrence.task.instructions ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            {occurrence.task.instructions}
          </p>
        ) : null}

        {actionable ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-11 flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={mutating}
              onClick={() => void onComplete(occurrence.id)}
            >
              <Check aria-hidden="true" />
              Concluir
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              disabled={mutating}
              onClick={() => setSkipOpen(true)}
            >
              <X aria-hidden="true" />
              Pular tarefa
            </Button>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={skipOpen} onOpenChange={setSkipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pular tarefa</DialogTitle>
            <DialogDescription>
              Informe o motivo para que a equipe acompanhe sua rotina com contexto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`skip-reason-${occurrence.id}`}>Motivo</Label>
            <Textarea
              id={`skip-reason-${occurrence.id}`}
              value={skipReason}
              maxLength={500}
              onChange={(event) => setSkipReason(event.target.value)}
              placeholder="Conte por que não foi possível realizar a tarefa"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSkipOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!skipReason.trim() || mutating}
              onClick={() => void handleSkip()}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
