import { MapPin, Video } from "lucide-react"
import { AppointmentStatusBadge } from "./AppointmentStatusBadge"
import type { Appointment } from "@/types/appointment"

const KIND_LABELS: Record<Appointment["kind"], string> = {
  FIRST_VISIT: "Primeiro atendimento",
  FOLLOW_UP: "Retorno",
  ASSESSMENT: "Avaliação",
  SESSION: "Sessão",
  OTHER: "Outro atendimento",
}

function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function AppointmentCard({
  appointment,
  timeZone,
  compact = false,
  onSelect,
}: {
  appointment: Appointment
  timeZone: string
  compact?: boolean
  onSelect: (appointment: Appointment) => void
}) {
  const ModalityIcon =
    appointment.modality === "ONLINE" ? Video : MapPin
  const location =
    appointment.modality === "ONLINE"
      ? appointment.meetingUrl
        ? "Atendimento online"
        : "Link ainda não informado"
      : appointment.location || "Local ainda não informado"

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      className="group w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-3 text-left shadow-[var(--sm-shadow-rest)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[var(--sm-shadow-elevated)]"
      aria-label={`${formatTime(appointment.startsAt, timeZone)}, ${appointment.client.name}, ${KIND_LABELS[appointment.kind]}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold tabular-nums text-[var(--sm-ink)]">
            {formatTime(appointment.startsAt, timeZone)}–
            {formatTime(appointment.endsAt, timeZone)}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[var(--sm-ink)]">
            {appointment.client.name}
          </p>
        </div>
        {!compact ? <AppointmentStatusBadge status={appointment.status} /> : null}
      </div>

      {!compact ? (
        <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-[var(--sm-border)] pt-2.5 text-xs text-[var(--sm-muted)]">
          <span className="truncate">{KIND_LABELS[appointment.kind]}</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <ModalityIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </span>
        </div>
      ) : (
        <p className="mt-1 truncate text-xs text-[var(--sm-muted)]">
          {APPOINTMENT_STATUS_LABELS_SHORT[appointment.status]}
        </p>
      )}
    </button>
  )
}

const APPOINTMENT_STATUS_LABELS_SHORT: Record<Appointment["status"], string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Faltou",
}
