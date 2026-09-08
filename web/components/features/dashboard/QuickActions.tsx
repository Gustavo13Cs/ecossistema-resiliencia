import Link from "next/link"
import { Archive, UserPlus, Users } from "lucide-react"
import type { WorkspaceDefinition } from "@/lib/professional-workspace"

interface QuickActionsProps {
  workspace: WorkspaceDefinition
}

export function QuickActions({ workspace }: QuickActionsProps) {
  const singular = workspace.clientSingular.toLocaleLowerCase("pt-BR")
  const plural = workspace.clientPlural.toLocaleLowerCase("pt-BR")

  return (
    <nav
      aria-label="Ações rápidas"
      className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 2xl:flex 2xl:w-auto 2xl:flex-wrap 2xl:items-center 2xl:justify-end"
    >
      <Link
        href="/clientes/novo"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand)] px-4 py-2.5 text-center text-sm font-bold text-[var(--sm-on-brand)] no-underline shadow-[var(--sm-shadow-rest)] transition-colors hover:bg-[var(--sm-brand-hover)] 2xl:w-auto"
      >
        <UserPlus aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
        Novo {singular}
      </Link>
      <Link
        href="/clientes"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-4 py-2.5 text-center text-sm font-bold text-[var(--sm-ink)] no-underline shadow-[var(--sm-shadow-rest)] transition-colors hover:border-[var(--sm-brand)] hover:text-[var(--sm-brand)] 2xl:w-auto"
      >
        <Users aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
        Ver {plural}
      </Link>
      <Link
        href="/clientes?status=ARCHIVED"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sm-radius-sm)] px-3 py-2.5 text-center text-sm font-bold text-[var(--sm-muted)] no-underline transition-colors hover:bg-[var(--sm-subtle-hover)] hover:text-[var(--sm-ink)] 2xl:w-auto"
      >
        <Archive aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
        {workspace.clientPlural} arquivados
      </Link>
    </nav>
  )
}
