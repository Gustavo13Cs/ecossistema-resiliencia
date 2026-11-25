"use client"

import Link from "next/link"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Skeleton } from "@/components/ui/skeleton"
import type { usePersonalDayAgenda } from "@/hooks/features/usePersonalDayAgenda"
import { APPOINTMENT_STATUS_LABELS } from "@/lib/appointment-display"
import type { Appointment } from "@/types/appointment"

const KIND_LABELS: Record<Appointment["kind"], string> = {
  FIRST_VISIT: "Primeiro atendimento",
  FOLLOW_UP: "Retorno",
  ASSESSMENT: "Avaliação",
  SESSION: "Sessão",
  OTHER: "Outro atendimento",
}

export function PhysioAgendaPreview({
  agenda,
  evolvedAppointmentIds,
  onRegisterEvolution,
}: {
  agenda: ReturnType<typeof usePersonalDayAgenda>
  evolvedAppointmentIds: readonly string[]
  onRegisterEvolution: (appointment: Appointment) => void
}) {
  const { state, timeZone } = agenda
  const evolvedSet = new Set(evolvedAppointmentIds)
  const appointments = agenda.appointments
    .filter((item) => item.status !== "CANCELLED")
    .sort(
      (a, b) =>
        Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 5)
  const failed = state === "network-error" || state === "server-error"

  return (
    <section
      aria-label="Atendimentos de hoje"
      className="min-w-0 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--sm-ink)]">
          Atendimentos de hoje
        </h2>
        <Link
          href="/agenda"
          className="inline-flex min-h-11 items-center font-semibold text-[var(--sm-brand)] hover:underline"
        >
          Ver agenda completa
        </Link>
      </div>

      {state === "loading" ? (
        <div
          role="status"
          aria-label="Carregando agenda"
          aria-busy="true"
          className="space-y-3 py-5"
        >
          <span className="sr-only">Buscando os atendimentos do dia.</span>
          <Skeleton aria-hidden="true" className="h-16 w-full" />
          <Skeleton aria-hidden="true" className="h-16 w-full" />
        </div>
      ) : null}

      {state === "unauthorized" ? (
        <AsyncState
          kind="error"
          title="Agenda indisponível"
          description="Restabeleça sua sessão para acessar a agenda."
        />
      ) : null}

      {failed ? (
        <AsyncState
          kind="error"
          title="Agenda indisponível"
          description="Não foi possível carregar seus atendimentos."
          action={
            <button
              type="button"
              className="min-h-11 font-bold text-[var(--sm-brand)] hover:underline"
              onClick={() => void agenda.refetch()}
            >
              Tentar novamente
            </button>
          }
        />
      ) : null}

      {(state === "ready" || state === "empty") && appointments.length === 0 ? (
        <p className="py-6 text-sm text-[var(--sm-muted)]">
          Nenhum atendimento agendado para hoje
        </p>
      ) : null}

      {state === "ready" && appointments.length > 0 ? (
        <ul
          aria-label="Lista de atendimentos de hoje"
          className="mt-3 divide-y divide-[var(--sm-border)]"
        >
          {appointments.map((item) => {
            const hasEvolution = evolvedSet.has(item.id)
            const canEvolve = item.status !== "NO_SHOW"
            return (
              <li
                key={item.id}
                className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 py-4"
              >
                <time
                  dateTime={item.startsAt}
                  className="font-bold tabular-nums text-[var(--sm-ink)]"
                >
                  {new Intl.DateTimeFormat("pt-BR", {
                    timeZone,
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(item.startsAt))}
                </time>

                <div className="min-w-0 flex-1 basis-40">
                  <Link
                    href={`/clientes/${item.clientId}`}
                    className="inline-flex min-h-11 max-w-full items-center break-words font-bold text-[var(--sm-brand)] hover:underline"
                  >
                    {item.client.name}
                  </Link>
                  <p className="text-sm text-[var(--sm-muted)]">
                    {KIND_LABELS[item.kind]} ·{" "}
                    {item.modality === "ONLINE" ? "Online" : "Presencial"} ·{" "}
                    {APPOINTMENT_STATUS_LABELS[item.status]}
                  </p>
                </div>

                {hasEvolution ? (
                  <span className="inline-flex min-h-11 items-center rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand-subtle)] px-3 text-sm font-bold text-[var(--sm-ink)]">
                    Sessão evoluída
                  </span>
                ) : canEvolve ? (
                  <button
                    type="button"
                    aria-label={`Registrar evolução de ${item.client.name}`}
                    onClick={() => onRegisterEvolution(item)}
                    className="inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] px-3.5 py-2 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]"
                  >
                    Registrar evolução
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
