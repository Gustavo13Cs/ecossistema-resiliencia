"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react"
import { toast } from "sonner"
import { AgendaProgress } from "@/components/features/agenda/AgendaProgress"
import { AgendaTaskCard } from "@/components/features/agenda/AgendaTaskCard"
import { ConsentSharingCard } from "@/components/features/agenda/ConsentSharingCard"
import { HealthCheckInDialog } from "@/components/features/agenda/HealthCheckInDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useAgenda } from "@/hooks/features/useAgenda"

function toLocalDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function shiftLocalDate(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number)
  return toLocalDateValue(new Date(year, month - 1, day + amount, 12))
}

function formatSelectedDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(year, month - 1, day, 12))
}

export default function PatientAgendaPage() {
  const { user } = useAuth()
  const [today] = useState(() => toLocalDateValue(new Date()))
  const [selectedDate, setSelectedDate] = useState(today)
  const { data, loading, error, complete, skip, refetch, mutatingId } = useAgenda(
    user?.sub,
    selectedDate,
  )
  const occurrences = useMemo(
    () => [...(data?.occurrences ?? [])].sort((left, right) =>
      left.scheduledFor.localeCompare(right.scheduledFor),
    ),
    [data?.occurrences],
  )

  const handleComplete = async (occurrenceId: string) => {
    try {
      await complete(occurrenceId)
      toast.success("Tarefa concluída")
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível concluir a tarefa.",
      )
    }
  }

  const handleSkip = async (occurrenceId: string, reason: string) => {
    try {
      await skip(occurrenceId, reason)
      toast.success("Tarefa pulada")
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível pular a tarefa."
      toast.error(message)
      throw mutationError
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-24 sm:p-6 md:p-10 md:pb-10">
      <header className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <CalendarDays className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              {selectedDate === today ? "Sua agenda de hoje" : "Sua agenda diária"}
            </h1>
            <p className="mt-1 capitalize text-slate-500">
              {formatSelectedDate(selectedDate)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-11 min-w-11"
              aria-label="Dia anterior"
              onClick={() => setSelectedDate((current) => shiftLocalDate(current, -1))}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => setSelectedDate(today)}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-11 min-w-11"
              aria-label="Próximo dia"
              onClick={() => setSelectedDate((current) => shiftLocalDate(current, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <Input
            type="date"
            aria-label="Selecionar data da agenda"
            className="min-h-11 sm:w-auto"
            value={selectedDate}
            onChange={(event) => {
              if (event.target.value) setSelectedDate(event.target.value)
            }}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <HealthCheckInDialog onCreated={refetch} />
          <ConsentSharingCard />
        </div>
      </header>

      {loading ? (
        <div className="space-y-4" aria-label="Carregando agenda">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
            <div className="space-y-3">
              <div>
                <h2 className="font-bold text-red-900">Não foi possível abrir sua agenda</h2>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => void refetch()}>
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      ) : data ? (
        <section className="space-y-5" aria-label="Tarefas da agenda">
          <AgendaProgress summary={data.summary} />
          {occurrences.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <ClipboardList className="mx-auto size-10 text-slate-300" aria-hidden="true" />
              <h2 className="mt-3 font-bold text-slate-800">Nenhuma tarefa para este dia</h2>
              <p className="mt-1 text-sm text-slate-500">Aproveite o tempo livre para cuidar de você.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {occurrences.map((occurrence) => (
                <AgendaTaskCard
                  key={occurrence.id}
                  occurrence={occurrence}
                  mutating={mutatingId === occurrence.id}
                  onComplete={handleComplete}
                  onSkip={handleSkip}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
