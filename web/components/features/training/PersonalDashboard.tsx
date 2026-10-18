"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { WorkoutEditorLink } from "./WorkoutEditorLink"
import { useRouter } from "next/navigation"
import { navigateToWorkoutPage } from "@/lib/workout-editor-navigation"
import { isAxiosError } from "axios"
import { Skeleton } from "@/components/ui/skeleton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { useTrainingWorkspace } from "@/hooks/features/useTrainingWorkspace"
import { usePersonalDayAgenda } from "@/hooks/features/usePersonalDayAgenda"
import type { TrainingWorkspace } from "@/types/training"
import { PersonalAgendaPreview } from "./PersonalAgendaPreview"
import { WorkoutClientPicker } from "./WorkoutClientPicker"

const actionClass = "inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] px-4 py-2.5 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]"

export function PersonalDashboard() {
  const workspace = useTrainingWorkspace()
  const agenda = usePersonalDayAgenda()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerAccessDenied, setPickerAccessDenied] = useState(false)
  const handlePickerAccessDenied = useCallback(() => setPickerAccessDenied(true), [])
  const router = useRouter()
  const denied = pickerAccessDenied || (isAxiosError(workspace.error) && [401, 403].includes(workspace.error.response?.status ?? 0)) || agenda.state === "unauthorized"

  if (denied) return <AsyncState kind="error" title="Restabeleça seu acesso" description="Sua sessão não permite acessar estes registros. Entre novamente ou restabeleça seu acesso para continuar." action={<Link href="/login" className={actionClass}>Entrar novamente</Link>} />

  const data = workspace.data
  return (
    <div className="min-w-0 space-y-7 pb-10">
      <header className="flex flex-col items-start gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[var(--sm-ink)]">Área de treinamento</h1>
          <p className="mt-2 text-[var(--sm-muted)]">{agenda.period ? new Intl.DateTimeFormat("pt-BR", {timeZone: agenda.timeZone, weekday: "long", day: "numeric", month: "long"}).format(new Date(agenda.period.from)) : "Preparando seu dia"}</p>
        </div>
        <nav aria-label="Ações rápidas" className="flex flex-wrap gap-2">
          <Link href="/clientes/novo" className="inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand)] px-4 py-2.5 text-sm font-bold text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)]">Novo aluno</Link>
          <button type="button" disabled={!data || data.counts.activeStudents === 0} className={`${actionClass} disabled:cursor-not-allowed disabled:opacity-50`} onClick={() => setPickerOpen(true)}>Nova prescrição</button>
          <Link href="/agenda" className={actionClass}>Abrir agenda</Link>
        </nav>
      </header>
      <PersonalAgendaPreview agenda={agenda} />
      {workspace.isPending ? <div role="status" aria-label="Carregando resumo" aria-busy="true" className="space-y-4 py-5"><span className="sr-only">Buscando o resumo da sua base privada.</span><Skeleton aria-hidden="true" className="h-6 w-48" /><Skeleton aria-hidden="true" className="h-20 w-full" /></div> : workspace.error ? (
        <AsyncState kind="error" title="Resumo indisponível" description="Não foi possível carregar os alunos e as contagens da sua base." action={<button type="button" className={actionClass} onClick={() => void workspace.refetch()}>Tentar novamente</button>} />
      ) : data ? (
        <>
          <section aria-label="Resumo da base" className="border-y border-[var(--sm-border)] py-5">
            <h2 className="text-lg font-bold text-[var(--sm-ink)]">Resumo da base</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              {([["Alunos ativos", data.counts.activeStudents], ["Alunos arquivados", data.counts.archivedStudents], ["Alunos sem treino ativo", data.counts.withoutActiveWorkout]] as const).map(([label, count]) => <div key={label} className="flex items-baseline justify-between gap-3 sm:flex-col sm:gap-1"><dt className="text-sm font-semibold text-[var(--sm-muted)]">{label}</dt><dd className="text-2xl font-bold tabular-nums text-[var(--sm-ink)]">{count}</dd></div>)}
            </dl>
          </section>
          {data.counts.activeStudents === 0 ? <AsyncState kind="empty" title={data.counts.archivedStudents === 0 ? "Sua base começa aqui" : "Sua base tem apenas alunos arquivados"} description={data.counts.archivedStudents === 0 ? "Cadastrar aluno → Registrar avaliação → Criar treino" : "Consulte os prontuários arquivados ou cadastre um novo aluno."} action={data.counts.archivedStudents > 0 ? <Link className={actionClass} href="/clientes?status=ARCHIVED">Ver alunos arquivados</Link> : undefined} /> : (
            <div className="grid min-w-0 gap-7 xl:grid-cols-2">
              <StudentList title="Alunos sem treino ativo" items={data.items.filter(item => item.section === "WITHOUT_ACTIVE_WORKOUT").slice(0, 5)} pending />
              <StudentList title="Alunos recentes" items={data.items.filter(item => item.section === "RECENT").slice(0, 5)} />
            </div>
          )}
        </>
      ) : null}
      <WorkoutClientPicker open={pickerOpen} onOpenChange={setPickerOpen} onAccessDenied={handlePickerAccessDenied} onSelect={clientId => navigateToWorkoutPage(router, `/clientes/${clientId}/novo-treino`)} />
    </div>
  )
}

function StudentList({ title, items, pending = false }: { title: string; items: TrainingWorkspace["items"]; pending?: boolean }) {
  return <section aria-label={title} className="min-w-0">
    <h2 className="text-lg font-bold text-[var(--sm-ink)]">{title}</h2>
    <p className="mt-1 text-sm text-[var(--sm-muted)]">{pending ? "Alunos ativos sem prescrição ativa registrada." : "Atualizações cadastrais mais recentes da sua base."}</p>
    {items.length === 0 ? <p className="py-5 text-sm text-[var(--sm-muted)]">{pending ? "Nenhum aluno sem treino ativo" : "Nenhum aluno recente"}</p> : <ul className="mt-3 divide-y divide-[var(--sm-border)]">{items.map(item => <li key={item.clientId} className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 py-3">
      <div className="min-w-0 flex-1 basis-36"><Link href={`/clientes/${item.clientId}`} aria-label={`Abrir prontuário de ${item.name}`} className="inline-flex min-h-11 items-center break-words font-bold text-[var(--sm-brand)] hover:underline">{item.name}</Link><p className="break-words text-sm text-[var(--sm-muted)]">{item.goal || "Objetivo não informado"}</p></div>
      {pending ? <WorkoutEditorLink href={`/clientes/${item.clientId}/novo-treino`} aria-label={`Criar prescrição para ${item.name}`} className={actionClass}>Criar prescrição</WorkoutEditorLink> : null}
    </li>)}</ul>}
  </section>
}
