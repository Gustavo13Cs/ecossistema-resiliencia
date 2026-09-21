"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Client } from "@/types/client"
import type {
  Appointment,
  AppointmentKind,
  AppointmentModality,
  CreateAppointmentCommand,
  UpdateAppointmentCommand,
} from "@/types/appointment"

type AppointmentFormState = {
  clientId: string
  kind: AppointmentKind
  modality: AppointmentModality
  startsAt: string
  endsAt: string
  location: string
  meetingUrl: string
  notes: string
}

const KIND_OPTIONS: Array<{ value: AppointmentKind; label: string }> = [
  { value: "FIRST_VISIT", label: "Primeiro atendimento" },
  { value: "FOLLOW_UP", label: "Retorno" },
  { value: "ASSESSMENT", label: "Avaliação" },
  { value: "SESSION", label: "Sessão" },
  { value: "OTHER", label: "Outro" },
]

function localDateTime(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

function initialState(
  appointment: Appointment | null,
  selectedDate: string,
  timeZone: string,
  defaultClientId?: string,
): AppointmentFormState {
  if (appointment) {
    return {
      clientId: appointment.clientId,
      kind: appointment.kind,
      modality: appointment.modality,
      startsAt: localDateTime(appointment.startsAt, timeZone),
      endsAt: localDateTime(appointment.endsAt, timeZone),
      location: appointment.location ?? "",
      meetingUrl: appointment.meetingUrl ?? "",
      notes: appointment.notes ?? "",
    }
  }
  return {
    clientId: defaultClientId ?? "",
    kind: "FOLLOW_UP",
    modality: "IN_PERSON",
    startsAt: `${selectedDate}T09:00`,
    endsAt: `${selectedDate}T10:00`,
    location: "",
    meetingUrl: "",
    notes: "",
  }
}

export function AppointmentDialog({
  open,
  appointment,
  clients,
  selectedDate,
  timeZone,
  clientSingular,
  conflict,
  isSubmitting,
  defaultClientId,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  appointment: Appointment | null
  clients: Client[]
  selectedDate: string
  timeZone: string
  clientSingular: string
  conflict: string | null
  isSubmitting: boolean
  defaultClientId?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (
    command: CreateAppointmentCommand | UpdateAppointmentCommand,
  ) => Promise<void>
}) {
  const [form, setForm] = useState(() =>
    initialState(appointment, selectedDate, timeZone, defaultClientId),
  )
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(initialState(appointment, selectedDate, timeZone, defaultClientId))
    setFormError(null)
  }, [appointment, open, selectedDate, timeZone, defaultClientId])

  const availableClients = useMemo(() => {
    if (!appointment || clients.some((client) => client.id === appointment.clientId)) {
      return clients
    }
    return [
      ...clients,
      {
        id: appointment.client.id,
        name: appointment.client.name,
        status: appointment.client.status,
      } as Client,
    ]
  }, [appointment, clients])

  const setField = <Key extends keyof AppointmentFormState>(
    field: Key,
    value: AppointmentFormState[Key],
  ) => setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!form.clientId) {
      setFormError(`Selecione um ${clientSingular.toLowerCase()}.`)
      return
    }
    const startsAt = new Date(form.startsAt)
    const endsAt = new Date(form.endsAt)
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      endsAt <= startsAt
    ) {
      setFormError("Informe um intervalo de horário válido.")
      return
    }

    const base: CreateAppointmentCommand = {
      clientId: form.clientId,
      kind: form.kind,
      modality: form.modality,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      timeZone,
      location: form.modality === "IN_PERSON" ? form.location || null : null,
      meetingUrl: form.modality === "ONLINE" ? form.meetingUrl || null : null,
      notes: form.notes || null,
    }

    try {
      await onSubmit(
        appointment
          ? { ...base, expectedUpdatedAt: appointment.updatedAt }
          : base,
      )
    } catch {
      if (!conflict) {
        setFormError("Não foi possível salvar o atendimento. Revise os dados e tente novamente.")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold tracking-[-0.02em] text-[var(--sm-ink)]">
            {appointment ? "Editar atendimento" : "Novo atendimento"}
          </DialogTitle>
          <DialogDescription>
            Reserve um horário na sua agenda privada e vincule-o a um prontuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="appointment-client">{clientSingular}</Label>
              <Select
                value={form.clientId}
                onValueChange={(value) => setField("clientId", value)}
              >
                <SelectTrigger id="appointment-client" className="min-h-11 w-full">
                  <SelectValue placeholder={`Selecione um ${clientSingular.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}{client.status === "ARCHIVED" ? " — arquivado" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableClients.length === 0 ? (
                <p className="text-sm text-[var(--sm-danger)]">
                  Cadastre um prontuário ativo antes de criar um atendimento.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment-kind">Tipo</Label>
              <Select
                value={form.kind}
                onValueChange={(value) => setField("kind", value as AppointmentKind)}
              >
                <SelectTrigger id="appointment-kind" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment-modality">Modalidade</Label>
              <Select
                value={form.modality}
                onValueChange={(value) =>
                  setField("modality", value as AppointmentModality)
                }
              >
                <SelectTrigger id="appointment-modality" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PERSON">Presencial</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment-start">Início</Label>
              <Input
                id="appointment-start"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setField("startsAt", event.target.value)}
                className="min-h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment-end">Fim</Label>
              <Input
                id="appointment-end"
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setField("endsAt", event.target.value)}
                className="min-h-11"
                required
              />
            </div>

            {form.modality === "IN_PERSON" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="appointment-location">Local</Label>
                <Input
                  id="appointment-location"
                  value={form.location}
                  onChange={(event) => setField("location", event.target.value)}
                  placeholder="Ex.: Consultório 2"
                  maxLength={240}
                  className="min-h-11"
                />
              </div>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="appointment-link">Link HTTPS</Label>
                <Input
                  id="appointment-link"
                  type="url"
                  value={form.meetingUrl}
                  onChange={(event) => setField("meetingUrl", event.target.value)}
                  placeholder="https://"
                  maxLength={500}
                  className="min-h-11"
                />
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="appointment-notes">Observação operacional</Label>
                <span className="text-xs tabular-nums text-[var(--sm-muted)]">
                  {form.notes.length}/1000
                </span>
              </div>
              <Textarea
                id="appointment-notes"
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Informações úteis para organizar o atendimento"
              />
            </div>
          </div>

          {conflict ? (
            <p
              role="alert"
              className="rounded-[var(--sm-radius-sm)] bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"
            >
              {conflict}
            </p>
          ) : null}
          {formError ? (
            <p
              role="alert"
              className="rounded-[var(--sm-radius-sm)] bg-[var(--sm-danger-subtle)] px-4 py-3 text-sm font-semibold text-[var(--sm-danger)]"
            >
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="min-h-11 bg-[var(--sm-brand)] font-bold text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)]"
              disabled={isSubmitting || availableClients.length === 0}
            >
              {isSubmitting ? "Salvando…" : appointment ? "Salvar alterações" : "Agendar atendimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
