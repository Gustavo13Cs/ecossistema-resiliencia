"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  CalendarClock,
  Check,
  CircleCheck,
  ExternalLink,
  MapPin,
  Pencil,
  UserX,
  Video,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { AppointmentStatusBadge } from "./AppointmentStatusBadge"
import { allowedAppointmentActions } from "@/lib/appointment-display"
import type { Appointment } from "@/types/appointment"
import type { AppointmentTransition } from "@/hooks/features/useAppointments"

const KIND_LABELS: Record<Appointment["kind"], string> = {
  FIRST_VISIT: "Primeiro atendimento",
  FOLLOW_UP: "Retorno",
  ASSESSMENT: "Avaliação",
  SESSION: "Sessão",
  OTHER: "Outro atendimento",
}

const EVENT_LABELS: Record<NonNullable<Appointment["events"]>[number]["type"], string> = {
  CREATED: "Atendimento criado",
  UPDATED: "Dados atualizados",
  RESCHEDULED: "Horário reagendado",
  CONFIRMED: "Confirmação registrada",
  COMPLETED: "Atendimento concluído",
  CANCELLED: "Atendimento cancelado",
  NO_SHOW: "Falta registrada",
}

function formatDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function AppointmentDetails({
  appointment,
  open,
  timeZone,
  clientSingular,
  conflict,
  isMutating,
  onOpenChange,
  onEdit,
  onAction,
}: {
  appointment: Appointment | null
  open: boolean
  timeZone: string
  clientSingular: string
  conflict: string | null
  isMutating: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (appointment: Appointment) => void
  onAction: (
    transition: AppointmentTransition,
    reason?: string,
  ) => Promise<void>
}) {
  const [showCancellation, setShowCancellation] = useState(false)
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open) {
      setShowCancellation(false)
      setReason("")
    }
  }, [open])

  if (!appointment) return null

  const actions = allowedAppointmentActions(
    appointment.status,
    appointment.startsAt,
    new Date(),
  )
  const events = appointment.events ?? []
  const location =
    appointment.modality === "ONLINE"
      ? appointment.meetingUrl || "Link ainda não informado"
      : appointment.location || "Local ainda não informado"
  const LocationIcon = appointment.modality === "ONLINE" ? Video : MapPin

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-[var(--sm-border)] sm:max-w-xl">
        <SheetHeader className="border-b border-[var(--sm-border)] px-5 pb-5 pt-6">
          <div className="pr-8">
            <AppointmentStatusBadge status={appointment.status} />
            <SheetTitle className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-[var(--sm-ink)]">
              {appointment.client.name}
            </SheetTitle>
            <SheetDescription className="mt-1">
              {KIND_LABELS[appointment.kind]} · {formatDateTime(appointment.startsAt, timeZone)}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="space-y-7 px-5 pb-8">
          <section aria-labelledby="appointment-information-title">
            <h3
              id="appointment-information-title"
              className="text-base font-extrabold text-[var(--sm-ink)]"
            >
              Informações do atendimento
            </h3>
            <dl className="mt-3 divide-y divide-[var(--sm-border)] rounded-[var(--sm-radius-md)] bg-[var(--sm-canvas)] px-4">
              <div className="flex gap-3 py-3">
                <CalendarClock aria-hidden="true" className="mt-0.5 size-4 text-[var(--sm-brand)]" />
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--sm-muted)]">Horário</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--sm-ink)]">
                    {formatDateTime(appointment.startsAt, timeZone)} até {new Intl.DateTimeFormat("pt-BR", {
                      timeZone,
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(appointment.endsAt))}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3 py-3">
                <LocationIcon aria-hidden="true" className="mt-0.5 size-4 text-[var(--sm-brand)]" />
                <div className="min-w-0">
                  <dt className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--sm-muted)]">
                    {appointment.modality === "ONLINE" ? "Online" : "Presencial"}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-[var(--sm-ink)]">{location}</dd>
                </div>
              </div>
            </dl>
            {appointment.notes ? (
              <div className="mt-4">
                <h4 className="text-sm font-bold text-[var(--sm-ink)]">Observação operacional</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--sm-muted)]">{appointment.notes}</p>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="appointment-actions-title">
            <div className="flex items-center justify-between gap-3">
              <h3 id="appointment-actions-title" className="text-base font-extrabold text-[var(--sm-ink)]">Ações</h3>
              <Button asChild variant="link" className="min-h-11 px-0 font-bold text-[var(--sm-brand)]">
                <Link href={`/clientes/${appointment.clientId}`}>
                  Abrir {clientSingular.toLowerCase()}
                  <ExternalLink aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {actions.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--sm-muted)]">Este atendimento está encerrado e preservado no histórico.</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {actions.includes("edit") ? (
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => onEdit(appointment)} disabled={isMutating}>
                    <Pencil aria-hidden="true" /> Editar
                  </Button>
                ) : null}
                {actions.includes("confirm") ? (
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => void onAction("confirm")} disabled={isMutating}>
                    <Check aria-hidden="true" /> Confirmar
                  </Button>
                ) : null}
                {actions.includes("complete") ? (
                  <Button type="button" className="min-h-11 bg-[var(--sm-brand)] text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)]" onClick={() => void onAction("complete")} disabled={isMutating}>
                    <CircleCheck aria-hidden="true" /> Concluir
                  </Button>
                ) : null}
                {actions.includes("no-show") ? (
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => void onAction("no-show")} disabled={isMutating}>
                    <UserX aria-hidden="true" /> Registrar falta
                  </Button>
                ) : null}
                {actions.includes("cancel") ? (
                  <Button type="button" variant="outline" className="min-h-11 text-[var(--sm-danger)]" onClick={() => setShowCancellation(true)} disabled={isMutating}>
                    <XCircle aria-hidden="true" /> Cancelar
                  </Button>
                ) : null}
              </div>
            )}

            {showCancellation ? (
              <div className="mt-4 rounded-[var(--sm-radius-md)] bg-[var(--sm-danger-subtle)] p-4">
                <Label htmlFor="cancellation-reason" className="text-[var(--sm-danger)]">Motivo do cancelamento</Label>
                <Textarea
                  id="cancellation-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  minLength={3}
                  maxLength={500}
                  className="mt-2 bg-[var(--sm-surface)]"
                  placeholder="Registre o motivo recebido"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" variant="ghost" className="min-h-11" onClick={() => setShowCancellation(false)}>Voltar</Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-h-11"
                    disabled={isMutating || reason.trim().length < 3}
                    onClick={() => void onAction("cancel", reason.trim())}
                  >
                    Confirmar cancelamento
                  </Button>
                </div>
              </div>
            ) : null}

            {conflict ? (
              <p role="alert" className="mt-4 rounded-[var(--sm-radius-sm)] bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">{conflict}</p>
            ) : null}
          </section>

          <section aria-labelledby="appointment-history-title">
            <h3 id="appointment-history-title" className="text-base font-extrabold text-[var(--sm-ink)]">Histórico</h3>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--sm-muted)]">Carregando alterações registradas…</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--sm-brand)]" />
                    <div>
                      <p className="text-sm font-bold text-[var(--sm-ink)]">{EVENT_LABELS[event.type]}</p>
                      <time dateTime={event.createdAt} className="mt-0.5 block text-xs text-[var(--sm-muted)]">{formatDateTime(event.createdAt, timeZone)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
