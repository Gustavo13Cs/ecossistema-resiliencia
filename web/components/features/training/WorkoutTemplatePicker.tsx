"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useWorkoutTemplates } from "@/hooks/features/useWorkoutTemplates"
import { navigateToWorkoutPage } from "@/lib/workout-editor-navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { MUSCLE_GROUP_LABELS, TRAINING_METHOD_LABELS, type EffortType, type MuscleGroup, type TrainingMethod } from "@/types/workout"
import type { Periodization, SecondaryMuscle } from "@/types/workout-p3"
import { TEMPLATE_GOAL_LABELS, TEMPLATE_LEVEL_LABELS, type TemplateGoal, type TemplateLevel, type WorkoutTemplateFilters } from "@/types/workout-template"

type PickerProps = { open: boolean; clientId: string; onClose: () => void; onAccessDenied: () => void }
export function WorkoutTemplatePicker(props: PickerProps) {
  const { user } = useAuth()
  const [owner] = useState(user?.sub)
  if (!props.open || !user?.sub || user.role !== "PERSONAL" || owner !== user.sub) return null
  return <PickerSession key={`${user.sub}:${props.clientId}`} {...props} />
}
function PickerSession({ open, clientId, onClose, onAccessDenied }: PickerProps) {
  const router = useRouter()
  const [filters, setFilters] = useState<WorkoutTemplateFilters>({ origin: "all" })
  const [cursor, setCursor] = useState<string>()
  const [templateId, setTemplateId] = useState<string>()
  const [existingId, setExistingId] = useState<string>()
  const [failed, setFailed] = useState(false)
  const { listQuery, detailQuery, importMutation, accessDenied } = useWorkoutTemplates({ clientId, templateId, filters, cursor })
  useEffect(() => { if (accessDenied) onAccessDenied() }, [accessDenied, onAccessDenied])
  if (accessDenied) return null
  const query = templateId ? detailQuery : listQuery
  const preview = detailQuery.data
  const busy = importMutation.isPending
  function changeFilters(value: WorkoutTemplateFilters) { setFilters(value); setCursor(undefined); setTemplateId(undefined); setFailed(false); setExistingId(undefined) }
  function navigate(id: string) { navigateToWorkoutPage(router, `/clientes/${clientId}/rascunhos/${id}`) }
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose() }}><DialogContent overlayClassName="print:hidden" className="print:hidden max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
    <DialogTitle>Modelos de treino</DialogTitle>
    <DialogDescription>Escolha uma base para adaptar ao aluno. A importação cria um rascunho e não ativa uma prescrição.</DialogDescription>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="grid gap-1 text-sm">Origem dos modelos<select className="min-h-11 rounded-md border bg-background p-2" value={filters.origin ?? "all"} disabled={busy} onChange={event => changeFilters({ ...filters, origin: event.target.value as WorkoutTemplateFilters["origin"] })}><option value="all">Todos</option><option value="global">SafeMove</option><option value="private">Meus modelos</option></select></label>
      <label className="grid gap-1 text-sm">Objetivo do modelo<select className="min-h-11 rounded-md border bg-background p-2" value={filters.goal ?? ""} disabled={busy} onChange={event => changeFilters({ ...filters, goal: event.target.value as TemplateGoal || undefined })}><option value="">Todos os objetivos</option>{Object.entries(TEMPLATE_GOAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Nível do modelo<select className="min-h-11 rounded-md border bg-background p-2" value={filters.level ?? ""} disabled={busy} onChange={event => changeFilters({ ...filters, level: event.target.value as TemplateLevel || undefined })}><option value="">Todos os níveis</option>{Object.entries(TEMPLATE_LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {query.isPending ? <p role="status">Carregando modelos…</p> : null}
    {query.error ? <div role="alert"><p>Não foi possível consultar os modelos.</p><Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div> : null}
    {!templateId && listQuery.data ? <><ul className="space-y-3">{listQuery.data.items.map(item => <li key={item.id} className="space-y-2 rounded-md border p-3"><h2 className="font-bold">{item.title}</h2><p className="text-sm">{item.isGlobal ? "SafeMove · somente leitura" : "Meu modelo · snapshot imutável"} · {TEMPLATE_GOAL_LABELS[item.goal]} · {TEMPLATE_LEVEL_LABELS[item.level]}</p>{item.description ? <p>{item.description}</p> : null}<Button variant="outline" onClick={() => { setTemplateId(item.id); setFailed(false) }}>Pré-visualizar {item.title}</Button></li>)}</ul>{!listQuery.data.items.length ? <p>Nenhum modelo encontrado para estes filtros.</p> : null}{listQuery.data.nextCursor ? <Button variant="outline" onClick={() => setCursor(listQuery.data!.nextCursor!)}>Próxima página</Button> : null}</> : null}
    {templateId ? <Button variant="outline" disabled={busy} onClick={() => { setTemplateId(undefined); setExistingId(undefined); setFailed(false) }}>Voltar aos modelos</Button> : null}
    {preview ? <section aria-label="Prévia do modelo" className="space-y-3"><h2 className="text-xl font-bold">{preview.title}</h2><p>{preview.isGlobal ? "Modelo SafeMove · somente leitura" : "Modelo privado · snapshot imutável"}</p>{preview.description ? <p>{preview.description}</p> : null}{preview.targetAudience ? <p>Público-alvo: {preview.targetAudience}</p> : null}<WorkoutTemplateParameters content={preview.content} /><Button disabled={busy || Boolean(existingId)} onClick={() => {
      setFailed(false)
      void importMutation.mutateAsync(preview.id).then(draft => { if (draft.recoveredExisting) setExistingId(draft.id); else navigate(draft.id) }).catch(() => setFailed(true))
    }}>{busy ? "Criando rascunho…" : "Usar este modelo"}</Button></section> : null}
    {failed ? <p role="alert">Não foi possível importar. Tente novamente; um rascunho aberto será preservado.</p> : null}
    {existingId ? <div role="status" className="space-y-2"><p>Já existe um rascunho aberto. Ele foi preservado; continue a elaboração antes de importar outro modelo.</p><Button onClick={() => navigate(existingId)}>Continuar rascunho</Button></div> : null}
  </DialogContent></Dialog>
}

type ParameterContent = { durationWeeks?: number | null; periodization?: Periodization | null; splits: { name: string; focus?: string | null; weeklyFrequency?: number | null; exercises: { name: string; sets: string; reps: string; rest?: string | null; muscleGroup?: MuscleGroup | null; secondaryMuscles?: SecondaryMuscle[] | null; effortType?: EffortType | null; effortTarget?: string | null; tempo?: string | null; method?: TrainingMethod | null }[] }[] }
export function WorkoutTemplateParameters({ content }: { content: ParameterContent }) {
  return <div aria-label="Parâmetros incluídos no modelo" className="space-y-3 text-sm">
    <p>Duração: {content.durationWeeks == null ? "Não informada" : `${content.durationWeeks} semanas`}</p>
    {content.periodization ? <p>Periodização: {content.periodization.phases.at(-1)?.endWeek} semanas · {content.periodization.progression ? `progressão a cada ${content.periodization.progression.intervalWeeks} semana(s), repetições +${content.periodization.progression.repsDelta}, esforço ${content.periodization.progression.effortDelta}` : "sem progressão automática"}. A data inicial será definida no rascunho.</p> : null}
    {content.splits.map((split, index) => <section key={index} className="space-y-2 rounded-md border p-3"><h3 className="font-bold">{split.name}</h3><p>Frequência: {split.weeklyFrequency == null ? "Não informada" : `${split.weeklyFrequency} vez(es)/semana`}{split.focus ? ` · Foco: ${split.focus}` : ""}</p><ul className="space-y-3">{split.exercises.map((exercise, exerciseIndex) => <li key={exerciseIndex}><h4 className="font-semibold">{exercise.name}</h4><p>{exercise.sets} séries × {exercise.reps} repetições · Descanso: {exercise.rest || "Não informado"}</p><p>Grupo principal: {exercise.muscleGroup ? MUSCLE_GROUP_LABELS[exercise.muscleGroup] : "Não informado"}</p><p>Secundários: {exercise.secondaryMuscles == null ? "Não informados" : exercise.secondaryMuscles.length ? exercise.secondaryMuscles.map(item => `${(MUSCLE_GROUP_LABELS[item.muscleGroup as MuscleGroup] ?? item.muscleGroup)} (${item.weight})`).join(", ") : "Nenhum"}</p><p>Esforço: {exercise.effortType ? `${exercise.effortType} ${exercise.effortTarget || "Não informado"}` : "Não informado"} · Cadência: {exercise.tempo || "Não informada"} · Método: {exercise.method ? TRAINING_METHOD_LABELS[exercise.method] : "Não informado"}</p></li>)}</ul></section>)}
  </div>
}
