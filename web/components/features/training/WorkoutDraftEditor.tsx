"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { isAxiosError } from "axios"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { navigateToWorkoutPage } from "@/lib/workout-editor-navigation"
import { useDraftNavigationGuard } from "@/hooks/features/useDraftNavigationGuard"
import { useAuth } from "@/contexts/auth-context"
import { fromDraftContent, toDraftContent, validateDraftForm } from "@/lib/workout-draft-form"
import { adoptSavedFormDemonstrations } from "@/lib/exercise-reference"
import { createEmptyWorkoutForm, createWorkoutExercise, createWorkoutSplit, duplicateExercise, duplicateSplit, moveItem, suggestedSecondaryMuscles, validateWorkoutForm, type WorkoutForm, type WorkoutFormSplit } from "@/lib/workout-form"
import type { Client } from "@/types/client"
import type { WorkoutPrescription } from "@/types/workout"
import type { DraftAck, DraftContentInput, DraftRebaseInput, DraftSaveInput, DraftVersionInput, FinalizedDraftResult, WorkoutDraftResource } from "@/types/workout-draft"
import { useWeeklyVolumeSummary } from "@/hooks/features/useWeeklyVolumeSummary"
import { PeriodizationEditor } from "./PeriodizationEditor"
import { WeeklyVolumePanel } from "./WeeklyVolumePanel"
import { WorkoutSplitCard } from "./WorkoutSplitCard"

export interface WorkoutDraftEditorProps {
  client: Client
  draft: WorkoutDraftResource | null
  onCreate: (content: DraftContentInput) => Promise<WorkoutDraftResource>
  onSave: (input: DraftSaveInput) => Promise<WorkoutDraftResource>
  onFinalize: (input: DraftVersionInput) => Promise<FinalizedDraftResult>
  onRebase: (input: DraftRebaseInput) => Promise<WorkoutDraftResource>
  onDiscard: (input: DraftVersionInput) => Promise<DraftAck>
  onLoadActiveWorkout: () => Promise<WorkoutPrescription | null>
  onAccessDenied: () => void
}

type Busy = "save" | "create" | "finalize" | "rebase" | "discard" | "load" | null
type Confirmation = "finalize" | "rebase" | "discard" | "leave" | null

// A troca de conta/prontuário desmonta todo o estado clínico e invalida callbacks antigos.
export function WorkoutDraftEditor(props: WorkoutDraftEditorProps) {
  const { user } = useAuth()
  if (!user?.sub || user.role !== "PERSONAL" || props.client.professionalId !== user.sub) {
    return <AsyncState kind="error" title="Restabeleça seu acesso" description="Este rascunho está indisponível para sua sessão." />
  }
  if (props.draft && props.draft.clientId !== props.client.id) {
    return <AsyncState kind="error" title="Rascunho indisponível" description="O rascunho não pertence ao prontuário solicitado." />
  }
  return <DraftEditorScope key={`${user.sub}:${props.client.id}`} {...props} />
}

function DraftEditorScope(props: WorkoutDraftEditorProps) {
  const [denied, setDenied] = useState(false)
  if (denied) return <AsyncState kind="error" title="Restabeleça seu acesso" description="Sua sessão não permite acessar este rascunho. Entre novamente para continuar." />
  return <DraftEditorSession key={props.draft?.id ?? "new"} {...props} onAccessDenied={() => {
    setDenied(true)
    props.onAccessDenied()
  }} />
}

function initialForm(draft: WorkoutDraftResource | null) {
  return draft?.content ? fromDraftContent(draft.content) : createEmptyWorkoutForm()
}

function DraftEditorSession({ client, draft, onCreate, onSave, onFinalize, onRebase, onDiscard, onLoadActiveWorkout, onAccessDenied }: WorkoutDraftEditorProps) {
  const router = useRouter()
  const [resource, setResource] = useState(draft)
  const [form, setForm] = useState(() => initialForm(draft))
  const weeklyVolume = useWeeklyVolumeSummary(form.splits)
  const [baseline, setBaseline] = useState(() => JSON.stringify(form))
  const [busy, setBusy] = useState<Busy>(null)
  const [handoff, setHandoff] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [needsRebase, setNeedsRebase] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation>(null)
  const [activeSeen, setActiveSeen] = useState<WorkoutPrescription | null>(null)
  const mounted = useRef(true)
  const blocked = useRef(false)
  const pending = useRef(false)
  const revision = useRef(0)
  const formRef = useRef(form)
  const pendingLeave = useRef<(() => void) | null>(null)
  const dialogOrigin = useRef<HTMLElement | null>(null)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const dirty = !denied && JSON.stringify(form) !== baseline
  const archived = client.status === "ARCHIVED"
  const terminal = Boolean(resource && resource.status !== "OPEN")
  const readonly = archived || terminal || denied
  const actionsDisabled = busy !== null || handoff !== null
  const fieldsDisabled = readonly || handoff !== null || (busy !== null && busy !== "save")

  const allowNavigation = useDraftNavigationGuard(dirty && !readonly, proceed => {
    pendingLeave.current = proceed
    setConfirmation("leave")
  })


  function edit(update: (current: WorkoutForm) => WorkoutForm) {
    if (fieldsDisabled) return
    revision.current += 1
    const next = update(formRef.current)
    formRef.current = next
    setForm(next)
    setErrors({}); setMessage(null)
  }
  function updateSplit(id: string, update: (split: WorkoutFormSplit) => WorkoutFormSplit) {
    edit(current => ({ ...current, splits: current.splits.map(split => split.id === id ? update(split) : split) }))
  }
  function begin(operation: Exclude<Busy, null>) {
    if (pending.current || readonly || handoff !== null) return null
    pending.current = true; setBusy(operation); setMessage(null)
    return () => mounted.current && !blocked.current
  }
  function finish(current: () => boolean) { if (current()) { pending.current = false; setBusy(null) } }
  function handleError(error: unknown, current: () => boolean) {
    if (!current()) return
    const status = isAxiosError(error) ? error.response?.status : undefined
    const code: unknown = isAxiosError(error) ? error.response?.data?.code : undefined
    if (status === 401 || status === 403) {
      blocked.current = true
      formRef.current = createEmptyWorkoutForm()
      setDenied(true); setForm(formRef.current); setResource(null); setActiveSeen(null)
      setBaseline(""); setConfirmation(null); setErrors({}); setMessage(null); setBusy(null); setHandoff(null)
      onAccessDenied()
    } else if (status === 413) {
      setMessage("O rascunho excede o limite de 64 KiB. Reduza o conteúdo e tente salvar novamente.")
    } else if (code === "DEMONSTRATION_SELECTION_STALE") {
      setMessage("A demonstração selecionada mudou. Abra a biblioteca para selecionar a versão atual ou retire o vínculo do exercício; suas alterações permanecem aqui.")
    } else if (code === "ACTIVE_WORKOUT_CHANGED") {
      setNeedsRebase(true)
      setMessage("O treino ativo mudou. Revise a ficha atual e confirme a nova base antes de finalizar.")
    } else if (status === 409) {
      setMessage("O rascunho mudou ou não permite esta operação. Reabra a versão salva antes de continuar; suas alterações permanecem aqui.")
    } else if (status === 404) {
      setMessage("Rascunho indisponível. Verifique o acesso antes de tentar novamente.")
    } else {
      setMessage("Não foi possível concluir a operação. Suas alterações permanecem aqui. Tente novamente.")
    }
  }
  function checkResource(saved: WorkoutDraftResource) {
    if (saved.clientId !== client.id || (resource && saved.id !== resource.id) || saved.status !== "OPEN" || !saved.content) throw new Error("Resposta de rascunho incompatível")
  }
  async function saveSnapshot(snapshot: WorkoutForm, current: () => boolean) {
    const content = toDraftContent(snapshot)
    const saved = resource
      ? await onSave({ expectedVersion: resource.version, content })
      : await onCreate(content)
    if (!current()) return null
    checkResource(saved)
    setResource(saved)
    // O baseline pertence ao snapshot enviado, nunca ao formulário após o await.
    const savedContent = saved.content
    const baselineForm = savedContent ? adoptSavedFormDemonstrations(snapshot, snapshot, savedContent) : snapshot
    const currentForm = savedContent ? adoptSavedFormDemonstrations(formRef.current, snapshot, savedContent) : formRef.current
    formRef.current = currentForm
    setForm(currentForm)
    setBaseline(JSON.stringify(baselineForm))
    return saved
  }
  function openSavedDraft(path: string) {
    // router.replace é void: somente a montagem do draft de destino encerra o handoff.
    setHandoff(path)
    setMessage(null)
    try { allowNavigation(() => navigateToWorkoutPage(router, path, "replace")) }
    catch { setMessage("O rascunho foi salvo, mas não foi possível abrir a página. Tente novamente.") }
  }
  async function save() {
    const validation = validateDraftForm(formRef.current)
    setErrors(validation)
    if (Object.keys(validation).length) return
    const current = begin(resource ? "save" : "create")
    if (!current) return
    try {
      const saved = await saveSnapshot(formRef.current, current)
      if (saved && current() && !resource) openSavedDraft(`/clientes/${client.id}/rascunhos/${saved.id}`)
    }
    catch (error) { handleError(error, current) }
    finally { finish(current) }
  }
  function requestFinalize() {
    if (readonly || pending.current || handoff !== null) return
    const validation = { ...validateDraftForm(formRef.current), ...validateWorkoutForm(formRef.current) }
    setErrors(validation)
    if (!Object.keys(validation).length) setConfirmation("finalize")
  }
  async function finalize() {
    setConfirmation(null)
    const snapshot = formRef.current
    const validation = { ...validateDraftForm(snapshot), ...validateWorkoutForm(snapshot) }
    setErrors(validation)
    if (Object.keys(validation).length) return
    const current = begin(!resource ? "create" : dirty ? "save" : "finalize")
    if (!current) return
    const submittedRevision = revision.current
    try {
      const saved = !resource || dirty ? await saveSnapshot(snapshot, current) : resource
      if (!saved || !current()) return
      if (revision.current !== submittedRevision) {
        setMessage("Há novas alterações não salvas. Revise o conteúdo e finalize novamente.")
        return
      }
      setBusy("finalize")
      const result = await onFinalize({ expectedVersion: saved.version })
      if (!current()) return
      if (result.id !== saved.id || result.clientId !== client.id || result.workout.clientId !== client.id || result.workout.id !== result.finalizedWorkoutId) throw new Error("Prescrição incompatível")
      setResource({ ...saved, ...result, content: null }); setBaseline(JSON.stringify(formRef.current))
      formRef.current = createEmptyWorkoutForm()
      setForm(formRef.current)
      allowNavigation(() => navigateToWorkoutPage(router, `/clientes/${client.id}/treinos/${result.finalizedWorkoutId}`))
    } catch (error) { handleError(error, current) }
    finally { finish(current) }
  }
  async function loadRebase() {
    const current = begin("load")
    if (!current) return
    try {
      const active = await onLoadActiveWorkout()
      if (!current()) return
      if (active && active.clientId !== client.id) throw new Error("Treino ativo incompatível")
      setActiveSeen(active); setConfirmation("rebase")
    } catch (error) { handleError(error, current) }
    finally { finish(current) }
  }
  async function rebase() {
    setConfirmation(null)
    if (!resource) return
    const current = begin("rebase")
    if (!current) return
    try {
      const saved = await onRebase({ expectedVersion: resource.version, expectedActiveWorkoutId: activeSeen?.id ?? null })
      if (!current()) return
      checkResource(saved)
      setResource(saved); setNeedsRebase(false); setActiveSeen(null)
      setMessage("Nova base confirmada. Finalize a prescrição quando estiver pronta.")
    } catch (error) { handleError(error, current) }
    finally { finish(current) }
  }
  async function discard() {
    setConfirmation(null)
    if (!resource) return
    const current = begin("discard")
    if (!current) return
    try {
      const result = await onDiscard({ expectedVersion: resource.version })
      if (!current()) return
      if (result.id !== resource.id || result.clientId !== client.id || result.status !== "DISCARDED") throw new Error("Resposta incompatível")
      formRef.current = createEmptyWorkoutForm()
      setResource({ ...resource, ...result, content: null }); setForm(formRef.current); setBaseline("")
      allowNavigation(() => navigateToWorkoutPage(router, `/clientes/${client.id}`))
    } catch (error) { handleError(error, current) }
    finally { finish(current) }
  }

  if (denied) return <AsyncState kind="error" title="Restabeleça seu acesso" description="Sua sessão não permite acessar este rascunho. Entre novamente para continuar." />
  if (terminal) return <AsyncState kind="empty" title={resource?.status === "FINALIZED" ? "Prescrição finalizada" : "Rascunho descartado"} description="Esta elaboração já foi encerrada." />

  const savedAt = resource ? new Date(resource.updatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : null
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{form.title || "Rascunho sem título"}</h1><p>{client.name}</p></div>
        <Button type="button" variant="outline" disabled={actionsDisabled} onClick={() => dirty ? setConfirmation("leave") : navigateToWorkoutPage(router, `/clientes/${client.id}`)}>Voltar para aluno</Button>
      </div>
      {archived ? <p role="status">Aluno arquivado. Rascunho disponível apenas para leitura.</p> : null}
      <p role="status" aria-live="polite">{busy === "save" || busy === "create" ? "Salvando" : dirty ? "Alterações não salvas" : savedAt ? `Rascunho salvo às ${savedAt}` : "Salve o rascunho para retomar depois."}</p>
      {handoff ? <div className="space-y-3">
        <p role="status">O rascunho foi salvo. Abrindo a página para continuar.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => openSavedDraft(handoff)}>Tentar abrir rascunho salvo</Button>
          <a className="text-sm font-semibold underline" href={handoff}>Abrir rascunho salvo</a>
        </div>
      </div> : null}
      {message ? <p role="alert">{message}</p> : null}
      {Object.keys(errors).length ? <div role="alert"><p>Revise os campos indicados:</p><ul>{Object.entries(errors).map(([key, value]) => <li key={key}>{value}</li>)}</ul></div> : null}
      {needsRebase ? <Button type="button" disabled={readonly || actionsDisabled} onClick={() => void loadRebase()}>Revisar treino ativo</Button> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="draft-title">Título da prescrição</Label><Input id="draft-title" disabled={fieldsDisabled} aria-invalid={Boolean(errors.title)} value={form.title} onChange={event => edit(current => ({ ...current, title: event.target.value }))} /></div>
        <div className="space-y-2"><Label htmlFor="draft-goal">Objetivo</Label><Input id="draft-goal" disabled={fieldsDisabled} value={form.goal} onChange={event => edit(current => ({ ...current, goal: event.target.value }))} /></div>
        <div className="space-y-2"><Label htmlFor="draft-duration">Duração (semanas)</Label><Input id="draft-duration" inputMode="numeric" disabled={fieldsDisabled} aria-invalid={Boolean(errors.durationWeeks)} value={form.durationWeeks} onChange={event => edit(current => ({ ...current, durationWeeks: event.target.value }))} /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="draft-notes">Orientações gerais</Label><Textarea id="draft-notes" disabled={fieldsDisabled} value={form.notes} onChange={event => edit(current => ({ ...current, notes: event.target.value }))} /></div>
      </div>
      <PeriodizationEditor durationWeeks={form.durationWeeks} value={form.periodization} disabled={fieldsDisabled} onChange={(periodization, durationWeeks) => edit(current => ({ ...current, periodization, ...(durationWeeks !== undefined ? { durationWeeks } : {}) }))} />
      <WeeklyVolumePanel summary={weeklyVolume} splits={form.splits} />
      {form.splits.map((split, index) => <WorkoutSplitCard
        key={split.id} split={split} splitIndex={index} totalSplits={form.splits.length} disabled={fieldsDisabled} errors={errors}
        onUpdateField={(field, value) => updateSplit(split.id, item => ({ ...item, [field]: value }))}
        onMoveSplitUp={() => edit(current => ({ ...current, splits: moveItem(current.splits, index, -1) }))}
        onMoveSplitDown={() => edit(current => ({ ...current, splits: moveItem(current.splits, index, 1) }))}
        onDuplicateSplit={() => edit(current => ({ ...current, splits: current.splits.flatMap(item => item.id === split.id ? [item, duplicateSplit(item)] : [item]) }))}
        onRemoveSplit={() => edit(current => ({ ...current, splits: current.splits.filter(item => item.id !== split.id) }))}
        onAddExercise={() => updateSplit(split.id, item => ({ ...item, exercises: [...item.exercises, createWorkoutExercise()] }))}
        onUpdateExercise={(id, field, value) => updateSplit(split.id, item => ({ ...item, exercises: item.exercises.map(exercise => exercise.id === id ? { ...exercise, [field]: value } : exercise) }))}
        onSelectLibraryExercise={(id, selection) => updateSplit(split.id, item => ({ ...item, exercises: item.exercises.map(exercise => exercise.id === id ? { ...exercise, ...selection, secondaryMuscles: suggestedSecondaryMuscles(selection.libraryReference), demonstrationSnapshot: null } : exercise) }))}
        onMoveExerciseUp={position => updateSplit(split.id, item => ({ ...item, exercises: moveItem(item.exercises, position, -1) }))}
        onMoveExerciseDown={position => updateSplit(split.id, item => ({ ...item, exercises: moveItem(item.exercises, position, 1) }))}
        onDuplicateExercise={id => updateSplit(split.id, item => ({ ...item, exercises: item.exercises.flatMap(exercise => exercise.id === id ? [exercise, duplicateExercise(exercise)] : [exercise]) }))}
        onRemoveExercise={id => updateSplit(split.id, item => ({ ...item, exercises: item.exercises.filter(exercise => exercise.id !== id) }))}
      />)}
      <Button type="button" variant="outline" disabled={fieldsDisabled} onClick={() => edit(current => ({ ...current, splits: [...current.splits, createWorkoutSplit(current.splits.length)] }))}>Adicionar divisão</Button>
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={readonly || actionsDisabled} onClick={() => void save()}>Salvar rascunho</Button>
        <Button type="button" disabled={readonly || actionsDisabled} onClick={requestFinalize}>Finalizar prescrição</Button>
        <Button type="button" variant="outline" disabled={readonly || actionsDisabled || !resource} onClick={() => setConfirmation("discard")}>Descartar rascunho</Button>
      </div>
      <AlertDialog open={confirmation !== null} onOpenChange={open => { if (!open) { setConfirmation(null); pendingLeave.current = null } }}>
        <AlertDialogContent onOpenAutoFocus={() => {
          dialogOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        }} onCloseAutoFocus={event => {
          const origin = dialogOrigin.current
          dialogOrigin.current = null
          if (origin?.isConnected && !origin.matches(":disabled")) {
            event.preventDefault()
            origin.focus()
          }
        }}>
          <AlertDialogTitle>{confirmation === "rebase" ? "Confirmar nova base" : confirmation === "discard" ? "Descartar rascunho?" : confirmation === "leave" ? "Sair com alterações não salvas?" : "Finalizar prescrição?"}</AlertDialogTitle>
          <AlertDialogDescription>{confirmation === "rebase" ? activeSeen ? `Treino ativo atual: ${activeSeen.title}. Confirme esta ficha como base para a próxima finalização.` : "Não há treino ativo. Confirme esta situação como base para a próxima finalização." : confirmation === "discard" ? "O rascunho salvo será encerrado. As prescrições finalizadas permanecem no histórico." : confirmation === "leave" ? "As alterações locais serão perdidas. O último rascunho salvo permanece no servidor." : "A prescrição válida será finalizada e substituirá o treino ativo. As fichas anteriores permanecem no histórico."}</AlertDialogDescription>
          {confirmation === "rebase" && activeSeen ? <a className="text-sm font-semibold underline" href={`/clientes/${client.id}/treinos/${activeSeen.id}`} target="_blank" rel="noopener noreferrer">Consultar ficha ativa em outra aba</a> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmation === "rebase") void rebase()
              else if (confirmation === "discard") void discard()
              else if (confirmation === "leave") { setConfirmation(null); const proceed = pendingLeave.current; pendingLeave.current = null; allowNavigation(() => proceed ? proceed() : navigateToWorkoutPage(router, `/clientes/${client.id}`)) }
              else void finalize()
            }}>{confirmation === "rebase" ? "Confirmar nova base" : confirmation === "discard" ? "Confirmar descarte" : confirmation === "leave" ? "Sair sem salvar alterações" : "Confirmar finalização"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
