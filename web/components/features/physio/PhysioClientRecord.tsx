"use client"

import { useEffect, useState } from "react"
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
import { queryKeys } from "@/lib/query-keys"
import type { Client } from "@/types/client"
import type { PhysioSessionEvolution } from "@/types/physio"
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
  const [editingEvolution, setEditingEvolution] =
    useState<PhysioSessionEvolution | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [dialogDenied, setDialogDenied] = useState(false)

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
                              .map(
                                (session) =>
                                  `${session.name} (${session.exercises.length} condutas)`,
                              )
                              .join(" · ")
                          : "Sem fases cadastradas"}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
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
        onAccessDenied={() => setDialogDenied(true)}
      />
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
