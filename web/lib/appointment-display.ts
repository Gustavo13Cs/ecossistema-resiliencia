import type { Appointment, AppointmentStatus } from "@/types/appointment"

export type AppointmentAction =
  | "confirm"
  | "complete"
  | "no-show"
  | "cancel"
  | "edit"

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Faltou",
}

export function getDateKeyInTimeZone(
  value: string | Date,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}

export function appointmentsForDate(
  appointments: Appointment[],
  dateKey: string,
  timeZone: string,
): Appointment[] {
  return appointments
    .filter(
      (appointment) =>
        getDateKeyInTimeZone(appointment.startsAt, timeZone) === dateKey,
    )
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
    )
}

export function allowedAppointmentActions(
  status: AppointmentStatus,
  startsAt: string,
  now: Date,
): AppointmentAction[] {
  if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(status)) return []

  const started = new Date(startsAt) <= now
  const actions: AppointmentAction[] = ["edit"]
  if (status === "SCHEDULED") actions.push("confirm")
  if (started) actions.push("complete", "no-show")
  actions.push("cancel")
  return actions
}
