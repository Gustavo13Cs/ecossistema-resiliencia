"use client"

import { useEffect, useMemo, useState } from "react"
import {
  addDays,
  addMonths,
  format,
  parseISO,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarPlus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { AgendaToolbar } from "@/components/features/appointments/AgendaToolbar"
import { AppointmentDetails } from "@/components/features/appointments/AppointmentDetails"
import { AppointmentDialog } from "@/components/features/appointments/AppointmentDialog"
import { DayAgenda } from "@/components/features/appointments/DayAgenda"
import { MonthAgenda } from "@/components/features/appointments/MonthAgenda"
import { WeekAgenda } from "@/components/features/appointments/WeekAgenda"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import {
  isAppointmentConflict,
  useAppointments,
} from "@/hooks/features/useAppointments"
import { useClients } from "@/hooks/features/useClients"
import { getDateKeyInTimeZone } from "@/lib/appointment-display"
import { getAppointmentPeriod } from "@/lib/appointment-period"
import { getWorkspaceDefinition } from "@/lib/professional-workspace"
import type {
  AgendaView,
  Appointment,
  AppointmentFilters,
  CreateAppointmentCommand,
  UpdateAppointmentCommand,
} from "@/types/appointment"

const dateKey = (date: Date) => format(date, "yyyy-MM-dd")
const AGENDA_TOAST_OPTIONS = {
  position: "top-center" as const,
  style: { width: "min(18rem, calc(100vw - 2rem))" },
}

function getPeriodLabel(view: AgendaView, selectedDate: string) {
  const selected = parseISO(selectedDate)
  if (view === "day") {
    return format(selected, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  }
  if (view === "month") {
    return format(selected, "MMMM 'de' yyyy", { locale: ptBR })
  }
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
  return `${format(weekStart, "d MMM", { locale: ptBR })} — ${format(weekEnd, "d MMM yyyy", { locale: ptBR })}`
}

export default function AgendaPage() {
  const { user } = useAuth()
  const isProfessional = Boolean(user && user.role !== "ADMIN")
  const [calendarReady, setCalendarReady] = useState(false)
  const [timeZone, setTimeZone] = useState("UTC")
  const [today, setToday] = useState("2000-01-01")
  const [selectedDate, setSelectedDate] = useState("2000-01-01")
  const [view, setView] = useState<AgendaView>("week")
  const [filters, setFilters] = useState<AppointmentFilters>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null)
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null)

  useEffect(() => {
    const browserTimeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    const currentDate = getDateKeyInTimeZone(new Date(), browserTimeZone)
    setTimeZone(browserTimeZone)
    setToday(currentDate)
    setSelectedDate(currentDate)
    setCalendarReady(true)
  }, [])

  const period = useMemo(
    () => getAppointmentPeriod(view, selectedDate, timeZone),
    [selectedDate, timeZone, view],
  )
  const clientsQuery = useClients("ACTIVE", {
    enabled: calendarReady && isProfessional,
  })
  const agenda = useAppointments(period, filters, {
    enabled: calendarReady && isProfessional,
  })

  if (!user || user.role === "ADMIN") {
    return (
      <AsyncState
        kind="error"
        title="Agenda profissional indisponível"
        description="Esta área é exclusiva para contas profissionais."
      />
    )
  }

  const workspace = getWorkspaceDefinition(user.role)
  const periodLabel = getPeriodLabel(view, selectedDate)

  const navigate = (direction: "previous" | "next") => {
    const selected = parseISO(selectedDate)
    const next =
      view === "month"
        ? direction === "next"
          ? addMonths(selected, 1)
          : subMonths(selected, 1)
        : direction === "next"
          ? addDays(selected, view === "week" ? 7 : 1)
          : subDays(selected, view === "week" ? 7 : 1)
    setSelectedDate(dateKey(next))
  }

  const openAppointment = async (appointment: Appointment) => {
    agenda.clearConflict()
    setSelectedAppointment(appointment)
    setDetailsOpen(true)
    try {
      const details = await agenda.loadAppointment(appointment.id)
      setSelectedAppointment((current) =>
        current?.id === details.id ? details : current,
      )
    } catch {
      toast.error(
        "Não foi possível carregar o histórico deste atendimento.",
        AGENDA_TOAST_OPTIONS,
      )
    }
  }

  const openCreate = () => {
    agenda.clearConflict()
    setEditingAppointment(null)
    setDialogOpen(true)
  }

  const openEdit = (appointment: Appointment) => {
    agenda.clearConflict()
    setDetailsOpen(false)
    setEditingAppointment(appointment)
    setDialogOpen(true)
  }

  const submitAppointment = async (
    command: CreateAppointmentCommand | UpdateAppointmentCommand,
  ) => {
    if (editingAppointment && "expectedUpdatedAt" in command) {
      const updated = await agenda.updateAppointment(editingAppointment.id, command)
      setSelectedAppointment(updated)
      toast.success("Atendimento atualizado com sucesso.", AGENDA_TOAST_OPTIONS)
    } else if (!("expectedUpdatedAt" in command)) {
      const created = await agenda.createAppointment(command)
      setSelectedAppointment(created)
      toast.success("Atendimento agendado com sucesso.", AGENDA_TOAST_OPTIONS)
    }
    setDialogOpen(false)
    setEditingAppointment(null)
  }

  const runAction = async (
    transition: "confirm" | "complete" | "no-show" | "cancel",
    reason?: string,
  ) => {
    if (!selectedAppointment) return
    try {
      const updated = await agenda.transitionAppointment(
        selectedAppointment.id,
        transition,
        transition === "cancel"
          ? {
              expectedUpdatedAt: selectedAppointment.updatedAt,
              reason: reason ?? "",
            }
          : { expectedUpdatedAt: selectedAppointment.updatedAt },
      )
      setSelectedAppointment(updated)
    } catch (error) {
      if (!isAppointmentConflict(error)) {
        toast.error(
          "Não foi possível atualizar este atendimento.",
          AGENDA_TOAST_OPTIONS,
        )
      }
    }
  }

  const selectMonthDate = (nextDate: string) => {
    setSelectedDate(nextDate)
    setView("day")
  }

  return (
    <div className="min-w-0 space-y-6 pb-10">
      <header className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[var(--sm-ink)]">
            Agenda
          </h1>
          <p className="mt-2 max-w-[65ch] text-base text-[var(--sm-muted)]">
            Organize atendimentos, confirmações e o acesso aos prontuários em um só lugar.
          </p>
          {calendarReady && agenda.state !== "loading" ? (
            <p className="mt-2 text-sm font-semibold text-[var(--sm-brand)]" aria-live="polite">
              {agenda.appointments.length} {agenda.appointments.length === 1 ? "atendimento no período" : "atendimentos no período"}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={openCreate}
          className="min-h-11 bg-[var(--sm-brand)] px-4 font-bold text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)]"
        >
          <CalendarPlus aria-hidden="true" />
          Novo atendimento
        </Button>
      </header>

      <AgendaToolbar
        view={view}
        selectedDate={selectedDate}
        periodLabel={periodLabel}
        clients={clientsQuery.data ?? []}
        filters={filters}
        clientPlural={workspace.clientPlural}
        onViewChange={setView}
        onDateChange={setSelectedDate}
        onPrevious={() => navigate("previous")}
        onNext={() => navigate("next")}
        onToday={() => setSelectedDate(today)}
        onFiltersChange={setFilters}
      />

      {!calendarReady || agenda.state === "loading" ? (
        <AsyncState
          kind="loading"
          title="Carregando agenda"
          description="Buscando os atendimentos autorizados deste período."
        />
      ) : null}

      {agenda.state === "network-error" || agenda.state === "server-error" ? (
        <AsyncState
          kind="error"
          title="Não foi possível carregar a agenda"
          description={
            agenda.state === "network-error"
              ? "Verifique sua conexão e tente novamente."
              : "O serviço encontrou um problema. Tente novamente em alguns instantes."
          }
          action={
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void agenda.refetch()}>
              <RefreshCw aria-hidden="true" /> Tentar novamente
            </Button>
          }
        />
      ) : null}

      {calendarReady && ["ready", "empty"].includes(agenda.state) ? (
        <>
          {view === "day" ? (
            <DayAgenda
              appointments={agenda.appointments}
              selectedDate={selectedDate}
              timeZone={timeZone}
              onSelectAppointment={(appointment) => void openAppointment(appointment)}
            />
          ) : null}
          {view === "week" ? (
            <WeekAgenda
              appointments={agenda.appointments}
              selectedDate={selectedDate}
              today={today}
              timeZone={timeZone}
              onSelectDate={setSelectedDate}
              onSelectAppointment={(appointment) => void openAppointment(appointment)}
            />
          ) : null}
          {view === "month" ? (
            <MonthAgenda
              appointments={agenda.appointments}
              selectedDate={selectedDate}
              today={today}
              timeZone={timeZone}
              onSelectDate={selectMonthDate}
              onSelectAppointment={(appointment) => void openAppointment(appointment)}
            />
          ) : null}
        </>
      ) : null}

      <AppointmentDialog
        open={dialogOpen}
        appointment={editingAppointment}
        clients={clientsQuery.data ?? []}
        selectedDate={selectedDate}
        timeZone={timeZone}
        clientSingular={workspace.clientSingular}
        conflict={agenda.conflict}
        isSubmitting={agenda.isMutating}
        onOpenChange={setDialogOpen}
        onSubmit={submitAppointment}
      />

      <AppointmentDetails
        appointment={selectedAppointment}
        open={detailsOpen}
        timeZone={timeZone}
        clientSingular={workspace.clientSingular}
        conflict={agenda.conflict}
        isMutating={agenda.isMutating}
        onOpenChange={setDetailsOpen}
        onEdit={openEdit}
        onAction={runAction}
      />
    </div>
  )
}
