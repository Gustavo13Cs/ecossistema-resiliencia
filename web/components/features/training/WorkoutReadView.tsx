"use client"

import Link from "next/link"
import { useState } from "react"
import { AsyncState } from "@/components/feedback/AsyncState"
import { WorkoutPeriodizationView } from "./WorkoutPeriodizationView"
import { WeeklyVolumePanel } from "./WeeklyVolumePanel"
import { WorkoutRevisionAction } from "./WorkoutRevisionAction"
import { ExerciseLibraryDetail } from "./ExerciseLibraryDetail"
import { Button } from "@/components/ui/button"
import {
  MUSCLE_GROUP_LABELS,
  TRAINING_METHOD_LABELS,
  type WorkoutDetail,
} from "@/types/workout"

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] px-4 py-2.5 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)]"

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Data não registrada"
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(date)
}

export function WorkoutReadView({ workout }: { workout: WorkoutDetail }) {
  const [executionTarget, setExecutionTarget] = useState<{ workoutId: string; exerciseId: string } | null>(null)
  const executionExercise = executionTarget?.workoutId === workout.id
    ? workout.splits.flatMap(split => split.exercises).find(exercise => exercise.id === executionTarget.exerciseId)
    : undefined
  const execution = executionExercise?.demonstrationSnapshot
    ? { name: executionExercise.name, snapshot: executionExercise.demonstrationSnapshot }
    : undefined
  const [denied, setDenied] = useState(false)
  const archived = workout.client.status === "ARCHIVED"
  const statusLabel = workout.isActive ? "Treino ativo" : "Treino anterior"

  const orderedSplits = [...workout.splits].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  )

  if (denied) return <AsyncState kind="error" title="Restabeleça seu acesso" description="Sua sessão não permite consultar estes registros." />
  return (
    <article aria-label={`Ficha de treino ${workout.title}`} className="mx-auto min-w-0 max-w-[1120px] space-y-6 px-4 py-6 text-[var(--sm-ink)] sm:px-6 lg:px-8 print:px-0 print:py-0">
      <header className="flex flex-col gap-4 border-b border-[var(--sm-border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-[var(--sm-muted)]">
            Aluno: <span className="text-[var(--sm-ink)]">{workout.client.name}</span> · <span>{statusLabel}</span>
          </p>
          <h1 className="break-words text-3xl font-extrabold tracking-[-0.03em]">{workout.title}</h1>
        </div>
        <nav aria-label="Ações da ficha" className="flex flex-wrap gap-2 print:hidden">
          <Link href={`/clientes/${workout.clientId}`} className={actionClass}>
            Voltar ao prontuário
          </Link>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => window.print()}>
            Imprimir ficha salva
          </Button>
          {archived ? (
            <Button type="button" disabled className="min-h-11">
              Criar prescrição
            </Button>
          ) : (
            <WorkoutRevisionAction workout={workout} onAccessDenied={() => setDenied(true)} />
          )}
        </nav>
      </header>

      {archived ? (
        <p role="status" className="text-sm text-[var(--sm-muted)] print:hidden">
          Prontuário arquivado: esta ficha permanece disponível para consulta e impressão. Novas prescrições estão bloqueadas.
        </p>
      ) : null}

      <p>{workout.finalizedAt ? `Finalizada em ${formatDate(workout.finalizedAt)}` : "Registro legado"}</p>
      {workout.revisionOfId ? <Link href={`/clientes/${workout.clientId}/treinos/${workout.revisionOfId}`} className={actionClass}>Consultar ficha de origem</Link> : null}

      <section aria-label="Resumo da prescrição" className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <dt className="text-[var(--sm-muted)]">Objetivo</dt>
            <dd className="mt-1 break-words font-semibold">{workout.goal || "Não registrado"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[var(--sm-muted)]">Duração informada</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {workout.durationWeeks != null ? `${workout.durationWeeks} semanas` : "Não registrado"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[var(--sm-muted)]">Data do registro</dt>
            <dd className="mt-1 font-semibold">{formatDate(workout.createdAt)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[var(--sm-muted)]">Última atualização</dt>
            <dd className="mt-1 font-semibold">{formatDate(workout.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <WorkoutPeriodizationView workout={workout} />
      {workout.weeklyVolumeSnapshot ? <WeeklyVolumePanel summary={workout.weeklyVolumeSnapshot} splits={workout.splits} saved /> : <p className="text-sm text-[var(--sm-muted)]">Volume semanal não registrado nesta ficha.</p>}

      <div className="space-y-5">
        {orderedSplits.map(split => {
          const orderedExercises = [...split.exercises].sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0),
          )
          return (
            <section
              key={split.id}
              aria-label={split.name}
              className="min-w-0 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 print:break-inside-avoid"
            >
              <header className="border-b border-[var(--sm-border)] pb-3">
                <h2 className="break-words text-xl font-bold">{split.name}</h2>
                <p className="mt-1 text-sm">Frequência semanal: {split.weeklyFrequency != null ? `${split.weeklyFrequency} vez(es)/semana` : "Não informada"}</p>
                <p className="mt-1 break-words text-sm text-[var(--sm-muted)]">
                  Foco: <span className="font-semibold text-[var(--sm-ink)]">{split.focus || "Não informado"}</span>
                </p>
              </header>

              {orderedExercises.length === 0 ? (
                <p className="pt-4 text-sm text-[var(--sm-muted)]">Nenhum exercício registrado nesta divisão.</p>
              ) : (
                <ul aria-label={`Exercícios de ${split.name}`} className="divide-y divide-[var(--sm-border)]">
                  {orderedExercises.map(exercise => (
                    <li key={exercise.id} className="space-y-2 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-base font-bold">{exercise.name}</h3>
                        {exercise.muscleGroup ? (
                          <span className="rounded-full border border-[var(--sm-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--sm-muted)]">
                            {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
                          </span>
                        ) : null}
                        {exercise.method && exercise.method !== "STANDARD" ? (
                          <span className="rounded-full border border-[var(--sm-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--sm-ink)]">
                            {TRAINING_METHOD_LABELS[exercise.method]}
                          </span>
                        ) : null}
                      </div>

                      <dl className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                        <div>
                          <dt className="text-[var(--sm-muted)]">Séries</dt>
                          <dd className="font-semibold tabular-nums">{exercise.sets}</dd>
                        </div>
                        <div>
                          <dt className="text-[var(--sm-muted)]">Repetições</dt>
                          <dd className="font-semibold tabular-nums">{exercise.reps}</dd>
                        </div>
                        <div>
                          <dt className="text-[var(--sm-muted)]">Descanso</dt>
                          <dd className="font-semibold tabular-nums">{exercise.rest || "Não informado"}</dd>
                        </div>
                        {exercise.load ? (
                          <div>
                            <dt className="text-[var(--sm-muted)]">Carga</dt>
                            <dd className="font-semibold">{exercise.load}</dd>
                          </div>
                        ) : null}
                        {exercise.effortType && exercise.effortTarget ? (
                          <div>
                            <dt className="text-[var(--sm-muted)]">Esforço alvo</dt>
                            <dd className="font-semibold tabular-nums">
                              {exercise.effortType} {exercise.effortTarget}
                            </dd>
                          </div>
                        ) : null}
                        {exercise.tempo ? (
                          <div>
                            <dt className="text-[var(--sm-muted)]">Cadência</dt>
                            <dd className="font-semibold tabular-nums">{exercise.tempo}</dd>
                          </div>
                        ) : null}
                      </dl>

                      {workout.weekProjection ? (() => {
                        const projected = workout.weekProjection.exercises.find(item => item.id === exercise.id)
                        return projected ? <div className="space-y-1 rounded-md border border-[var(--sm-border)] p-3 text-sm"><h4 className="font-bold">Meta da semana {workout.weekProjection.week}</h4><p>{projected.sets} séries × {projected.reps} repetições{projected.effortType ? ` · ${projected.effortType} ${projected.effortTarget}` : ""}</p><p className="text-[var(--sm-muted)]">Valores base: {exercise.sets} séries × {exercise.reps} repetições. Carga: {exercise.load || "Não informada"}.</p>{projected.warnings.map(warning => <p key={warning}>{warning}</p>)}</div> : null
                      })() : null}
                      {exercise.demonstrationSnapshot ? <Button type="button" variant="outline" className="min-h-11 print:hidden" aria-label={`Ver execução de ${exercise.name}`} onClick={() => setExecutionTarget({ workoutId: workout.id, exerciseId: exercise.id })}>Ver execução</Button> : null}
                      {exercise.notes ? (
                        <p className="whitespace-pre-wrap break-words text-sm text-[var(--sm-muted)]">
                          <span className="font-semibold text-[var(--sm-ink)]">Observações: </span>
                          {exercise.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      <section
        aria-label="Orientações gerais"
        className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 print:break-inside-avoid"
      >
        <h2 className="text-lg font-bold">Orientações gerais</h2>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">
          {workout.notes || "Nenhuma orientação registrada"}
        </p>
      </section>
      <ExerciseLibraryDetail open={Boolean(execution)} onOpenChange={open => { if (!open) setExecutionTarget(null) }} saved={execution ?? undefined} />
    </article>
  )
}
