"use client"

import Link from "next/link"
import { AsyncState } from "@/components/feedback/AsyncState"
import { useAuth } from "@/contexts/auth-context"
import { useProfessionalDashboard } from "@/hooks/features/useProfessionalDashboard"
import { getWorkspaceDefinition } from "@/lib/professional-workspace"
import { DashboardSummary } from "./DashboardSummary"
import { QuickActions } from "./QuickActions"
import { RecentClients } from "./RecentClients"

const STATE_CONTENT = {
  loading: {
    kind: "loading",
    title: "Carregando sua visão geral",
    description: "Buscando os registros da sua base privada.",
  },
  unauthorized: {
    kind: "error",
    title: "Base privada indisponível",
    description: "Sua sessão não permite acessar estes registros. Entre novamente para continuar.",
  },
  "network-error": {
    kind: "error",
    title: "Sem conexão com o SafeMove",
    description: "Verifique sua conexão e tente abrir esta página novamente.",
  },
  "server-error": {
    kind: "error",
    title: "SafeMove temporariamente indisponível",
    description: "Não foi possível carregar sua base agora. Tente novamente em alguns instantes.",
  },
} as const

export function ProfessionalDashboard() {
  const { user } = useAuth()
  const { activeClients, archivedClients, recentClients, status } = useProfessionalDashboard()

  if (!user || user.role === "ADMIN") {
    return (
      <AsyncState
        kind="error"
        title="Base privada indisponível"
        description="Esta área é exclusiva para contas profissionais."
      />
    )
  }

  const workspace = getWorkspaceDefinition(user.role)

  if (status === "empty") {
    const singular = workspace.clientSingular.toLocaleLowerCase("pt-BR")
    return (
      <AsyncState
        kind="empty"
        title="Sua base começa aqui"
        description={`Cadastre seu primeiro ${singular} para iniciar um prontuário privado.`}
        action={(
          <Link
            href="/clientes/novo"
            className="inline-flex min-h-11 items-center rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand)] px-4 py-2.5 text-sm font-bold text-[var(--sm-on-brand)] no-underline hover:bg-[var(--sm-brand-hover)]"
          >
            Novo {singular}
          </Link>
        )}
      />
    )
  }

  if (status !== "ready") {
    const content = STATE_CONTENT[status]
    return <AsyncState kind={content.kind} title={content.title} description={content.description} />
  }

  const firstName = user.name?.trim().split(/\s+/)[0] || "Profissional"

  return (
    <div className="min-w-0 space-y-8 pb-10">
      <header className="flex min-w-0 flex-col items-start gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between 2xl:gap-8">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[var(--sm-ink)]">
            Olá, {firstName}
          </h1>
          <p className="mt-2 max-w-[65ch] text-base text-[var(--sm-muted)]">
            Acompanhe sua base privada na área de {workspace.areaLabel.toLocaleLowerCase("pt-BR")}.
          </p>
        </div>
        <QuickActions workspace={workspace} />
      </header>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)]">
        <DashboardSummary
          activeCount={activeClients.length}
          archivedCount={archivedClients.length}
          workspace={workspace}
        />
        <RecentClients clients={recentClients} workspace={workspace} />
      </div>
    </div>
  )
}
