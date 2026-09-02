import Link from "next/link"
import { ArrowRight, Users } from "lucide-react"
import type { WorkspaceDefinition } from "@/lib/professional-workspace"
import type { Client } from "@/types/client"

interface RecentClientsProps {
  clients: readonly Client[]
  workspace: WorkspaceDefinition
}

const formatUpdatedAt = (value: string) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function RecentClients({ clients, workspace }: RecentClientsProps) {
  return (
    <section
      aria-label="Clientes recentes"
      className="min-w-0 overflow-hidden rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)]"
    >
      <div className="flex flex-col items-start gap-3 border-b border-[var(--sm-border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Users aria-hidden="true" className="size-5 shrink-0 text-[var(--sm-brand)]" strokeWidth={1.8} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-[-0.015em] text-[var(--sm-ink)]">
              {workspace.clientPlural} recentes
            </h2>
            <p className="mt-1 text-sm text-[var(--sm-muted)]">
              Atualizados mais recentemente na sua base ativa.
            </p>
          </div>
        </div>
        <Link
          href="/clientes"
          className="inline-flex min-h-11 shrink-0 items-center rounded-[var(--sm-radius-sm)] px-3 text-sm font-bold text-[var(--sm-brand)] no-underline hover:bg-[var(--sm-brand-subtle)]"
        >
          Ver todos
        </Link>
      </div>

      <ul className="divide-y divide-[var(--sm-border)]">
        {clients.map((client) => {
          const updatedAt = formatUpdatedAt(client.updatedAt)
          const initial = client.name.trim().charAt(0).toUpperCase() || "C"

          return (
            <li key={client.id}>
              <Link
                href={`/clientes/${client.id}`}
                aria-label={`Abrir prontuário de ${client.name}`}
                className="group flex min-h-[4.75rem] items-center gap-3 px-5 py-4 text-[var(--sm-ink)] no-underline transition-colors hover:bg-[var(--sm-subtle-hover)] sm:gap-4 sm:px-6"
              >
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--sm-brand-subtle)] text-sm font-bold text-[var(--sm-brand)]"
                >
                  {initial}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{client.name}</span>
                  <span className="mt-1 block truncate text-sm text-[var(--sm-muted)]">
                    {updatedAt ? `Atualizado em ${updatedAt}` : "Atualização não informada"}
                  </span>
                </span>
                <span className="hidden items-center gap-2 text-sm font-bold text-[var(--sm-brand)] sm:inline-flex">
                  Abrir prontuário
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.8}
                  />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
