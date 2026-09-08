import { Clock3, ShieldCheck } from "lucide-react"
import { getWorkspaceDefinition } from "@/lib/professional-workspace"
import type { ProfessionalRole } from "@/types/auth"

const ROLE_DOMAINS = {
  NUTRITIONIST: "Planos alimentares",
  PERSONAL: "Planilhas de treino",
  PHYSIO: "Planos de reabilitação",
} as const satisfies Record<ProfessionalRole, string>

interface ProfessionalScopePanelProps {
  role: ProfessionalRole
}

export function ProfessionalScopePanel({ role }: ProfessionalScopePanelProps) {
  const workspace = getWorkspaceDefinition(role)
  const domain = ROLE_DOMAINS[role]

  return (
    <aside aria-labelledby="professional-scope-title" className="rounded-[var(--sm-radius-lg)] border border-[var(--sm-brand-border)] bg-[var(--sm-brand-subtle)] p-5 sm:p-6">
      <ShieldCheck aria-hidden="true" className="size-6 text-[var(--sm-brand)]" />
      <h2 id="professional-scope-title" className="mt-4 text-lg font-black text-[var(--sm-ink)]">
        Área de {workspace.areaLabel}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--sm-muted)]">
        Este prontuário mostra apenas o contexto da sua especialidade. Outros domínios profissionais não são carregados.
      </p>
      <div
        role="status"
        aria-label={`${domain} em migração`}
        className="mt-5 rounded-[var(--sm-radius-sm)] border border-[var(--sm-brand-border)] bg-[var(--sm-surface)] p-4"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--sm-ink)]">
          <Clock3 aria-hidden="true" className="size-4 text-[var(--sm-brand)]" />
          {domain}
        </div>
        <p className="mt-1 text-sm text-[var(--sm-muted)]">
          Em migração. Esta ação ficará disponível quando o domínio usar o prontuário Client com autorização própria.
        </p>
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--sm-muted)]">
        Históricos clínicos antigos não são presumidos como migrados nesta versão.
      </p>
    </aside>
  )
}
