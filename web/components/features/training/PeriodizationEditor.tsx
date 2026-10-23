"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { suggestPeriodization, validatePeriodization } from "@/lib/workout-periodization"
import type { Periodization, PeriodPhase } from "@/types/workout-p3"

const fieldClass = "min-h-11 rounded-md border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm"
type Props = { durationWeeks: string; value?: Periodization | null; disabled?: boolean; onChange: (value: Periodization | null, durationWeeks?: string) => void }

export function PeriodizationEditor({ durationWeeks, value, disabled, onChange }: Props) {
  if (!value) return <section aria-label="Periodização" className="space-y-2 rounded-md border p-4"><h2 className="font-bold">Periodização opcional</h2><p className="text-sm">Organize adaptação, sobrecarga, pico e recuperação em um mesociclo.</p><Button type="button" variant="outline" disabled={disabled} onClick={() => {
    const weeks = Number(durationWeeks) >= 4 && Number(durationWeeks) <= 12 ? Number(durationWeeks) : 8
    onChange(suggestPeriodization(weeks), String(weeks))
  }}>Configurar periodização</Button></section>
  const errors = validatePeriodization(value, durationWeeks ? Number(durationWeeks) : null, true)
  const update = (patch: Partial<Periodization>) => onChange({ ...value, ...patch })
  const updatePhase = (index: number, patch: Partial<PeriodPhase>) => update({ phases: value.phases.map((phase, position) => position === index ? { ...phase, ...patch } : phase) })
  return <section aria-label="Periodização" className="space-y-4 rounded-md border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Periodização em blocos</h2><Button type="button" variant="outline" disabled={disabled} onClick={() => onChange(null)}>Desativar periodização</Button></div>
    <fieldset disabled={disabled} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">Duração do mesociclo (semanas)<Input type="number" min={4} max={12} value={durationWeeks} onChange={event => onChange(value, event.target.value)} /></label>
        <label className="grid gap-1 text-sm">Data de início<Input type="date" value={value.startsOn} onChange={event => update({ startsOn: event.target.value })} /></label>
        <label className="grid gap-1 text-sm">Fuso do plano<Input value={value.timeZone} onChange={event => update({ timeZone: event.target.value })} /></label>
      </div>
      <p className="text-sm text-[var(--sm-muted)]">A data pode ficar pendente no rascunho. Para finalizar, cubra todas as semanas com fases consecutivas.</p>
      <Button type="button" variant="outline" onClick={() => update({ phases: suggestPeriodization(Number(durationWeeks)).phases })}>Regerar fases sugeridas</Button>
      <div className="space-y-3">
        {value.phases.map((phase,index) => <fieldset key={index} className="grid gap-2 rounded-md border p-3 sm:grid-cols-3">
          <legend className="px-1 font-semibold">Fase {index+1}</legend>
          <label className="grid gap-1 text-sm">Nome da fase {index+1}<Input value={phase.name} maxLength={100} onChange={event => updatePhase(index,{name:event.target.value})} /></label>
          <label className="grid gap-1 text-sm">Tipo da fase {index+1}<select className={fieldClass} value={phase.type} onChange={event => updatePhase(index,{type:event.target.value as PeriodPhase["type"]})}>{Object.entries({ADAPTATION:"Adaptação",OVERLOAD:"Sobrecarga",PEAK:"Pico",DELOAD:"Deload"}).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <div className="flex gap-2"><label className="grid flex-1 gap-1 text-sm">Início da fase {index+1}<Input type="number" min={1} max={12} value={phase.startWeek} onChange={event => updatePhase(index,{startWeek:Number(event.target.value)})} /></label><label className="grid flex-1 gap-1 text-sm">Fim da fase {index+1}<Input type="number" min={1} max={12} value={phase.endWeek} onChange={event => updatePhase(index,{endWeek:Number(event.target.value)})} /></label></div>
          <label className="grid gap-1 text-sm">Escala da fase {index+1}<select className={fieldClass} value={phase.effortType ?? ""} onChange={event => updatePhase(index,{effortType:event.target.value as "RIR"|"RPE" || null,effortTarget:event.target.value ? phase.effortTarget : ""})}><option value="">Usar esforço do exercício</option><option value="RIR">RIR</option><option value="RPE">RPE</option></select></label>
          <label className="grid gap-1 text-sm">Meta da fase {index+1}<Input disabled={!phase.effortType} value={phase.effortTarget} maxLength={20} onChange={event => updatePhase(index,{effortTarget:event.target.value})} /></label>
        </fieldset>)}
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(value.progression)} onChange={event => update({progression:event.target.checked ? {intervalWeeks:2,repsDelta:1,effortDelta:1} : null})} />Ativar progressão programada</label>
      {value.progression ? <div className="grid gap-3 sm:grid-cols-3">{([['intervalWeeks','A cada quantas semanas',1,4],['repsDelta','Repetições por ciclo',0,2],['effortDelta','Variação de esforço por ciclo',0,2]] as const).map(([field,label,min,max]) => <label key={field} className="grid gap-1 text-sm">{label}<Input type="number" min={min} max={max} value={value.progression![field]} onChange={event => update({progression:{...value.progression!,[field]:Number(event.target.value)}})} /></label>)}</div> : null}
      <p className="text-sm text-[var(--sm-muted)]">Repetições acumulam desde o início. A progressão do esforço reinicia na primeira semana de cada fase com meta própria. No deload, a progressão é suspensa e as séries numéricas são reduzidas em aproximadamente 40%.</p>
      {errors.length ? <ul aria-label="Pendências para finalizar periodização" className="list-inside list-disc text-sm text-amber-700">{errors.map(error => <li key={error}>{error}</li>)}</ul> : null}
    </fieldset>
  </section>
}
