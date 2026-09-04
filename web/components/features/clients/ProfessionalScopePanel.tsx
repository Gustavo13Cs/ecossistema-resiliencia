import Link from "next/link"
import { ArrowUpRight, ShieldCheck } from "lucide-react"
import { canAccessProfessionalPath, getWorkspaceDefinition } from "@/lib/professional-workspace"
import type { ProfessionalRole } from "@/types/auth"

const ROLE_ACTIONS = {
  NUTRITIONIST: { label: "Criar plano alimentar", path: "nova-dieta" },
  PERSONAL: { label: "Criar planilha", path: "novo-treino" },
  PHYSIO: { label: "Criar plano de reabilitação", path: "nova-reabilitacao" },
} as const satisfies Record<ProfessionalRole, { label: string; path: string }>

interface ProfessionalScopePanelProps {
  role: ProfessionalRole
  clientId: string
}

export function ProfessionalScopePanel({ role, clientId }: ProfessionalScopePanelProps) {
  const workspace = getWorkspaceDefinition(role)
  const action = ROLE_ACTIONS[role]
  const href = `/clientes/${clientId}/${action.path}`
  const canAccess = canAccessProfessionalPath(role, href)

  return (
    <aside aria-labelledby="professional-scope-title" className="rounded-[var(--sm-radius-lg)] border border-[var(--sm-brand-border)] bg-[var(--sm-brand-subtle)] p-5 sm:p-6">
      <ShieldCheck aria-hidden="true" className="size-6 text-[var(--sm-brand)]" />
      <h2 id="professional-scope-title" className="mt-4 text-lg font-black text-[var(--sm-ink)]">
        Área de {workspace.areaLabel}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--sm-muted)]">
        Este prontuário mostra apenas o contexto da sua especialidade. Outros domínios profissionais não são carregados.
      </p>
      {canAccess ? (
        <Link
          href={href}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-between rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand)] px-4 text-sm font-bold text-white transition hover:bg-[var(--sm-brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-brand)] focus-visible:ring-offset-2"
        >
          {action.label}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-[var(--sm-muted)]">
        Históricos clínicos antigos não são presumidos como migrados nesta versão.
      </p>
    </aside>
  )
}
