import { CalendarX2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AppointmentCard } from "./AppointmentCard"
import { appointmentsForDate } from "@/lib/appointment-display"
import type { Appointment } from "@/types/appointment"

export function DayAgenda({
  appointments,
  selectedDate,
  timeZone,
  onSelectAppointment,
}: {
  appointments: Appointment[]
  selectedDate: string
  timeZone: string
  onSelectAppointment: (appointment: Appointment) => void
}) {
  const dayAppointments = appointmentsForDate(
    appointments,
    selectedDate,
    timeZone,
  )
  const parsedDate = parseISO(selectedDate)

  return (
    <section
      aria-labelledby="day-agenda-title"
      className="overflow-hidden rounded-[var(--sm-radius-md)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)]"
    >
      <header className="flex items-center justify-between border-b border-[var(--sm-border)] px-4 py-4 sm:px-5">
        <div>
          <h2
            id="day-agenda-title"
            className="text-lg font-extrabold capitalize tracking-[-0.02em] text-[var(--sm-ink)]"
          >
            {format(parsedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h2>
          <p className="mt-1 text-sm text-[var(--sm-muted)]">
            {dayAppointments.length === 0
              ? "Nenhum atendimento neste dia"
              : `${dayAppointments.length} ${dayAppointments.length === 1 ? "atendimento" : "atendimentos"}`}
          </p>
        </div>
      </header>

      {dayAppointments.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
          <CalendarX2
            aria-hidden="true"
            className="size-8 text-[var(--sm-brand)]"
            strokeWidth={1.7}
          />
          <p className="mt-4 font-bold text-[var(--sm-ink)]">Dia livre</p>
          <p className="mt-1 max-w-[48ch] text-sm text-[var(--sm-muted)]">
            Use “Novo atendimento” para reservar um horário neste dia.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-[var(--sm-border)]">
          {dayAppointments.map((appointment) => (
            <li
              key={appointment.id}
              className="grid gap-3 px-4 py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:px-5"
            >
              <time
                dateTime={appointment.startsAt}
                className="pt-3 text-sm font-bold tabular-nums text-[var(--sm-muted)]"
              >
                {new Intl.DateTimeFormat("pt-BR", {
                  timeZone,
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(appointment.startsAt))}
              </time>
              <AppointmentCard
                appointment={appointment}
                timeZone={timeZone}
                onSelect={onSelectAppointment}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
