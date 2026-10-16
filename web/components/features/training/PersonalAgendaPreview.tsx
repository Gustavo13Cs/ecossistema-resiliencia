"use client"

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { AsyncState } from "@/components/feedback/AsyncState"
import type { usePersonalDayAgenda } from "@/hooks/features/usePersonalDayAgenda"
import { APPOINTMENT_STATUS_LABELS } from "@/lib/appointment-display"
import type { Appointment } from "@/types/appointment"

const KIND_LABELS: Record<Appointment["kind"], string> = {
  FIRST_VISIT: "Primeiro atendimento", FOLLOW_UP: "Retorno", ASSESSMENT: "Avaliação", SESSION: "Sessão", OTHER: "Outro atendimento",
}

export function PersonalAgendaPreview({ agenda }: { agenda: ReturnType<typeof usePersonalDayAgenda> }) {
  const { state, timeZone } = agenda
  const appointments = agenda.appointments.filter(item => item.status !== "CANCELLED")
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id)).slice(0, 5)
  const failed = state === "network-error" || state === "server-error"
  return (
    <section aria-label="Compromissos de hoje" className="min-w-0 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--sm-ink)]">Compromissos de hoje</h2>
        <Link href="/agenda" className="inline-flex min-h-11 items-center font-semibold text-[var(--sm-brand)] hover:underline">Ver agenda completa</Link>
      </div>
      {state === "loading" ? <div role="status" aria-label="Carregando agenda" aria-busy="true" className="space-y-3 py-5"><span className="sr-only">Buscando os compromissos do dia.</span><Skeleton aria-hidden="true" className="h-16 w-full" /><Skeleton aria-hidden="true" className="h-16 w-full" /></div> : null}
      {state === "unauthorized" ? <AsyncState kind="error" title="Agenda indisponível" description="Restabeleça sua sessão para acessar a agenda." /> : null}
      {failed ? <AsyncState kind="error" title="Agenda indisponível" description="Não foi possível carregar seus compromissos." action={<button type="button" className="min-h-11 font-bold text-[var(--sm-brand)] hover:underline" onClick={() => void agenda.refetch()}>Tentar novamente</button>} /> : null}
      {(state === "ready" || state === "empty") && appointments.length === 0 ? <p className="py-6 text-sm text-[var(--sm-muted)]">Nenhum compromisso para hoje</p> : null}
      {state === "ready" && appointments.length > 0 ? (
        <ul aria-label="Compromissos de hoje" className="mt-3 divide-y divide-[var(--sm-border)]">
          {appointments.map(item => (
            <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 py-4">
              <time dateTime={item.startsAt} className="font-bold tabular-nums text-[var(--sm-ink)]">{new Intl.DateTimeFormat("pt-BR", {timeZone, hour: "2-digit", minute: "2-digit"}).format(new Date(item.startsAt))}</time>
              <div className="min-w-0 flex-1 basis-40">
                <Link href={`/clientes/${item.clientId}`} className="inline-flex min-h-11 max-w-full items-center break-words font-bold text-[var(--sm-brand)] hover:underline">{item.client.name}</Link>
                <p className="text-sm text-[var(--sm-muted)]">{KIND_LABELS[item.kind]} · {item.modality === "ONLINE" ? "Online" : "Presencial"}</p>
              </div>
              <span className="text-sm font-semibold text-[var(--sm-muted)]">{APPOINTMENT_STATUS_LABELS[item.status]}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
