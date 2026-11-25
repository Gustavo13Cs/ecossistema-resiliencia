"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { isAxiosError } from "axios"
import {
  AlertTriangle,
  ClipboardCheck,
  Plus,
  TrendingUp,
} from "lucide-react"
import { ReauthenticateButton } from "@/components/auth/ReauthenticateButton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { PhysioFunctionalScaleDialog } from "@/components/features/physio/PhysioFunctionalScaleDialog"
import { PhysioFunctionalScalesSection } from "@/components/features/physio/PhysioFunctionalScalesSection"
import { PhysioPainChart } from "@/components/features/physio/PhysioPainChart"
import { PhysioSessionEvolutionDialog } from "@/components/features/physio/PhysioSessionEvolutionDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { usePhysioEvolutions } from "@/hooks/features/usePhysioEvolutions"
import { usePhysioOverview } from "@/hooks/features/usePhysioOverview"
import { usePhysioWorkspace } from "@/hooks/features/usePhysioWorkspace"

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date)
}

export function PhysioEvolutionWorkspace() {
  const { user } = useAuth()
  const isPhysio = Boolean(user?.sub && user.role === "PHYSIO")

  const workspace = usePhysioWorkspace()
  const clientsQuery = useClients("ACTIVE", { enabled: isPhysio })

  const priorityItems = useMemo(
    () =>
      (workspace.data?.items ?? []).filter(
        (item) =>
          item.section === "PAIN_WORSENING" ||
          item.section === "COMPLETED_WITHOUT_EVOLUTION",
      ),
    [workspace.data?.items],
  )

  const activeClients = useMemo(
    () => clientsQuery.data ?? [],
    [clientsQuery.data],
  )

  const [selectedClientId, setSelectedClientId] = useState("")
  const [evolutionOpen, setEvolutionOpen] = useState(false)
  const [scaleOpen, setScaleOpen] = useState(false)
  const [denied, setDenied] = useState(false)

  const effectiveClientId =
    selectedClientId ||
    priorityItems[0]?.clientId ||
    activeClients[0]?.id ||
    ""

  const selectedClientName =
    activeClients.find((c) => c.id === effectiveClientId)?.name ??
    priorityItems.find((i) => i.clientId === effectiveClientId)?.name ??
    "Paciente"

  const overview = usePhysioOverview(effectiveClientId || undefined, {
    enabled: Boolean(isPhysio && effectiveClientId),
  })
  const evolutions = usePhysioEvolutions(effectiveClientId || undefined, {
    enabled: Boolean(isPhysio && effectiveClientId),
  })

  const accessDenied =
    denied ||
    [
      workspace.error,
      clientsQuery.error,
      overview.error,
      evolutions.error,
    ].some(
      (err) => isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0),
    )

  if (!isPhysio) return null

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AsyncState
          kind="error"
          title="Restabeleça seu acesso"
          description="Sua sessão não permite acessar a evolução clínica."
          action={<ReauthenticateButton />}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--sm-border)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sm-brand)]">
            Fisioterapia · Acompanhamento longitudinal
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--sm-ink)] sm:text-3xl">
            <TrendingUp className="h-6 w-6 text-[var(--sm-brand)]" />
            Evolução Clínica & Sessões
          </h1>
          <p className="mt-1 text-sm text-[var(--sm-muted)]">
            Registre evoluções de sessão, acompanhe a curva de dor (EVA) e compare escalas funcionais.
          </p>
        </div>

        {effectiveClientId ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScaleOpen(true)}
              className="min-h-11"
            >
              <ClipboardCheck className="mr-1.5 h-4 w-4" />
              Aplicar escala funcional
            </Button>
            <Button
              type="button"
              onClick={() => setEvolutionOpen(true)}
              className="min-h-11"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Registrar evolução
            </Button>
          </div>
        ) : null}
      </header>

      {priorityItems.length > 0 ? (
        <section
          aria-label="Prioridades de evolução"
          className="rounded-[var(--sm-radius-md)] border border-amber-300 bg-amber-50/70 p-4"
        >
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-950">
            <AlertTriangle className="h-4 w-4" />
            Atenção clínica imediata ({priorityItems.length})
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {priorityItems.map((item, idx) => (
              <button
                key={`${item.section}:${item.clientId}:${idx}`}
                type="button"
                onClick={() => setSelectedClientId(item.clientId)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--sm-radius-sm)] border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  effectiveClientId === item.clientId
                    ? "border-[var(--sm-brand)] bg-[var(--sm-surface)] text-[var(--sm-brand)]"
                    : "border-amber-300 bg-white text-amber-950 hover:bg-amber-100/60"
                }`}
              >
                <span>{item.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {item.section === "PAIN_WORSENING"
                    ? `EVA ${item.previousPain ?? "—"} → ${item.latestPain ?? "—"}/10`
                    : "Sessão sem evolução"}
                </Badge>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {clientsQuery.isPending ? (
        <AsyncState
          kind="loading"
          title="Carregando pacientes..."
          description="Preparando a seleção clínica."
        />
      ) : activeClients.length === 0 && !effectiveClientId ? (
        <AsyncState
          kind="empty"
          title="Nenhum paciente ativo"
          description="Cadastre um paciente para registrar evoluções de sessão e acompanhar a curva de dor."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <div className="min-w-[240px] flex-1">
              <label
                htmlFor="physio-evolution-client-select"
                className="block text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]"
              >
                Paciente selecionado
              </label>
              <select
                id="physio-evolution-client-select"
                value={effectiveClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-3 py-2 text-sm text-[var(--sm-ink)]"
              >
                {activeClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <Link
              href={`/clientes/${effectiveClientId}`}
              className="inline-flex min-h-11 items-center rounded-[var(--sm-radius-sm)] px-3 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]"
            >
              Abrir prontuário completo
            </Link>
          </div>

          {overview.data ? (
            <PhysioPainChart painSeries={overview.data.painSeries} />
          ) : null}

          {effectiveClientId ? (
            <PhysioFunctionalScalesSection
              clientId={effectiveClientId}
              blocked={false}
              onOpenDialog={() => setScaleOpen(true)}
              onAccessDenied={() => setDenied(true)}
            />
          ) : null}

          <section
            aria-labelledby="physio-hub-timeline-heading"
            className="space-y-3 border-t border-[var(--sm-border)] pt-5"
          >
            <h2 id="physio-hub-timeline-heading" className="text-lg font-bold">
              Linha do tempo de sessões — {selectedClientName}
            </h2>
            {evolutions.isPending ? (
              <p className="text-sm text-[var(--sm-muted)]">
                Carregando evoluções...
              </p>
            ) : evolutions.evolutions.length === 0 ? (
              <p className="text-sm text-[var(--sm-muted)]">
                Nenhuma evolução de sessão registrada para este paciente ainda.
              </p>
            ) : (
              <ol className="space-y-3">
                {evolutions.evolutions.map((evo) => (
                  <li
                    key={evo.id}
                    className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[var(--sm-ink)]">
                        {formatDateTime(evo.sessionDate)}
                      </span>
                      {evo.painBefore != null || evo.painAfter != null ? (
                        <Badge variant="outline">
                          EVA {evo.painBefore ?? "—"} → {evo.painAfter ?? "—"}/10
                        </Badge>
                      ) : null}
                    </div>
                    {evo.proceduresApplied.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {evo.proceduresApplied.map((proc) => (
                          <Badge key={proc} variant="secondary">
                            {proc}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-2 whitespace-pre-wrap text-[var(--sm-ink)]">
                      {evo.patientResponse}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      {evolutionOpen && effectiveClientId ? (
        <PhysioSessionEvolutionDialog
          open={true}
          onOpenChange={setEvolutionOpen}
          clientId={effectiveClientId}
          clientName={selectedClientName}
          activePlan={overview.data?.activePlan ?? null}
          unlinkedAppointments={overview.data?.unlinkedAppointments ?? []}
          onAccessDenied={() => setDenied(true)}
        />
      ) : null}

      {scaleOpen && effectiveClientId ? (
        <PhysioFunctionalScaleDialog
          open={true}
          onOpenChange={setScaleOpen}
          clientId={effectiveClientId}
          clientName={selectedClientName}
          onAccessDenied={() => setDenied(true)}
        />
      ) : null}
    </div>
  )
}
