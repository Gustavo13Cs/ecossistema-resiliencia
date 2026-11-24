"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { ReauthenticateButton } from "@/components/auth/ReauthenticateButton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { PhysioAssessmentModal } from "@/components/PhysioAssessmentModal"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { usePhysioAssessments } from "@/hooks/features/usePhysioAssessments"
import {
  useDeletePhysioEvolution,
  usePhysioEvolutions,
} from "@/hooks/features/usePhysioEvolutions"
import { usePhysioOverview } from "@/hooks/features/usePhysioOverview"
import {
  BODY_PAIN_SYMPTOM_LABELS,
  SIDE_LABELS,
  TEST_RESULT_LABELS,
  TEST_SIDE_LABELS,
} from "@/lib/physio-exam-catalog"
import { queryKeys } from "@/lib/query-keys"
import type { Client } from "@/types/client"
import type {
  GoniometryEntry,
  PhysioSessionEvolution,
} from "@/types/physio"
import { RehabPrintDialog } from "./RehabPrintDialog"
import { PhysioFunctionalScaleDialog } from "./PhysioFunctionalScaleDialog"
import { PhysioFunctionalScalesSection } from "./PhysioFunctionalScalesSection"
import { PhysioPainChart } from "./PhysioPainChart"
import { PhysioSessionEvolutionDialog } from "./PhysioSessionEvolutionDialog"

type PhysioClientRecordProps = {
  client: Client
  pending: boolean
  onAccessDenied?: () => void
}

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] px-4 py-2.5 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)]"

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Data não registrada"
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(date)
}

function dateTimeLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Data não registrada"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date)
}

const isDenied = (error: unknown) =>
  isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)

export function PhysioClientRecord(props: PhysioClientRecordProps) {
  const { user } = useAuth()
  if (!user?.sub || user.role !== "PHYSIO") return null
  return <PhysioRecordBody key={`${user.sub}:${props.client.id}`} {...props} />
}

function PhysioRecordBody({
  client,
  pending,
  onAccessDenied,
}: PhysioClientRecordProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const overview = usePhysioOverview(client.id)
  const assessments = usePhysioAssessments(client.id)
  const evolutions = usePhysioEvolutions(client.id)
  const deleteEvolution = useDeletePhysioEvolution(client.id)

  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [evolutionDialogOpen, setEvolutionDialogOpen] = useState(false)
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [editingEvolution, setEditingEvolution] =
    useState<PhysioSessionEvolution | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [dialogDenied, setDialogDenied] = useState(false)
  const handleDialogDenied = useCallback(() => setDialogDenied(true), [])

  const romSummary = useMemo(() => {
    const bySeries = new Map<
      string,
      {
        joint: string
        movement: string
        side: GoniometryEntry["side"]
        latest: number
        earliest: number
        count: number
        referenceDeg: number | null
      }
    >()

    for (const assessment of assessments.assessments) {
      for (const entry of assessment.goniometry ?? []) {
        const deg = entry.activeDeg ?? entry.passiveDeg
        if (deg == null) continue
        const key = `${entry.joint}::${entry.movement}::${entry.side}`
        const current = bySeries.get(key)
        if (!current) {
          bySeries.set(key, {
            joint: entry.joint,
            movement: entry.movement,
            side: entry.side,
            latest: deg,
            earliest: deg,
            count: 1,
            referenceDeg: entry.referenceDeg ?? null,
          })
        } else {
          current.earliest = deg
          current.count += 1
        }
      }
    }

    const rows = Array.from(bySeries.values())
    const pairMap = new Map<
      string,
      { joint: string; movement: string; right?: number; left?: number }
    >()
    for (const row of rows) {
      if (row.side === "AXIAL") continue
      const pKey = `${row.joint}::${row.movement}`
      const pair = pairMap.get(pKey) ?? {
        joint: row.joint,
        movement: row.movement,
      }
      if (row.side === "RIGHT") pair.right = row.latest
      if (row.side === "LEFT") pair.left = row.latest
      pairMap.set(pKey, pair)
    }

    const asymmetries: string[] = []
    for (const pair of pairMap.values()) {
      if (pair.right != null && pair.left != null) {
        const diff = Math.abs(pair.right - pair.left)
        if (diff >= 10) {
          asymmetries.push(
            `${pair.joint} (${pair.movement}): Direito ${pair.right}° vs Esquerdo ${pair.left}° (${diff}° de diferença)`,
          )
        }
      }
    }

    return { rows, asymmetries }
  }, [assessments.assessments])

  const denied =
    dialogDenied ||
    isDenied(overview.error) ||
    isDenied(assessments.error) ||
    isDenied(evolutions.error)

  useEffect(() => {
    if (denied) onAccessDenied?.()
  }, [denied, onAccessDenied])

  if (denied) {
    return (
      <AsyncState
        kind="error"
        title="Restabeleça seu acesso"
        description="Sua sessão não permite acessar estes registros. Entre novamente ou restabeleça seu acesso para continuar."
        action={<ReauthenticateButton />}
      />
    )
  }

  const archived =
    client.status === "ARCHIVED" || overview.data?.client.status === "ARCHIVED"
  const blocked = pending || archived
  const activePlan = overview.data?.activePlan ?? null
  const latestAssessment = overview.data?.recentAssessments[0] ?? null

  const handleDeleteEvolution = async (evolution: PhysioSessionEvolution) => {
    try {
      await deleteEvolution.mutateAsync({
        id: evolution.id,
        appointmentId: evolution.appointmentId,
      })
      setConfirmDeleteId(null)
      toast.success("Evolução removida.")
    } catch (error) {
      if (isDenied(error)) {
        setDialogDenied(true)
        return
      }
      toast.error("Não foi possível excluir a evolução.")
    }
  }

  return (
    <section
      aria-label="Área de Fisioterapia"
      className="min-w-0 space-y-6 text-[var(--sm-ink)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-[-0.025em]">
          Área de Fisioterapia
        </h2>
        <nav
          aria-label="Ações de fisioterapia"
          className="flex flex-wrap gap-2"
        >
          <Button
            type="button"
            disabled={blocked}
            className="min-h-11"
            onClick={() => {
              setEditingEvolution(null)
              setEvolutionDialogOpen(true)
            }}
          >
            Registrar evolução
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={blocked}
            className="min-h-11"
            onClick={() => setAssessmentModalOpen(true)}
          >
            Nova avaliação fisioterapêutica
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={blocked}
            className="min-h-11"
            onClick={() => setScaleDialogOpen(true)}
          >
            Aplicar escala funcional
          </Button>
          {blocked ? (
            <Button type="button" disabled className="min-h-11" variant="outline">
              Prescrever protocolo
            </Button>
          ) : (
            <Link
              href={`/clientes/${client.id}/nova-reabilitacao`}
              className={actionClass}
            >
              Prescrever protocolo
            </Link>
          )}
          <Link href="/agenda" className={actionClass}>
            Abrir agenda
          </Link>
        </nav>
      </div>

      {archived ? (
        <p role="status" className="text-sm text-[var(--sm-muted)]">
          Prontuário arquivado: o histórico permanece disponível para consulta.
          Novas avaliações, protocolos e evoluções estão bloqueados.
        </p>
      ) : null}

      {overview.isPending ? (
        <LoadingBlock title="Carregando resumo fisioterapêutico" />
      ) : overview.error ? (
        <AsyncState
          kind="error"
          title="Resumo fisioterapêutico indisponível"
          description="Não foi possível consultar o protocolo ativo, avaliação recente e curva de dor."
          action={
            <button
              type="button"
              className={actionClass}
              onClick={() => void overview.refetch()}
            >
              Tentar novamente o resumo
            </button>
          }
        />
      ) : overview.data ? (
        <>
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <section
              aria-labelledby="physio-active-plan"
              className="min-w-0 space-y-3 border-t border-[var(--sm-border)] pt-5"
            >
              <h3 id="physio-active-plan" className="text-lg font-bold">
                Protocolo de reabilitação ativo
              </h3>
              {activePlan ? (
                <>
                  <h4 className="break-words text-lg font-semibold">
                    {activePlan.title}
                  </h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-[var(--sm-muted)]">Objetivo clínico</dt>
                      <dd className="break-words">
                        {activePlan.goal || "Não registrado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--sm-muted)]">Duração</dt>
                      <dd>
                        {activePlan.durationWeeks != null
                          ? `${activePlan.durationWeeks} semanas`
                          : "Não registrado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--sm-muted)]">Fases e condutas</dt>
                      <dd>
                        {activePlan.sessions.length > 0
                          ? activePlan.sessions
                              .map((session, idx) => {
                                const currentMarker =
                                  (activePlan.currentPhaseIndex ?? 0) === idx
                                    ? " [Atual]"
                                    : ""
                                return `${session.name}${currentMarker} (${session.exercises.length} condutas)`
                              })
                              .join(" · ")
                          : "Sem fases cadastradas"}
                      </dd>
                    </div>
                    {(() => {
                      const homeCount = activePlan.sessions.reduce(
                        (total, session) =>
                          total +
                          session.exercises.filter(
                            ex => ex.isHomeExercise && ex.category !== "ELECTROTHERAPY",
                          ).length,
                        0,
                      )
                      return homeCount > 0 ? (
                        <div>
                          <dt className="text-[var(--sm-muted)]">
                            Programa domiciliar
                          </dt>
                          <dd>
                            {homeCount}{" "}
                            {homeCount === 1
                              ? "exercício para casa"
                              : "exercícios para casa"}
                          </dd>
                        </div>
                      ) : null
                    })()}
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setPrintDialogOpen(true)}
                    >
                      PDF Exercícios para Casa
                    </Button>
                    <Link className={actionClass} href="/reabilitacao">
                      Consultar protocolos
                    </Link>
                    {blocked ? null : (
                      <Link
                        className={actionClass}
                        href={`/clientes/${client.id}/nova-reabilitacao`}
                      >
                        Atualizar protocolo
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--sm-muted)]">
                    Nenhum protocolo de reabilitação ativo registrado
                  </p>
                  {blocked ? null : (
                    <Link
                      className={actionClass}
                      href={`/clientes/${client.id}/nova-reabilitacao`}
                    >
                      Prescrever protocolo
                    </Link>
                  )}
                </div>
              )}
            </section>

            <section
              aria-labelledby="physio-latest-assessment"
              className="min-w-0 space-y-3 border-t border-[var(--sm-border)] pt-5"
            >
              <h3 id="physio-latest-assessment" className="text-lg font-bold">
                Avaliação mais recente
              </h3>
              {latestAssessment ? (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">
                    {dateLabel(latestAssessment.date)}
                  </p>
                  <p className="break-words">
                    <span className="text-[var(--sm-muted)]">
                      Queixa principal:{" "}
                    </span>
                    {latestAssessment.chiefComplaint || "Não registrada"}
                  </p>
                  <p>
                    <span className="text-[var(--sm-muted)]">EVA: </span>
                    <span className="font-semibold tabular-nums">
                      {latestAssessment.painLevel != null
                        ? `${latestAssessment.painLevel}/10`
                        : "Não informada"}
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    <span className="text-[var(--sm-muted)]">Conduta: </span>
                    {latestAssessment.treatmentPlan || "Não registrada"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[var(--sm-muted)]">
                  Nenhuma avaliação fisioterapêutica registrada
                </p>
              )}
            </section>
          </div>

          <PhysioPainChart painSeries={overview.data.painSeries} />
        </>
      ) : null}

      <section
        aria-labelledby="physio-session-timeline"
        className="min-w-0 border-t border-[var(--sm-border)] pt-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="physio-session-timeline" className="text-lg font-bold">
            Linha do tempo de sessões
          </h3>
          {!blocked ? (
            <button
              type="button"
              className={actionClass}
              onClick={() => {
                setEditingEvolution(null)
                setEvolutionDialogOpen(true)
              }}
            >
              Nova evolução
            </button>
          ) : null}
        </div>

        {evolutions.isPending ? (
          <LoadingBlock title="Carregando evoluções de sessão" />
        ) : evolutions.error ? (
          <AsyncState
            kind="error"
            title="Evoluções indisponíveis"
            description="Não foi possível carregar a linha do tempo de sessões."
            action={
              <button
                type="button"
                className={actionClass}
                onClick={() => void evolutions.refetch()}
              >
                Tentar novamente as evoluções
              </button>
            }
          />
        ) : evolutions.evolutions.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--sm-muted)]">
            Nenhuma evolução de sessão registrada neste prontuário.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {evolutions.evolutions.map((evo) => (
              <li
                key={evo.id}
                className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <time
                        dateTime={evo.sessionDate}
                        className="text-sm font-bold text-[var(--sm-ink)]"
                      >
                        {dateTimeLabel(evo.sessionDate)}
                      </time>
                      {evo.painBefore != null || evo.painAfter != null ? (
                        <span className="rounded-full bg-[var(--sm-brand-subtle)] px-2.5 py-0.5 text-xs font-bold tabular-nums text-[var(--sm-ink)]">
                          EVA {evo.painBefore ?? "—"} → {evo.painAfter ?? "—"}
                        </span>
                      ) : null}
                      {evo.rehabPlan ? (
                        <span className="text-xs font-semibold text-[var(--sm-muted)]">
                          Protocolo: {evo.rehabPlan.title}
                        </span>
                      ) : null}
                    </div>
                    {evo.appointment ? (
                      <p className="text-xs text-[var(--sm-muted)]">
                        Vinculada ao atendimento de{" "}
                        {dateTimeLabel(evo.appointment.startsAt)} (
                        {evo.appointment.modality === "ONLINE"
                          ? "Online"
                          : "Presencial"}
                        )
                      </p>
                    ) : null}
                  </div>

                  {!blocked ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Editar evolução de ${dateTimeLabel(evo.sessionDate)}`}
                        onClick={() => {
                          setEditingEvolution(evo)
                          setEvolutionDialogOpen(true)
                        }}
                        className="inline-flex min-h-11 items-center gap-1 rounded-[var(--sm-radius-sm)] px-3 text-xs font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]"
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                        Editar
                      </button>
                      {confirmDeleteId === evo.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="min-h-11"
                            disabled={deleteEvolution.isPending}
                            onClick={() => void handleDeleteEvolution(evo)}
                          >
                            Confirmar exclusão
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="min-h-11"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Excluir evolução de ${dateTimeLabel(evo.sessionDate)}`}
                          onClick={() => setConfirmDeleteId(evo.id)}
                          className="inline-flex min-h-11 items-center gap-1 rounded-[var(--sm-radius-sm)] px-3 text-xs font-bold text-[var(--sm-danger)] hover:bg-[var(--sm-danger-subtle)]"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                          Excluir
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>

                {evo.proceduresApplied.length > 0 ? (
                  <ul
                    aria-label="Condutas realizadas"
                    className="mt-3 flex flex-wrap gap-1.5"
                  >
                    {evo.proceduresApplied.map((proc) => (
                      <li
                        key={proc}
                        className="rounded-full border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-2.5 py-0.5 text-xs font-semibold text-[var(--sm-ink)]"
                      >
                        {proc}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[var(--sm-ink)]">
                  {evo.patientResponse}
                </p>

                {evo.nextSteps ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--sm-muted)]">
                    <span className="font-semibold text-[var(--sm-ink)]">
                      Próximos passos:{" "}
                    </span>
                    {evo.nextSteps}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <PhysioFunctionalScalesSection
        clientId={client.id}
        blocked={blocked}
        onOpenDialog={() => setScaleDialogOpen(true)}
        onAccessDenied={handleDialogDenied}
      />

      {romSummary.rows.length > 0 ? (
        <section
          aria-labelledby="physio-rom-summary-heading"
          className="min-w-0 space-y-3 border-t border-[var(--sm-border)] pt-5"
        >
          <h3 id="physio-rom-summary-heading" className="text-lg font-bold">
            Evolução e simetria de ADM (Goniometria)
          </h3>
          {romSummary.asymmetries.length > 0 ? (
            <div
              role="status"
              className="space-y-1 rounded-[var(--sm-radius-sm)] border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950"
            >
              {romSummary.asymmetries.map((msg) => (
                <p key={msg}>Assimetria bilateral: {msg}</p>
              ))}
            </div>
          ) : null}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {romSummary.rows.map((row) => {
              const delta = row.latest - row.earliest
              return (
                <li
                  key={`${row.joint}:${row.movement}:${row.side}`}
                  className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-3.5 text-sm"
                >
                  <p className="font-bold text-[var(--sm-ink)]">
                    {row.joint} — {row.movement}
                  </p>
                  <p className="text-xs font-semibold text-[var(--sm-brand)]">
                    {SIDE_LABELS[row.side]}
                  </p>
                  <p className="mt-1.5 text-base font-extrabold tabular-nums text-[var(--sm-ink)]">
                    {row.latest}°
                    {row.referenceDeg != null ? (
                      <span className="ml-1.5 text-xs font-normal text-[var(--sm-muted)]">
                        (ref. {row.referenceDeg}°)
                      </span>
                    ) : null}
                  </p>
                  {row.count >= 2 ? (
                    <p className="text-xs font-semibold text-[var(--sm-muted)]">
                      Evolução: {delta >= 0 ? `+${delta}°` : `${delta}°`} desde{" "}
                      {row.earliest}°
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="physio-assessment-history"
        className="min-w-0 border-t border-[var(--sm-border)] pt-5"
      >
        <h3 id="physio-assessment-history" className="text-lg font-bold">
          Avaliações fisioterapêuticas registradas
        </h3>
        {assessments.isPending ? (
          <LoadingBlock title="Carregando avaliações fisioterapêuticas" />
        ) : assessments.error ? (
          <AsyncState
            kind="error"
            title="Avaliações indisponíveis"
            description="Não foi possível consultar o histórico de avaliações fisioterapêuticas."
            action={
              <button
                type="button"
                className={actionClass}
                onClick={() => void assessments.refetch()}
              >
                Tentar novamente as avaliações
              </button>
            }
          />
        ) : assessments.assessments.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--sm-muted)]">
            Nenhuma avaliação fisioterapêutica registrada neste prontuário.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-[var(--sm-border)]">
            {assessments.assessments.map((assessment) => (
              <details key={assessment.id} className="py-2">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-[var(--sm-radius-sm)] py-2 font-semibold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)]">
                  <span>Avaliação de {dateLabel(assessment.date)}</span>
                  {assessment.painLevel != null ? (
                    <span className="text-xs font-bold tabular-nums text-[var(--sm-ink)]">
                      EVA {assessment.painLevel}/10
                    </span>
                  ) : null}
                </summary>
                <dl className="grid grid-cols-1 gap-4 pb-4 pt-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--sm-muted)]">Queixa principal</dt>
                    <dd className="whitespace-pre-wrap break-words font-medium">
                      {assessment.chiefComplaint || "Não registrado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--sm-muted)]">
                      História da moléstia atual
                    </dt>
                    <dd className="whitespace-pre-wrap break-words font-medium">
                      {assessment.historyOfIllness || "Não registrado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--sm-muted)]">Análise postural</dt>
                    <dd className="whitespace-pre-wrap break-words font-medium">
                      {assessment.posturalAnalysis || "Não registrado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--sm-muted)]">Palpação</dt>
                    <dd className="whitespace-pre-wrap break-words font-medium">
                      {assessment.palpation || "Não registrado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--sm-muted)]">
                      Mobilidade articular (ADM)
                    </dt>
                    <dd className="whitespace-pre-wrap break-words font-medium">
                      {assessment.jointMobility || "Não registrado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--sm-muted)]">Testes ortopédicos</dt>
                    <dd className="whitespace-pre-wrap break-words font-medium">
                      {assessment.orthopedicTests || "Não registrado"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[var(--sm-muted)]">
                      Conduta / Plano de tratamento
                    </dt>
                    <dd className="whitespace-pre-wrap break-words font-medium">
                      {assessment.treatmentPlan || "Não registrado"}
                    </dd>
                  </div>
                  {assessment.bodyPainMap && assessment.bodyPainMap.length > 0 ? (
                    <div className="sm:col-span-2">
                      <dt className="text-[var(--sm-muted)]">
                        Mapa corporal de dor
                      </dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {assessment.bodyPainMap.map((entry, idx) => (
                          <span
                            key={`${entry.view}:${entry.region}:${idx}`}
                            className="rounded-full border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-2.5 py-0.5 text-xs font-semibold"
                          >
                            {entry.region}: EVA {entry.intensity}/10 (
                            {BODY_PAIN_SYMPTOM_LABELS[entry.symptomType]})
                          </span>
                        ))}
                      </dd>
                    </div>
                  ) : null}
                  {assessment.goniometry && assessment.goniometry.length > 0 ? (
                    <div className="sm:col-span-2">
                      <dt className="text-[var(--sm-muted)]">
                        Goniometria estruturada
                      </dt>
                      <dd className="mt-1 flex flex-wrap gap-2">
                        {assessment.goniometry.map((g, idx) => (
                          <span
                            key={`${g.joint}:${g.movement}:${g.side}:${idx}`}
                            className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-2.5 py-1 text-xs font-medium"
                          >
                            {g.joint} ({g.movement} · {SIDE_LABELS[g.side]}):{" "}
                            {g.activeDeg != null ? `Ativa ${g.activeDeg}°` : ""}
                            {g.activeDeg != null && g.passiveDeg != null
                              ? " / "
                              : ""}
                            {g.passiveDeg != null
                              ? `Passiva ${g.passiveDeg}°`
                              : ""}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ) : null}
                  {assessment.muscleStrength &&
                  assessment.muscleStrength.length > 0 ? (
                    <div className="sm:col-span-2">
                      <dt className="text-[var(--sm-muted)]">
                        Força muscular (MRC)
                      </dt>
                      <dd className="mt-1 flex flex-wrap gap-2">
                        {assessment.muscleStrength.map((m, idx) => (
                          <span
                            key={`${m.muscleGroup}:${m.side}:${idx}`}
                            className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-2.5 py-1 text-xs font-medium"
                          >
                            {m.muscleGroup} ({SIDE_LABELS[m.side]}): Grau{" "}
                            {m.grade}/5
                            {m.painOnResistance ? " · Dor à resistência" : ""}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ) : null}
                  {assessment.orthopedicTestItems &&
                  assessment.orthopedicTestItems.length > 0 ? (
                    <div className="sm:col-span-2">
                      <dt className="text-[var(--sm-muted)]">
                        Testes especiais registrados
                      </dt>
                      <dd className="mt-1 flex flex-wrap gap-2">
                        {assessment.orthopedicTestItems.map((t, idx) => (
                          <span
                            key={`${t.region}:${t.testName}:${t.side}:${idx}`}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              t.result === "POSITIVE"
                                ? "bg-rose-100 text-rose-800"
                                : t.result === "NEGATIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {t.testName} ({TEST_SIDE_LABELS[t.side]}):{" "}
                            {TEST_RESULT_LABELS[t.result]}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </details>
            ))}
          </div>
        )}
      </section>

      {assessmentModalOpen ? (
        <PhysioAssessmentModal
          isOpen={assessmentModalOpen}
          clientId={client.id}
          onClose={() => setAssessmentModalOpen(false)}
          onSuccess={() => {
            setAssessmentModalOpen(false)
            if (user?.sub) {
              void Promise.all([
                queryClient.invalidateQueries({
                  queryKey: queryKeys.physioAssessments(user.sub, client.id),
                }),
                queryClient.invalidateQueries({
                  queryKey: queryKeys.physioOverview(user.sub, client.id),
                }),
                queryClient.invalidateQueries({
                  queryKey: queryKeys.physioWorkspace(user.sub),
                }),
                queryClient.invalidateQueries({
                  queryKey: queryKeys.patientOverview(user.sub, client.id),
                }),
              ])
            }
          }}
        />
      ) : null}

      <PhysioSessionEvolutionDialog
        open={evolutionDialogOpen && !blocked}
        onOpenChange={(open) => {
          setEvolutionDialogOpen(open)
          if (!open) setEditingEvolution(null)
        }}
        clientId={client.id}
        clientName={client.name}
        activePlan={activePlan}
        unlinkedAppointments={overview.data?.unlinkedAppointments ?? []}
        evolution={editingEvolution}
        onAccessDenied={handleDialogDenied}
      />

      <PhysioFunctionalScaleDialog
        open={scaleDialogOpen && !blocked}
        onOpenChange={setScaleDialogOpen}
        clientId={client.id}
        clientName={client.name}
        onAccessDenied={handleDialogDenied}
      />

      {activePlan ? (
        <RehabPrintDialog
          open={printDialogOpen}
          plan={activePlan}
          patientName={client.name}
          defaultMode="home-program"
          onClose={() => setPrintDialogOpen(false)}
        />
      ) : null}
    </section>
  )
}

function LoadingBlock({ title }: { title: string }) {
  return (
    <div
      role="status"
      aria-label={title}
      aria-busy="true"
      className="space-y-3 py-5"
    >
      <span className="sr-only">{title}</span>
      <Skeleton aria-hidden="true" className="h-6 w-48" />
      <Skeleton aria-hidden="true" className="h-20 w-full" />
    </div>
  )
}
