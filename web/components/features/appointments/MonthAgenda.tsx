import {
  addDays,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { AppointmentStatusBadge } from "./AppointmentStatusBadge"
import { appointmentsForDate } from "@/lib/appointment-display"
import type { Appointment } from "@/types/appointment"

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
const dateKey = (date: Date) => format(date, "yyyy-MM-dd")

export function MonthAgenda({
  appointments,
  selectedDate,
  today,
  timeZone,
  onSelectDate,
  onSelectAppointment,
}: {
  appointments: Appointment[]
  selectedDate: string
  today: string
  timeZone: string
  onSelectDate: (date: string) => void
  onSelectAppointment: (appointment: Appointment) => void
}) {
  const selected = parseISO(selectedDate)
  const gridStart = startOfWeek(startOfMonth(selected), { weekStartsOn: 1 })
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))

  return (
    <section
      aria-label="Agenda mensal"
      className="overflow-hidden rounded-[var(--sm-radius-md)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)]"
    >
      <div className="hidden grid-cols-7 border-b border-[var(--sm-border)] bg-[var(--sm-canvas)] md:grid">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-[0.08em] text-[var(--sm-muted)]"
          >
            {weekday}
          </div>
        ))}
      </div>
      <div className="hidden grid-cols-7 md:grid">
        {days.map((day) => {
          const key = dateKey(day)
          const dayAppointments = appointmentsForDate(appointments, key, timeZone)
          const visible = dayAppointments.slice(0, 3)
          return (
            <div
              key={key}
              className="min-h-32 border-b border-r border-[var(--sm-border)] p-2 last:border-r-0"
            >
              <button
                type="button"
                onClick={() => onSelectDate(key)}
                aria-current={key === today ? "date" : undefined}
                className={`flex size-8 items-center justify-center rounded-full text-sm font-extrabold ${
                  key === today
                    ? "bg-[var(--sm-brand)] text-[var(--sm-on-brand)]"
                    : key === selectedDate
                      ? "bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]"
                      : isSameMonth(day, selected)
                        ? "text-[var(--sm-ink)] hover:bg-[var(--sm-subtle-hover)]"
                        : "text-slate-400 hover:bg-[var(--sm-subtle-hover)]"
                }`}
                aria-label={format(day, "d 'de' MMMM", { locale: ptBR })}
              >
                {format(day, "d")}
              </button>
              <div className="mt-1.5 space-y-1">
                {visible.map((appointment) => (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => onSelectAppointment(appointment)}
                    className="w-full truncate rounded-md bg-[var(--sm-canvas)] px-2 py-1.5 text-left text-xs font-semibold tabular-nums text-[var(--sm-ink)] hover:bg-[var(--sm-brand-subtle)]"
                    aria-label={`Abrir atendimento de ${appointment.client.name}`}
                  >
                    {new Intl.DateTimeFormat("pt-BR", {
                      timeZone,
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(appointment.startsAt))}{" "}
                    · {appointment.client.name}
                  </button>
                ))}
                {dayAppointments.length > visible.length ? (
                  <button
                    type="button"
                    onClick={() => onSelectDate(key)}
                    className="min-h-8 w-full rounded-md text-xs font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-brand-subtle)]"
                  >
                    +{dayAppointments.length - visible.length} atendimentos
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <ol className="divide-y divide-[var(--sm-border)] md:hidden">
        {days
          .filter((day) => isSameMonth(day, selected))
          .map((day) => {
            const key = dateKey(day)
            const dayAppointments = appointmentsForDate(appointments, key, timeZone)
            if (dayAppointments.length === 0) return null
            return (
              <li key={key} className="p-4">
                <button
                  type="button"
                  onClick={() => onSelectDate(key)}
                  className="min-h-11 text-left font-extrabold capitalize text-[var(--sm-ink)]"
                >
                  {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </button>
                <div className="mt-2 space-y-2">
                  {dayAppointments.map((appointment) => (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={() => onSelectAppointment(appointment)}
                      className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[var(--sm-radius-sm)] bg-[var(--sm-canvas)] px-3 py-2 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block font-bold tabular-nums text-[var(--sm-ink)]">
                          {new Intl.DateTimeFormat("pt-BR", {
                            timeZone,
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(appointment.startsAt))}
                        </span>
                        <span className="block truncate text-sm text-[var(--sm-muted)]">
                          {appointment.client.name}
                        </span>
                      </span>
                      <AppointmentStatusBadge status={appointment.status} />
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
      </ol>
      {appointments.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--sm-muted)] md:hidden">
          Nenhum atendimento neste mês.
        </p>
      ) : null}
    </section>
  )
}
