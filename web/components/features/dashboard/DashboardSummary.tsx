import type { WorkspaceDefinition } from "@/lib/professional-workspace"

interface DashboardSummaryProps {
  activeCount: number
  archivedCount: number
  workspace: WorkspaceDefinition
}

export function DashboardSummary({ activeCount, archivedCount, workspace }: DashboardSummaryProps) {
  const plural = workspace.clientPlural.toLocaleLowerCase("pt-BR")

  return (
    <section
      aria-label="Resumo da base"
      className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)]"
    >
      <div className="border-b border-[var(--sm-border)] px-5 py-5 sm:px-6">
        <h2 className="text-lg font-bold tracking-[-0.015em] text-[var(--sm-ink)]">Resumo da base</h2>
        <p className="mt-1 text-sm text-[var(--sm-muted)]">
          Registros privados de {plural} vinculados à sua conta.
        </p>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-[var(--sm-border)]">
        <div className="min-w-0 px-5 py-6 sm:px-6">
          <dt className="text-sm font-semibold text-[var(--sm-muted)]">{workspace.clientPlural} ativos</dt>
          <dd className="mt-2 text-3xl font-extrabold tabular-nums tracking-[-0.03em] text-[var(--sm-ink)]">
            {activeCount}
          </dd>
        </div>
        <div className="min-w-0 px-5 py-6 sm:px-6">
          <dt className="text-sm font-semibold text-[var(--sm-muted)]">{workspace.clientPlural} arquivados</dt>
          <dd className="mt-2 text-3xl font-extrabold tabular-nums tracking-[-0.03em] text-[var(--sm-ink)]">
            {archivedCount}
          </dd>
        </div>
      </dl>
    </section>
  )
}
