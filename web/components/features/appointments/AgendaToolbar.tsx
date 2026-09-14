import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Client } from "@/types/client"
import type {
  AgendaView,
  AppointmentFilters,
  AppointmentStatus,
} from "@/types/appointment"

const VIEW_LABELS: Record<AgendaView, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
}

const STATUS_OPTIONS: Array<{
  value: AppointmentStatus | "all"
  label: string
}> = [
  { value: "all", label: "Todos os estados" },
  { value: "SCHEDULED", label: "Agendados" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "COMPLETED", label: "Concluídos" },
  { value: "CANCELLED", label: "Cancelados" },
  { value: "NO_SHOW", label: "Faltas" },
]

export function AgendaToolbar({
  view,
  selectedDate,
  periodLabel,
  clients,
  filters,
  clientPlural,
  onViewChange,
  onDateChange,
  onPrevious,
  onNext,
  onToday,
  onFiltersChange,
}: {
  view: AgendaView
  selectedDate: string
  periodLabel: string
  clients: Client[]
  filters: AppointmentFilters
  clientPlural: string
  onViewChange: (view: AgendaView) => void
  onDateChange: (date: string) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onFiltersChange: (filters: AppointmentFilters) => void
}) {
  return (
    <section
      aria-label="Controles da agenda"
      className="border-y border-[var(--sm-border)] bg-[var(--sm-surface)] px-4 py-4 sm:rounded-[var(--sm-radius-md)] sm:border sm:px-5 sm:shadow-[var(--sm-shadow-rest)]"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onToday}
          >
            <RotateCcw aria-hidden="true" />
            Hoje
          </Button>
          <div className="flex items-center" aria-label="Navegar pelo período">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              onClick={onPrevious}
              aria-label="Período anterior"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              onClick={onNext}
              aria-label="Próximo período"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <label className="relative">
            <span className="sr-only">Selecionar data</span>
            <CalendarDays
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sm-muted)]"
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                if (event.target.value) onDateChange(event.target.value)
              }}
              className="min-h-11 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] py-2 pl-9 pr-3 text-sm font-semibold text-[var(--sm-ink)]"
            />
          </label>
          <p
            className="w-full pt-1 text-base font-bold capitalize text-[var(--sm-ink)] sm:w-auto sm:pl-2 sm:pt-0"
            aria-live="polite"
          >
            {periodLabel}
          </p>
        </div>

        <div className="flex w-full rounded-[var(--sm-radius-sm)] bg-[var(--sm-canvas)] p-1 xl:w-auto">
          {(Object.keys(VIEW_LABELS) as AgendaView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onViewChange(option)}
              aria-pressed={view === option}
              className={`min-h-11 flex-1 rounded-md px-4 text-sm font-bold transition-colors xl:flex-none ${
                view === option
                  ? "bg-[var(--sm-surface)] text-[var(--sm-brand)] shadow-[var(--sm-shadow-rest)]"
                  : "text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
              }`}
            >
              {VIEW_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-[var(--sm-border)] pt-4 sm:flex-row sm:items-center">
        <span className="text-sm font-semibold text-[var(--sm-muted)]">Filtrar por</span>
        <Select
          value={filters.clientId ?? "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              clientId: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="min-h-11 w-full sm:w-64">
            <SelectValue placeholder={clientPlural} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os {clientPlural.toLowerCase()}</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              status:
                value === "all" ? undefined : (value as AppointmentStatus),
            })
          }
        >
          <SelectTrigger className="min-h-11 w-full sm:w-52">
            <SelectValue placeholder="Todos os estados" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  )
}
