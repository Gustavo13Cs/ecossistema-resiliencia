"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AgendaTask, AgendaTaskCategory, AgendaTaskPriority } from "@/types/agenda"

type Recurrence = "ONCE" | "DAILY" | "WEEKLY"
type AgendaTaskPayload = {
  patientId?: string
  title: string
  category: AgendaTaskCategory
  priority: AgendaTaskPriority
  startsAt: string
  timeZone: string
  recurrenceRule?: string | null
  endsAt?: string | null
  instructions?: string | null
}

type AgendaTaskDialogProps = {
  open: boolean
  patientId: string
  task?: AgendaTask | null
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: AgendaTaskPayload) => Promise<void>
}

const weekdays = [
  ["MO", "Seg"], ["TU", "Ter"], ["WE", "Qua"], ["TH", "Qui"],
  ["FR", "Sex"], ["SA", "Sáb"], ["SU", "Dom"],
] as const

function detectedTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo"
}

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone })
    return true
  } catch (error) {
    if (error instanceof RangeError) return false
    throw error
  }
}

function emptyForm() {
  return {
    title: "",
    category: "CUSTOM" as AgendaTaskCategory,
    priority: "NORMAL" as AgendaTaskPriority,
    startsAt: "",
    timeZone: detectedTimeZone(),
    recurrence: "ONCE" as Recurrence,
    selectedDays: [] as string[],
    endsAt: "",
    instructions: "",
  }
}

function dateInTimeZone(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso))
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`
}

function localDateTimeToIso(value: string, timeZone: string) {
  const [date, time] = value.split("T")
  const [year, month, day] = date.split("-").map(Number)
  const [hour, minute] = time.split(":").map(Number)
  const intendedUtc = Date.UTC(year, month - 1, day, hour, minute)
  let guess = intendedUtc

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const actualLocal = dateInTimeZone(new Date(guess).toISOString(), timeZone)
    const [actualDate, actualTime] = actualLocal.split("T")
    const [actualYear, actualMonth, actualDay] = actualDate.split("-").map(Number)
    const [actualHour, actualMinute] = actualTime.split(":").map(Number)
    const actualUtc = Date.UTC(actualYear, actualMonth - 1, actualDay, actualHour, actualMinute)
    guess += intendedUtc - actualUtc
  }

  return new Date(guess).toISOString()
}

function recurrenceFromTask(task: AgendaTask): Recurrence {
  if (task.recurrenceRule?.startsWith("FREQ=WEEKLY")) return "WEEKLY"
  if (task.recurrenceRule?.startsWith("FREQ=DAILY")) return "DAILY"
  return "ONCE"
}

export function AgendaTaskDialog({
  open, patientId, task, submitting, onOpenChange, onSubmit,
}: AgendaTaskDialogProps) {
  const [form, setForm] = useState(emptyForm)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (!task) {
      setForm(emptyForm())
      setValidationError(null)
      return
    }

    const timeZone = task.timeZone ?? detectedTimeZone()
    const selectedDays = task.recurrenceRule?.match(/BYDAY=([^;]+)/)?.[1]?.split(",") ?? []
    setForm({
      title: task.title,
      category: task.category,
      priority: task.priority,
      startsAt: task.startsAt ? dateInTimeZone(task.startsAt, timeZone) : "",
      timeZone,
      recurrence: recurrenceFromTask(task),
      selectedDays,
      endsAt: task.endsAt ? dateInTimeZone(task.endsAt, timeZone).slice(0, 10) : "",
      instructions: task.instructions ?? "",
    })
    setValidationError(null)
  }, [open, task])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const timeZone = form.timeZone.trim()
    if (!isValidTimeZone(timeZone)) {
      setValidationError("Informe um fuso horário IANA válido.")
      return
    }
    if (form.recurrence === "WEEKLY" && form.selectedDays.length === 0) {
      setValidationError("Selecione ao menos um dia da semana.")
      return
    }

    const recurrenceRule = form.recurrence === "ONCE"
      ? undefined
      : form.recurrence === "DAILY"
        ? "FREQ=DAILY;INTERVAL=1"
        : `FREQ=WEEKLY;INTERVAL=1;BYDAY=${form.selectedDays.join(",")}`
    const instructions = form.instructions.trim()
    let startsAt: string
    let endsAt: string | null
    try {
      startsAt = localDateTimeToIso(form.startsAt, timeZone)
      endsAt = form.endsAt ? localDateTimeToIso(`${form.endsAt}T23:59`, timeZone) : null
    } catch (error) {
      if (error instanceof RangeError) {
        setValidationError("Informe um fuso horário IANA válido.")
        return
      }
      throw error
    }
    const payload: AgendaTaskPayload = {
      ...(!task ? { patientId } : {}),
      title: form.title.trim(),
      category: form.category,
      priority: form.priority,
      startsAt,
      timeZone,
      ...(task
        ? {
            recurrenceRule: recurrenceRule ?? null,
            endsAt,
            instructions: instructions || null,
          }
        : {
            ...(recurrenceRule ? { recurrenceRule } : {}),
            ...(endsAt ? { endsAt } : {}),
            ...(instructions ? { instructions } : {}),
          }),
    }
    await onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Planeje a atividade no horário local do paciente.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="agenda-task-title">Título</Label>
            <Input id="agenda-task-title" required maxLength={120} value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agenda-task-category">Categoria</Label>
              <select id="agenda-task-category" className="min-h-11 w-full rounded-md border px-3" value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as AgendaTaskCategory }))}>
                <option value="NUTRITION">Nutrição</option><option value="TRAINING">Treino</option>
                <option value="REHABILITATION">Reabilitação</option><option value="SUPPLEMENT">Suplemento</option>
                <option value="HYDRATION">Hidratação</option><option value="CUSTOM">Outro</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-task-priority">Prioridade</Label>
              <select id="agenda-task-priority" className="min-h-11 w-full rounded-md border px-3" value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as AgendaTaskPriority }))}>
                <option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agenda-task-starts-at">Data e hora de início</Label>
              <Input id="agenda-task-starts-at" type="datetime-local" required value={form.startsAt}
                onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-task-time-zone">Fuso horário</Label>
              <Input id="agenda-task-time-zone" required value={form.timeZone}
                onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agenda-task-recurrence">Recorrência</Label>
              <select id="agenda-task-recurrence" className="min-h-11 w-full rounded-md border px-3" value={form.recurrence}
                onChange={(event) => setForm((current) => ({ ...current, recurrence: event.target.value as Recurrence }))}>
                <option value="ONCE">Uma vez</option><option value="DAILY">Diária</option><option value="WEEKLY">Semanal</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-task-ends-at">Data final (opcional)</Label>
              <Input id="agenda-task-ends-at" type="date" value={form.endsAt}
                onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} />
            </div>
          </div>
          {form.recurrence === "WEEKLY" ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Dias da semana</legend>
              <div className="flex flex-wrap gap-2">
                {weekdays.map(([value, label]) => (
                  <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3">
                    <input type="checkbox" checked={form.selectedDays.includes(value)} onChange={(event) => {
                      setForm((current) => ({ ...current, selectedDays: event.target.checked
                        ? [...current.selectedDays, value]
                        : current.selectedDays.filter((day) => day !== value) }))
                    }} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="agenda-task-instructions">Instruções</Label>
            <Textarea id="agenda-task-instructions" maxLength={4000} value={form.instructions}
              onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} />
          </div>
          {validationError ? <p role="alert" className="text-sm text-red-700">{validationError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Salvando…" : task ? "Salvar alterações" : "Criar tarefa"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
