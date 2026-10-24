"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useWorkoutTemplates } from "@/hooks/features/useWorkoutTemplates"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { WorkoutDetail } from "@/types/workout"
import { TEMPLATE_GOAL_LABELS, TEMPLATE_LEVEL_LABELS, type TemplateGoal, type TemplateLevel } from "@/types/workout-template"
import { WorkoutTemplateParameters } from "./WorkoutTemplatePicker"

type Props = { open: boolean; workout: WorkoutDetail; onClose: () => void; onAccessDenied: () => void }
export function SaveWorkoutTemplateDialog(props: Props) {
  const { user } = useAuth()
  const [owner] = useState(user?.sub)
  if (!props.open || !user?.sub || user.role !== "PERSONAL" || owner !== user.sub) return null
  return <SaveSession key={`${user.sub}:${props.workout.clientId}:${props.workout.id}`} {...props} />
}
function SaveSession({ open, workout, onClose, onAccessDenied }: Props) {
  const [title, setTitle] = useState(workout.title)
  const [description, setDescription] = useState("")
  const [goal, setGoal] = useState<TemplateGoal | "">("")
  const [level, setLevel] = useState<TemplateLevel | "">("")
  const [saved, setSaved] = useState(false)
  const [failed, setFailed] = useState(false)
  const { saveMutation, accessDenied } = useWorkoutTemplates({ clientId: workout.clientId, workoutId: workout.id, enabled: false })
  useEffect(() => { if (accessDenied) onAccessDenied() }, [accessDenied, onAccessDenied])
  if (accessDenied) return null
  const eligible = Boolean(workout.finalizedAt && workout.clientId === workout.client.id && workout.client.status === "ACTIVE")
  const busy = saveMutation.isPending
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose() }}><DialogContent overlayClassName="print:hidden" className="print:hidden max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
    <DialogTitle>Salvar modelo de treino</DialogTitle>
    <DialogDescription>Crie um snapshot privado e imutável desta ficha para reutilizar como rascunho.</DialogDescription>
    <p>Não serão incluídos cargas, notas, identidade do aluno ou profissional e data inicial da periodização.</p>
    <WorkoutTemplateParameters content={workout} />
    {!eligible ? <p role="alert">Somente fichas finalizadas de alunos ativos podem originar modelos.</p> : null}
    {saved ? <div role="status"><p>Modelo salvo</p><Button onClick={onClose}>Concluir</Button></div> : <form className="space-y-3" onSubmit={event => {
      event.preventDefault()
      if (!eligible || !title.trim() || !goal || !level || busy) return
      setFailed(false)
      void saveMutation.mutateAsync({ title: title.trim(), description, goal, level }).then(() => setSaved(true)).catch(() => setFailed(true))
    }}>
      <label className="grid gap-1 text-sm">Nome do modelo<input className="min-h-11 rounded-md border bg-background p-2" value={title} maxLength={200} required disabled={busy} onChange={event => setTitle(event.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Objetivo do modelo<select className="min-h-11 rounded-md border bg-background p-2" value={goal} required disabled={busy} onChange={event => setGoal(event.target.value as TemplateGoal)}><option value="">Selecione o objetivo</option>{Object.entries(TEMPLATE_GOAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Nível do modelo<select className="min-h-11 rounded-md border bg-background p-2" value={level} required disabled={busy} onChange={event => setLevel(event.target.value as TemplateLevel)}><option value="">Selecione o nível</option>{Object.entries(TEMPLATE_LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <label className="grid gap-1 text-sm">Descrição do modelo<textarea className="min-h-24 rounded-md border bg-background p-2" value={description} maxLength={2000} disabled={busy} onChange={event => setDescription(event.target.value)} /></label>
      {failed ? <p role="alert">Não foi possível salvar o modelo. Os campos foram preservados; tente novamente.</p> : null}
      <Button type="submit" disabled={!eligible || busy || !title.trim() || !goal || !level}>{busy ? "Salvando modelo…" : "Salvar modelo"}</Button>
    </form>}
  </DialogContent></Dialog>
}
