import { addDays, format, parseISO, startOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AppointmentCard } from "./AppointmentCard"
import { appointmentsForDate } from "@/lib/appointment-display"
import type { Appointment } from "@/types/appointment"

const dateKey = (date: Date) => format(date, "yyyy-MM-dd")

export function WeekAgenda({
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
  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const selectedAppointments = appointmentsForDate(
    appointments,
    selectedDate,
    timeZone,
  )

  return (
    <section
      aria-label="Agenda semanal"
      className="overflow-hidden rounded-[var(--sm-radius-md)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)]"
    >
      <div className="hidden grid-cols-7 divide-x divide-[var(--sm-border)] lg:grid">
        {days.map((day) => {
          const key = dateKey(day)
          const dayAppointments = appointmentsForDate(appointments, key, timeZone)
          return (
            <div key={key} className="min-h-[34rem] min-w-0">
              <button
                type="button"
                onClick={() => onSelectDate(key)}
                className={`min-h-20 w-full border-b border-[var(--sm-border)] px-2 py-3 text-center ${
                  key === selectedDate
                    ? "bg-[var(--sm-brand-subtle)]"
                    : "hover:bg-[var(--sm-subtle-hover)]"
                }`}
                aria-current={key === today ? "date" : undefined}
              >
                <span className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--sm-muted)]">
                  {format(day, "EEE", { locale: ptBR })}
                </span>
                <span
                  className={`mt-1 inline-flex size-8 items-center justify-center rounded-full text-sm font-extrabold ${
                    key === today
                      ? "bg-[var(--sm-brand)] text-[var(--sm-on-brand)]"
                      : "text-[var(--sm-ink)]"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </button>
              <div className="space-y-2 p-2">
                {dayAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    timeZone={timeZone}
                    compact
                    onSelect={onSelectAppointment}
                  />
                ))}
                {dayAppointments.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[var(--sm-muted)]">
                    Livre
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="lg:hidden">
        <div className="flex overflow-x-auto border-b border-[var(--sm-border)] p-2">
          {days.map((day) => {
            const key = dateKey(day)
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(key)}
                aria-pressed={key === selectedDate}
                aria-current={key === today ? "date" : undefined}
                className={`min-h-14 min-w-16 rounded-lg px-2 py-2 text-center ${
                  key === selectedDate
                    ? "bg-[var(--sm-brand)] text-[var(--sm-on-brand)]"
                    : "text-[var(--sm-muted)] hover:bg-[var(--sm-subtle-hover)]"
                }`}
              >
                <span className="block text-[0.6875rem] font-bold uppercase">
                  {format(day, "EEE", { locale: ptBR })}
                </span>
                <span className="mt-0.5 block text-sm font-extrabold">
                  {format(day, "d")}
                </span>
              </button>
            )
          })}
        </div>
        <div className="space-y-3 p-4">
          {selectedAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              timeZone={timeZone}
              onSelect={onSelectAppointment}
            />
          ))}
          {selectedAppointments.length === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--sm-muted)]">
              Nenhum atendimento neste dia.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
