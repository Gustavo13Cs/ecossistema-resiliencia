"use client"

import Link from "next/link"
import type { WorkoutDetail } from "@/types/workout"
import { WeeklyVolumePanel } from "./WeeklyVolumePanel"

export function WorkoutPeriodizationView({ workout }: { workout: WorkoutDetail }) {
  const config = workout.periodization
  const projection = workout.weekProjection
  if (!config || !projection) return null
  const status = projection.planWeek.status === "NOT_STARTED" ? "Não iniciado" : projection.planWeek.status === "COMPLETED" ? "Concluído" : `Semana atual: ${projection.planWeek.week}`
  return <section aria-label="Mesociclo e semana consultada" className="space-y-4 rounded-md border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 print:break-inside-avoid">
    <h2 className="text-xl font-bold">Semana {projection.week} de {workout.durationWeeks} · {projection.phase.name}</h2>
    <p>{status} · Início: {config.startsOn} · Fuso: {config.timeZone}</p>
    <nav aria-label="Semanas do mesociclo" className="flex flex-wrap gap-2 print:hidden">
      {Array.from({length:workout.durationWeeks ?? 0},(_,index) => index+1).map(week => {
        const phase = config.phases.find(item => week >= item.startWeek && week <= item.endWeek)
        return <Link key={week} aria-current={week === projection.week ? "step" : undefined} href={`/clientes/${workout.clientId}/treinos/${workout.id}?week=${week}`} className="min-h-11 rounded border border-[var(--sm-border)] px-3 py-2 text-sm aria-[current=step]:font-bold aria-[current=step]:ring-2">Semana {week} · {phase?.name}</Link>
      })}
      <Link href={`/clientes/${workout.clientId}/treinos/${workout.id}`} className="min-h-11 px-3 py-2 text-sm underline">Acompanhar semana atual</Link>
    </nav>
    <p>Meta da fase: {projection.phase.effortType ? `${projection.phase.effortType} ${projection.phase.effortTarget}` : "Esforço definido por exercício"}.</p>
    {projection.phase.type === "DELOAD" ? <p role="status" className="rounded-md border border-amber-500 p-3 font-semibold">Semana de recuperação: progressão suspensa e séries numéricas reduzidas em aproximadamente 40%. Prescrições textuais precisam de revisão manual.</p> : null}
    <p className="text-sm text-[var(--sm-muted)]">As metas desta semana são exibidas junto dos valores base de cada exercício. A ficha original permanece preservada.</p>
    <WeeklyVolumePanel summary={projection.volume} splits={workout.splits} projected />
  </section>
}
