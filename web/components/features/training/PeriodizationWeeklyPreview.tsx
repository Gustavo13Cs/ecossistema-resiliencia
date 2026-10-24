"use client"

import { useState } from "react"
import type { WorkoutFormSplit } from "@/lib/workout-form"
import { projectExercise, validatePeriodization } from "@/lib/workout-periodization"
import type { Periodization, ProjectableExercise } from "@/types/workout-p3"

type Props = { config: Periodization; durationWeeks: string; splits: readonly WorkoutFormSplit[] }

function targets(exercise: ProjectableExercise) {
  return `${exercise.sets} séries · ${exercise.reps} repetições · ${exercise.effortType ? `${exercise.effortType} ${exercise.effortTarget || "pendente"}` : exercise.effortTarget || "Esforço não informado"}`
}

export function PeriodizationWeeklyPreview({ config, durationWeeks, splits }: Props) {
  const [selectedWeek, setSelectedWeek] = useState(1)
  const duration = Number(durationWeeks)
  const ready = validatePeriodization(config, duration, true).length === 0
  const week = Math.max(1, Math.min(Number.isInteger(duration) && duration >= 4 && duration <= 12 ? duration : 1, selectedWeek))
  const phase = ready ? config.phases.find(item => week >= item.startWeek && week <= item.endWeek) : null

  return <section aria-label="Prévia semanal da prescrição" className="space-y-3 rounded-md border border-[var(--sm-border)] p-4">
    <h3 className="font-bold">Prévia semanal da prescrição</h3>
    {!ready || !phase ? <p className="text-sm">Complete a configuração para consultar a prévia semanal. A periodização parcial pode ser salva no rascunho.</p> : <>
      <label className="grid max-w-xs gap-1 text-sm">Semana da prévia
        <select className="min-h-11 rounded-md border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3" value={week} onChange={event => setSelectedWeek(Number(event.target.value))}>
          {Array.from({ length: duration }, (_, index) => index + 1).map(item => <option key={item} value={item}>Semana {item}</option>)}
        </select>
      </label>
      <p className="font-semibold">Semana {week} · {phase.name}</p>
      <p className="text-sm text-[var(--sm-muted)]">Repetições acumulam desde o início. Com meta própria, o esforço usa a meta da fase e reinicia a progressão na primeira semana dela; sem meta, usa o esforço do exercício e os ciclos desde o início do plano.</p>
      {phase.type === "DELOAD" ? <p className="rounded-md border border-amber-500 p-3 text-sm">Deload: progressão suspensa, repetições base e séries numéricas reduzidas em aproximadamente 40%. Prescrições textuais precisam de revisão manual.</p> : null}
      {!splits.some(split => split.exercises.length > 0) ? <p className="text-sm">Adicione exercícios para consultar os alvos da semana.</p> : splits.map((split, splitIndex) => split.exercises.length ? <div key={split.id} className="space-y-2">
        <h4 className="font-semibold">{split.name || `Divisão ${splitIndex + 1} (nome pendente)`}</h4>
        <ul className="space-y-2">{split.exercises.map((exercise, exerciseIndex) => {
          const base = { ...exercise, effortType: exercise.effortType || null }
          const complete = Boolean(exercise.sets.trim() && exercise.reps.trim())
          const projected = complete ? projectExercise(base, config, week) : null
          return <li key={exercise.id} className="space-y-1 rounded-md border border-[var(--sm-border)] p-3 text-sm">
            <p className="font-semibold">{exercise.name || `Exercício ${exerciseIndex + 1} (nome pendente)`}</p>
            {projected ? <>
              <p>Base: {targets(base)}</p>
              <p>Projetado: {targets(projected)}</p>
              {projected.warnings.length ? <ul className="list-inside list-disc text-amber-700">{projected.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul> : null}
            </> : <p>Preencha séries e repetições para projetar este exercício.</p>}
          </li>
        })}</ul>
      </div> : null)}
    </>}
  </section>
}
