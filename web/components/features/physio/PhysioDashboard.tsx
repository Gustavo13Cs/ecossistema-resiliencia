"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { isAxiosError } from "axios"
import { ReauthenticateButton } from "@/components/auth/ReauthenticateButton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Skeleton } from "@/components/ui/skeleton"
import { usePersonalDayAgenda } from "@/hooks/features/usePersonalDayAgenda"
import { usePhysioWorkspace } from "@/hooks/features/usePhysioWorkspace"
import type { PhysioWorkspaceItem } from "@/types/physio"
import { PhysioAgendaPreview } from "./PhysioAgendaPreview"
import { PhysioPatientPicker } from "./PhysioPatientPicker"
import { PhysioSessionEvolutionDialog } from "./PhysioSessionEvolutionDialog"

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] px-4 py-2.5 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]"

type EvolutionModalTarget = {
  clientId: string
  clientName: string
  appointmentId?: string | null
  appointmentLabel?: string | null
  defaultSessionDate?: string | null
}

function formatDateTimeLabel(value: string, timeZone: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timeZone || undefined,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function formatDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Data não registrada"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function PhysioDashboard() {
  const workspace = usePhysioWorkspace()
  const agenda = usePersonalDayAgenda()
  const router = useRouter()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerAccessDenied, setPickerAccessDenied] = useState(false)
  const [evolutionTarget, setEvolutionTarget] =
    useState<EvolutionModalTarget | null>(null)

  const handlePickerAccessDenied = useCallback(
    () => setPickerAccessDenied(true),
    [],
  )

  const denied =
    pickerAccessDenied ||
    (isAxiosError(workspace.error) &&
      [401, 403].includes(workspace.error.response?.status ?? 0)) ||
    agenda.state === "unauthorized"

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

  const data = workspace.data
  const items = data?.items ?? []

  const bySection = (section: PhysioWorkspaceItem["section"]) =>
    items.filter((item) => item.section === section).slice(0, 5)

  return (
    <div className="min-w-0 space-y-7 pb-10">
      <header className="flex flex-col items-start gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[var(--sm-ink)]">
            Área de fisioterapia
          </h1>
          <p className="mt-2 text-[var(--sm-muted)]">
            {agenda.period
              ? new Intl.DateTimeFormat("pt-BR", {
                  timeZone: agenda.timeZone,
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date(agenda.period.from))
              : "Preparando seu dia"}
          </p>
        </div>

        <nav aria-label="Ações rápidas" className="flex flex-wrap gap-2">
          <Link
            href="/clientes/novo"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand)] px-4 py-2.5 text-sm font-bold text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)]"
          >
            Novo paciente
          </Link>
          <button
            type="button"
            disabled={!data || data.counts.activePatients === 0}
            className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-50`}
            onClick={() => setPickerOpen(true)}
          >
            Prescrever protocolo
          </button>
          <Link href="/agenda" className={actionClass}>
            Abrir agenda
          </Link>
          <Link href="/relatorios" className={actionClass}>
            Relatórios
          </Link>
        </nav>
      </header>

      <PhysioAgendaPreview
        agenda={agenda}
        evolvedAppointmentIds={data?.evolvedAppointmentIds ?? []}
        onRegisterEvolution={(appointment) => {
          setEvolutionTarget({
            clientId: appointment.clientId,
            clientName: appointment.client.name,
            appointmentId: appointment.id,
            appointmentLabel: formatDateTimeLabel(
              appointment.startsAt,
              agenda.timeZone,
            ),
            defaultSessionDate: appointment.startsAt,
          })
        }}
      />

      {workspace.isPending ? (
        <div
          role="status"
          aria-label="Carregando resumo"
          aria-busy="true"
          className="space-y-4 py-5"
        >
          <span className="sr-only">
            Buscando os indicadores clínicos da sua base privada.
          </span>
          <Skeleton aria-hidden="true" className="h-6 w-48" />
          <Skeleton aria-hidden="true" className="h-24 w-full" />
        </div>
      ) : workspace.error ? (
        <AsyncState
          kind="error"
          title="Resumo indisponível"
          description="Não foi possível carregar os pacientes e pendências da sua base."
          action={
            <button
              type="button"
              className={actionClass}
              onClick={() => void workspace.refetch()}
            >
              Tentar novamente
            </button>
          }
        />
      ) : data ? (
        <>
          <section
            aria-label="Resumo da base"
            className="border-y border-[var(--sm-border)] py-5"
          >
            <h2 className="text-lg font-bold text-[var(--sm-ink)]">
              Resumo da base
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {(
                [
                  ["Pacientes ativos", data.counts.activePatients],
                  [
                    "Sessões sem evolução",
                    data.counts.completedWithoutEvolution,
                  ],
                  ["Dor em piora", data.counts.painWorsening],
                  [
                    "Reavaliações pendentes",
                    data.counts.overdueReassessments,
                  ],
                  ["Sem protocolo ativo", data.counts.withoutActivePlan],
                  ["Pacotes perto do fim", data.counts.expiringPackages ?? 0],
                  ["Pacientes arquivados", data.counts.archivedPatients],
                ] as const
              ).map(([label, count]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-3 sm:flex-col sm:gap-1"
                >
                  <dt className="text-sm font-semibold text-[var(--sm-muted)]">
                    {label}
                  </dt>
                  <dd className="text-2xl font-bold tabular-nums text-[var(--sm-ink)]">
                    {count}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {data.counts.activePatients === 0 ? (
            <AsyncState
              kind="empty"
              title={
                data.counts.archivedPatients === 0
                  ? "Sua base começa aqui"
                  : "Sua base tem apenas pacientes arquivados"
              }
              description={
                data.counts.archivedPatients === 0
                  ? "Cadastrar paciente → Avaliar caso → Prescrever protocolo → Registrar evoluções"
                  : "Consulte os prontuários arquivados ou cadastre um novo paciente."
              }
              action={
                data.counts.archivedPatients > 0 ? (
                  <Link
                    className={actionClass}
                    href="/clientes?status=ARCHIVED"
                  >
                    Ver pacientes arquivados
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid min-w-0 gap-7 xl:grid-cols-2">
              <section
                aria-label="Sessões concluídas sem evolução"
                className="min-w-0"
              >
                <h2 className="text-lg font-bold text-[var(--sm-ink)]">
                  Sessões concluídas sem evolução
                </h2>
                <p className="mt-1 text-sm text-[var(--sm-muted)]">
                  Atendimentos encerrados nos últimos 30 dias aguardando registro clínico.
                </p>
                {bySection("COMPLETED_WITHOUT_EVOLUTION").length === 0 ? (
                  <p className="py-5 text-sm text-[var(--sm-muted)]">
                    Nenhuma sessão concluída sem evolução
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-[var(--sm-border)]">
                    {bySection("COMPLETED_WITHOUT_EVOLUTION").map((item) => (
                      <li
                        key={`${item.clientId}:${item.appointmentId ?? "none"}`}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
                      >
                        <div className="min-w-0 flex-1 basis-40">
                          <Link
                            href={`/clientes/${item.clientId}`}
                            className="inline-flex min-h-11 items-center break-words font-bold text-[var(--sm-brand)] hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="text-sm text-[var(--sm-muted)]">
                            {item.appointmentStartsAt
                              ? `Sessão em ${formatDateTimeLabel(item.appointmentStartsAt, agenda.timeZone)}`
                              : "Atendimento concluído"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setEvolutionTarget({
                              clientId: item.clientId,
                              clientName: item.name,
                              appointmentId: item.appointmentId ?? null,
                              appointmentLabel: item.appointmentStartsAt
                                ? formatDateTimeLabel(
                                    item.appointmentStartsAt,
                                    agenda.timeZone,
                                  )
                                : null,
                              defaultSessionDate:
                                item.appointmentStartsAt ?? null,
                            })
                          }
                          className={actionClass}
                        >
                          Registrar evolução
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-label="Pacientes com dor em piora" className="min-w-0">
                <h2 className="text-lg font-bold text-[var(--sm-ink)]">
                  Pacientes com dor em piora
                </h2>
                <p className="mt-1 text-sm text-[var(--sm-muted)]">
                  Aumento na Escala Visual Analógica (EVA) em relação ao registro anterior.
                </p>
                {bySection("PAIN_WORSENING").length === 0 ? (
                  <p className="py-5 text-sm text-[var(--sm-muted)]">
                    Nenhum paciente com piora de dor registrada
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-[var(--sm-border)]">
                    {bySection("PAIN_WORSENING").map((item) => (
                      <li
                        key={item.clientId}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 py-3"
                      >
                        <div className="min-w-0 flex-1 basis-40">
                          <Link
                            href={`/clientes/${item.clientId}`}
                            className="inline-flex min-h-11 items-center break-words font-bold text-[var(--sm-brand)] hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="text-sm font-semibold text-[var(--sm-danger)]">
                            EVA {item.previousPain ?? "-"} →{" "}
                            {item.latestPain ?? "-"}/10
                          </p>
                        </div>
                        <Link
                          href={`/clientes/${item.clientId}`}
                          className={actionClass}
                        >
                          Abrir prontuário
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-label="Reavaliações pendentes" className="min-w-0">
                <h2 className="text-lg font-bold text-[var(--sm-ink)]">
                  Reavaliações pendentes
                </h2>
                <p className="mt-1 text-sm text-[var(--sm-muted)]">
                  Pacientes sem avaliação ou com última avaliação há 30 dias ou mais.
                </p>
                {bySection("OVERDUE_REASSESSMENT").length === 0 ? (
                  <p className="py-5 text-sm text-[var(--sm-muted)]">
                    Nenhuma reavaliação pendente
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-[var(--sm-border)]">
                    {bySection("OVERDUE_REASSESSMENT").map((item) => (
                      <li
                        key={item.clientId}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 py-3"
                      >
                        <div className="min-w-0 flex-1 basis-40">
                          <Link
                            href={`/clientes/${item.clientId}`}
                            className="inline-flex min-h-11 items-center break-words font-bold text-[var(--sm-brand)] hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="text-sm text-[var(--sm-muted)]">
                            {item.lastAssessmentDate
                              ? `Última avaliação em ${formatDateLabel(item.lastAssessmentDate)}`
                              : "Sem avaliação fisioterapêutica registrada"}
                          </p>
                        </div>
                        <Link
                          href={`/clientes/${item.clientId}`}
                          className={actionClass}
                        >
                          Avaliar paciente
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                aria-label="Pacientes sem protocolo ativo"
                className="min-w-0"
              >
                <h2 className="text-lg font-bold text-[var(--sm-ink)]">
                  Pacientes sem protocolo ativo
                </h2>
                <p className="mt-1 text-sm text-[var(--sm-muted)]">
                  Pacientes ativos ainda sem plano de reabilitação vigente.
                </p>
                {bySection("WITHOUT_ACTIVE_PLAN").length === 0 ? (
                  <p className="py-5 text-sm text-[var(--sm-muted)]">
                    Nenhum paciente sem protocolo ativo
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-[var(--sm-border)]">
                    {bySection("WITHOUT_ACTIVE_PLAN").map((item) => (
                      <li
                        key={item.clientId}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 py-3"
                      >
                        <div className="min-w-0 flex-1 basis-40">
                          <Link
                            href={`/clientes/${item.clientId}`}
                            className="inline-flex min-h-11 items-center break-words font-bold text-[var(--sm-brand)] hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="break-words text-sm text-[var(--sm-muted)]">
                            {item.goal || "Objetivo não informado"}
                          </p>
                        </div>
                        <Link
                          href={`/clientes/${item.clientId}/nova-reabilitacao`}
                          className={actionClass}
                        >
                          Prescrever protocolo
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                aria-label="Pacotes perto do fim"
                className="min-w-0"
              >
                <h2 className="text-lg font-bold text-[var(--sm-ink)]">
                  Pacotes perto do fim
                </h2>
                <p className="mt-1 text-sm text-[var(--sm-muted)]">
                  Pacientes com pacotes de sessões próximos ao encerramento ou
                  renovação.
                </p>
                {bySection("EXPIRING_PACKAGE").length === 0 ? (
                  <p className="py-5 text-sm text-[var(--sm-muted)]">
                    Nenhum pacote próximo ao encerramento
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-[var(--sm-border)]">
                    {bySection("EXPIRING_PACKAGE").map((item) => (
                      <li
                        key={item.clientId}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 py-3"
                      >
                        <div className="min-w-0 flex-1 basis-40">
                          <Link
                            href={`/clientes/${item.clientId}`}
                            className="inline-flex min-h-11 items-center break-words font-bold text-[var(--sm-brand)] hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="break-words text-sm text-[var(--sm-muted)]">
                            {item.packageTitle || "Pacote de sessões"}
                            {item.totalSessions != null
                              ? ` · ${item.completedSessions ?? 0}/${item.totalSessions} sessões`
                              : ""}
                          </p>
                        </div>
                        <Link
                          href={`/clientes/${item.clientId}`}
                          className={actionClass}
                        >
                          Ver pacote
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                aria-label="Pacientes recentes"
                className="min-w-0 xl:col-span-2"
              >
                <h2 className="text-lg font-bold text-[var(--sm-ink)]">
                  Pacientes recentes
                </h2>
                <p className="mt-1 text-sm text-[var(--sm-muted)]">
                  Atualizações cadastrais mais recentes da sua base.
                </p>
                {bySection("RECENT").length === 0 ? (
                  <p className="py-5 text-sm text-[var(--sm-muted)]">
                    Nenhum paciente recente
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-[var(--sm-border)] sm:grid sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0">
                    {bySection("RECENT").map((item) => (
                      <li
                        key={item.clientId}
                        className="flex min-w-0 items-center justify-between gap-x-4 border-b border-[var(--sm-border)] py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/clientes/${item.clientId}`}
                            aria-label={`Abrir prontuário de ${item.name}`}
                            className="inline-flex min-h-11 items-center break-words font-bold text-[var(--sm-brand)] hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="break-words text-sm text-[var(--sm-muted)]">
                            {item.goal || "Objetivo não informado"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </>
      ) : null}

      <PhysioPatientPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAccessDenied={handlePickerAccessDenied}
        onSelect={(clientId) =>
          router.push(`/clientes/${clientId}/nova-reabilitacao`)
        }
      />

      {evolutionTarget ? (
        <PhysioSessionEvolutionDialog
          open={Boolean(evolutionTarget)}
          onOpenChange={(open) => {
            if (!open) setEvolutionTarget(null)
          }}
          clientId={evolutionTarget.clientId}
          clientName={evolutionTarget.clientName}
          appointmentId={evolutionTarget.appointmentId}
          appointmentLabel={evolutionTarget.appointmentLabel}
          defaultSessionDate={evolutionTarget.defaultSessionDate}
          onAccessDenied={handlePickerAccessDenied}
        />
      ) : null}
    </div>
  )
}
