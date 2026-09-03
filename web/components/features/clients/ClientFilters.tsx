import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WorkspaceDefinition } from "@/lib/professional-workspace"
import type { ClientStatus } from "@/types/client"

interface ClientFiltersProps {
  search: string
  status: ClientStatus
  workspace: WorkspaceDefinition
  onSearchChange: (value: string) => void
  onStatusChange: (status: ClientStatus) => void
}

export function ClientFilters({ search, status, workspace, onSearchChange, onStatusChange }: ClientFiltersProps) {
  const plural = workspace.clientPlural.toLocaleLowerCase("pt-BR")

  return (
    <div className="flex flex-col gap-4 border-b border-[var(--sm-border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <label className="relative block min-w-0 flex-1 sm:max-w-md">
        <span className="sr-only">Buscar {plural}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sm-muted)]" strokeWidth={1.8} />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nome, contato ou objetivo"
          className="min-h-11 bg-[var(--sm-surface)] pl-10 text-base md:text-sm"
        />
      </label>

      <div role="group" aria-label={`Status dos ${plural}`} className="grid grid-cols-2 gap-1 rounded-[var(--sm-radius-sm)] bg-[var(--sm-canvas)] p-1">
        {(["ACTIVE", "ARCHIVED"] as const).map((filterStatus) => {
          const isActive = filterStatus === status
          const label = filterStatus === "ACTIVE" ? "Ativos" : "Arquivados"
          return (
            <Button
              key={filterStatus}
              type="button"
              variant="ghost"
              aria-pressed={isActive}
              onClick={() => onStatusChange(filterStatus)}
              className={isActive
                ? "min-h-10 bg-[var(--sm-surface)] font-bold text-[var(--sm-ink)] shadow-[var(--sm-shadow-rest)] hover:bg-[var(--sm-surface)]"
                : "min-h-10 text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"}
            >
              {label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
