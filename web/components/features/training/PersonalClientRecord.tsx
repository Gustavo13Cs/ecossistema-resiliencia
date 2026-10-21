"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { WorkoutEditorLink } from "./WorkoutEditorLink"
import { isAxiosError } from "axios"
import { ReauthenticateButton } from "@/components/auth/ReauthenticateButton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useTrainingOverview } from "@/hooks/features/useTrainingOverview"
import { useClientAssessments } from "@/hooks/features/useClientAssessments"
import { PERSONAL_ASSESSMENT_FIELDS } from "@/lib/personal-assessment"
import type { PersonalNumericField, PhysicalAssessment } from "@/types/assessment"
import type { TrainingAssessment } from "@/types/training"
import type { Client } from "@/types/client"
import { WorkoutDraftSection } from "./WorkoutDraftSection"
import { PersonalAssessmentDialog } from "./PersonalAssessmentDialog"

type PersonalClientRecordProps = { client: Client; pending: boolean; onAccessDenied?: () => void }
const actionClass = "inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] px-4 py-2.5 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)]"
const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 })
function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Data não registrada" : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(date)
}
const isDenied = (error: unknown) => isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)

export function PersonalClientRecord(props: PersonalClientRecordProps) {
  const { user } = useAuth()
  if (!user?.sub || user.role !== "PERSONAL") return null
  return <TrainingRecord key={`${user.sub}:${props.client.id}`} {...props} />
}

function TrainingRecord({ client, pending, onAccessDenied }: PersonalClientRecordProps) {
  const overview = useTrainingOverview(client.id)
  const assessments = useClientAssessments(client.id)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDenied, setDialogDenied] = useState(false)
  const denied = dialogDenied || isDenied(overview.error) || isDenied(assessments.error)
  useEffect(() => { if (denied) onAccessDenied?.() }, [denied, onAccessDenied])
  if (denied) return <AsyncState kind="error" title="Restabeleça seu acesso" description="Sua sessão não permite acessar estes registros. Entre novamente ou restabeleça seu acesso para continuar." action={<ReauthenticateButton />} />

  const archived = client.status === "ARCHIVED" || overview.data?.client.status === "ARCHIVED"
  const blocked = pending || archived
  const active = overview.data?.activeWorkout
  const latest = overview.data?.recentAssessments[0]
  return <section aria-label="Área de Treinamento" className="min-w-0 space-y-6 text-[var(--sm-ink)]">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-bold tracking-[-0.025em]">Área de Treinamento</h2>
      <nav aria-label="Ações de treinamento" className="flex flex-wrap gap-2">
        <Button type="button" disabled={blocked} className="min-h-11" onClick={() => setDialogOpen(true)}>Nova avaliação física</Button>
        {blocked ? <Button type="button" disabled className="min-h-11" variant="outline">Criar prescrição</Button> : <WorkoutEditorLink href={`/clientes/${client.id}/novo-treino`} className={actionClass}>Criar prescrição</WorkoutEditorLink>}
        <Link href="/agenda" className={actionClass}>Abrir agenda</Link>
      </nav>
    </div>
    {archived ? <p role="status" className="text-sm text-[var(--sm-muted)]">Prontuário arquivado: o histórico permanece disponível para consulta. Novas avaliações e prescrições estão bloqueadas.</p> : null}
    {overview.isPending ? <LoadingBlock title="Carregando resumo de treinamento" /> : overview.error ? <AsyncState kind="error" title="Resumo de treinamento indisponível" description="Não foi possível consultar o treino ativo e a avaliação recente." action={<button type="button" className={actionClass} onClick={() => void overview.refetch()}>Tentar novamente o resumo</button>} /> : overview.data ? <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <section aria-labelledby="personal-active-workout" className="min-w-0 space-y-3 border-t border-[var(--sm-border)] pt-5">
        <h3 id="personal-active-workout" className="text-lg font-bold">Treino ativo</h3>
        {active ? <>
          <h4 className="break-words text-lg font-semibold">{active.title}</h4>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-[var(--sm-muted)]">Objetivo</dt><dd className="break-words">{active.goal || "Não registrado"}</dd></div>
            <div><dt className="text-[var(--sm-muted)]">Data do registro</dt><dd>{dateLabel(active.createdAt)}</dd></div>
            <div><dt className="text-[var(--sm-muted)]">Duração informada</dt><dd>{active.durationWeeks != null ? `${active.durationWeeks} semanas` : "Não registrado"}</dd></div>
          </dl>
          <Link className={actionClass} href={`/clientes/${client.id}/treinos/${active.id}`}>Ver ficha</Link>
        </> : <div className="space-y-3">
          <p className="text-sm text-[var(--sm-muted)]">Nenhum treino ativo registrado</p>
          {blocked ? null : <WorkoutEditorLink className={actionClass} href={`/clientes/${client.id}/novo-treino`}>Criar prescrição</WorkoutEditorLink>}
        </div>}
      </section>
      <section aria-labelledby="personal-latest-assessment" className="min-w-0 space-y-3 border-t border-[var(--sm-border)] pt-5">
        <h3 id="personal-latest-assessment" className="text-lg font-bold">Avaliação mais recente</h3>
        {latest ? <><p className="text-sm font-semibold">{dateLabel(latest.date)}</p><AssessmentMeasures assessment={latest} /></> : <p className="text-sm text-[var(--sm-muted)]">Nenhuma avaliação registrada</p>}
      </section>
    </div> : null}
    <WorkoutDraftSection clientId={client.id} onAccessDenied={() => setDialogDenied(true)} />
    <section aria-labelledby="personal-assessment-history" className="min-w-0 border-t border-[var(--sm-border)] pt-5">
      <h3 id="personal-assessment-history" className="text-lg font-bold">Avaliações registradas</h3>
      {assessments.loading ? <LoadingBlock title="Carregando avaliações" /> : assessments.error ? <AsyncState kind="error" title="Avaliações indisponíveis" description="Não foi possível consultar o histórico de avaliações." action={<button type="button" className={actionClass} onClick={() => void assessments.refetch()}>Tentar novamente as avaliações</button>} /> : assessments.assessments.length === 0 ? <p className="mt-3 text-sm text-[var(--sm-muted)]">Nenhuma avaliação registrada neste prontuário.</p> : <div className="mt-3 divide-y divide-[var(--sm-border)]">
        {assessments.assessments.map(assessment => <details key={assessment.id} className="py-2">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-[var(--sm-radius-sm)] py-2 font-semibold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)]">Avaliação de {dateLabel(assessment.date)}</summary>
          <div className="pb-4 pt-3"><AssessmentMeasures assessment={assessment} /></div>
        </details>)}
      </div>}
    </section>
    <PersonalAssessmentDialog isOpen={dialogOpen && !blocked} onClose={() => setDialogOpen(false)} clientId={client.id} onSuccess={() => setDialogOpen(false)} onAccessDenied={() => setDialogDenied(true)} />
  </section>
}

function LoadingBlock({ title }: { title: string }) {
  return <div role="status" aria-label={title} aria-busy="true" className="space-y-3 py-5"><span className="sr-only">{title}</span><Skeleton aria-hidden="true" className="h-6 w-48" /><Skeleton aria-hidden="true" className="h-20 w-full" /></div>
}

function AssessmentMeasures({ assessment }: { assessment: PhysicalAssessment | TrainingAssessment }) {
  return <div className="space-y-3">
    <dl className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
      {(Object.keys(PERSONAL_ASSESSMENT_FIELDS) as PersonalNumericField[]).map(field => {
        const definition = PERSONAL_ASSESSMENT_FIELDS[field]
        const value = assessment[field]
        return <div key={field} className="min-w-0"><dt className="text-[var(--sm-muted)]">{definition.label}</dt><dd className="font-semibold tabular-nums">{value != null ? `${numberFormat.format(value)} ${definition.unit}` : "Não registrado"}</dd></div>
      })}
      {assessment.muscleMass != null ? <div><dt className="text-[var(--sm-muted)]">Massa muscular</dt><dd className="tabular-nums">{numberFormat.format(assessment.muscleMass)} — unidade não registrada</dd></div> : null}
      {assessment.vo2Max != null ? <div><dt className="text-[var(--sm-muted)]">VO₂ máximo</dt><dd className="tabular-nums">{numberFormat.format(assessment.vo2Max)} — unidade não registrada</dd></div> : null}
    </dl>
    <p className="whitespace-pre-wrap break-words text-sm"><span className="font-semibold">Observações: </span>{assessment.notes || "Não registrado"}</p>
  </div>
}
