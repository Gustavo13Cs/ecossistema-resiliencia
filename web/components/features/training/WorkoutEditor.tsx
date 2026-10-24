"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { isAxiosError } from "axios"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  buildWorkoutInput,
  copyWorkoutToForm,
  createEmptyWorkoutForm,
  createWorkoutExercise,
  createWorkoutSplit,
  duplicateExercise,
  duplicateSplit,
  isWorkoutFormDirty,
  moveItem,
  suggestedSecondaryMuscles,
  validateWorkoutForm,
  type WorkoutForm,
  type WorkoutFormSplit,
  type WorkoutFormExercise,
} from "@/lib/workout-form"
import type { Client } from "@/types/client"
import type {
  CreateWorkoutInput,
  MuscleGroup,
  WorkoutPrescription,
} from "@/types/workout"
import type { LibraryReference } from "@/types/exercise-demonstration"
import { useWeeklyVolumeSummary } from "@/hooks/features/useWeeklyVolumeSummary"
import { PeriodizationEditor } from "./PeriodizationEditor"
import { WeeklyVolumePanel } from "./WeeklyVolumePanel"
import { WorkoutSplitCard } from "./WorkoutSplitCard"

export interface WorkoutEditorProps {
  client: Client
  contextUnavailable?: boolean
  activeWorkout: WorkoutPrescription | null
  onSubmit: (input: CreateWorkoutInput) => Promise<WorkoutPrescription>
  onCancel?: () => void
  onAccessDenied?: () => void
}

export function WorkoutEditor({
  client,
  contextUnavailable = false,
  activeWorkout,
  onSubmit,
  onCancel,
  onAccessDenied,
}: WorkoutEditorProps) {
  const router = useRouter()
  const [form, setForm] = useState<WorkoutForm>(() => createEmptyWorkoutForm())
  const weeklyVolume = useWeeklyVolumeSummary(form.splits)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)
  const submittingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const archived = client.status === "ARCHIVED"
  const dirty = isWorkoutFormDirty(form)
  const errors = validateWorkoutForm(form)
  const invalid = Object.keys(errors).length > 0

  useEffect(() => {
    if (!dirty || denied) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [dirty, denied])

  if (denied) {
    return (
      <AsyncState
        kind="error"
        title="Restabeleça seu acesso"
        description="Sua sessão não permite salvar esta prescrição. Entre novamente ou restabeleça seu acesso para continuar."
      />
    )
  }

  const leaveEditor = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.push(`/clientes/${client.id}`)
    }
  }

  const handleBackRequest = () => {
    if (dirty) {
      setDiscardDialogOpen(true)
      return
    }
    leaveEditor()
  }

  const handleStartBlank = () => {
    setSaveError(null)
    setForm(createEmptyWorkoutForm())
  }

  const handleCopyActive = () => {
    if (!activeWorkout) return
    setSaveError(null)
    setForm(copyWorkoutToForm(activeWorkout))
  }

  const addSplit = () => {
    setForm(current => ({
      ...current,
      splits: [...current.splits, createWorkoutSplit(current.splits.length)],
    }))
  }

  const removeSplit = (splitId: string) => {
    setForm(current => ({
      ...current,
      splits: current.splits.filter(split => split.id !== splitId),
    }))
  }

  const moveSplitAtIndex = (splitIndex: number, direction: -1 | 1) => {
    setForm(current => ({
      ...current,
      splits: moveItem(current.splits, splitIndex, direction),
    }))
  }

  const duplicateSplitById = (splitId: string) => {
    setForm(current => {
      const index = current.splits.findIndex(split => split.id === splitId)
      if (index === -1) return current
      const cloned = duplicateSplit(current.splits[index])
      const nextSplits = [...current.splits]
      nextSplits.splice(index + 1, 0, cloned)
      return { ...current, splits: nextSplits }
    })
  }

  const updateSplit = <K extends "name" | "focus" | "weeklyFrequency">(splitId: string, field: K, value: WorkoutFormSplit[K]) => {
    setForm(current => ({
      ...current,
      splits: current.splits.map(split => (split.id === splitId ? { ...split, [field]: value } : split)),
    }))
  }

  const addExercise = (splitId: string) => {
    setForm(current => ({
      ...current,
      splits: current.splits.map(split =>
        split.id === splitId
          ? { ...split, exercises: [...split.exercises, createWorkoutExercise()] }
          : split,
      ),
    }))
  }

  const removeExercise = (splitId: string, exerciseId: string) => {
    setForm(current => ({
      ...current,
      splits: current.splits.map(split =>
        split.id === splitId
          ? { ...split, exercises: split.exercises.filter(ex => ex.id !== exerciseId) }
          : split,
      ),
    }))
  }

  const moveExerciseAtIndex = (
    splitId: string,
    exerciseIndex: number,
    direction: -1 | 1,
  ) => {
    setForm(current => ({
      ...current,
      splits: current.splits.map(split =>
        split.id === splitId
          ? {
              ...split,
              exercises: moveItem(split.exercises, exerciseIndex, direction),
            }
          : split,
      ),
    }))
  }

  const duplicateExerciseById = (splitId: string, exerciseId: string) => {
    setForm(current => ({
      ...current,
      splits: current.splits.map(split => {
        if (split.id !== splitId) return split
        const index = split.exercises.findIndex(ex => ex.id === exerciseId)
        if (index === -1) return split
        const cloned = duplicateExercise(split.exercises[index])
        const nextExercises = [...split.exercises]
        nextExercises.splice(index + 1, 0, cloned)
        return { ...split, exercises: nextExercises }
      }),
    }))
  }

  const updateExercise = <K extends Exclude<keyof WorkoutFormExercise, "id">>(
    splitId: string,
    exerciseId: string,
    field: K,
    value: WorkoutFormExercise[K],
  ) => {
    setForm(current => ({
      ...current,
      splits: current.splits.map(split =>
        split.id === splitId
          ? {
              ...split,
              exercises: split.exercises.map(ex => (ex.id === exerciseId ? { ...ex, [field]: value } : ex)),
            }
          : split,
      ),
    }))
  }

  const selectLibraryExercise = (
    splitId: string,
    exerciseId: string,
    selection: { name: string; muscleGroup: MuscleGroup; libraryReference: LibraryReference },
  ) => {
    setForm(current => ({
      ...current,
      splits: current.splits.map(split =>
        split.id === splitId
          ? {
              ...split,
              exercises: split.exercises.map(ex =>
                ex.id === exerciseId
                  ? {
                      ...ex,
                      name: selection.name,
                      muscleGroup: selection.muscleGroup,
                      libraryReference: selection.libraryReference,
                      secondaryMuscles: suggestedSecondaryMuscles(selection.libraryReference),
                      demonstrationSnapshot: null,
                    }
                  : ex,
              ),
            }
          : split,
      ),
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (contextUnavailable || archived || invalid || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setSaveError(null)
    try {
      const payload = buildWorkoutInput(form, client.id)
      await onSubmit(payload)
    } catch (error) {
      if (!mountedRef.current) return
      const status = isAxiosError(error) ? error.response?.status : undefined
      const code: unknown = isAxiosError(error) ? error.response?.data?.code : undefined
      if (status === 401 || status === 403) {
        setForm(createEmptyWorkoutForm())
        setDenied(true)
        onAccessDenied?.()
      } else if (code === "DEMONSTRATION_SELECTION_STALE") {
        setSaveError("A demonstração selecionada mudou. Abra a biblioteca para selecionar a versão atual ou retire o vínculo do exercício; os demais dados permanecem preenchidos.")
      } else if (status === 409) {
        setSaveError(
          "O prontuário mudou ou foi arquivado. Seus dados continuam em memória; recarregue o prontuário antes de tentar novamente.",
        )
      } else {
        setSaveError("Não foi possível salvar a prescrição. Seus dados continuam preenchidos; tente novamente.")
      }
    } finally {
      submittingRef.current = false
      if (mountedRef.current) {
        setSubmitting(false)
      }
    }
  }

  const disabled = contextUnavailable || archived || submitting
  const durationError = form.durationWeeks.trim() ? errors.durationWeeks : undefined

  return (
    <div className="mx-auto min-w-0 max-w-[1120px] space-y-6 px-4 py-6 text-[var(--sm-ink)] sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--sm-border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-[var(--sm-muted)]">
            Aluno: <span className="text-[var(--sm-ink)]">{client.name}</span>
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Nova prescrição de treino</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={handleBackRequest}>
            Voltar ao prontuário
          </Button>
        </div>
      </header>

      {archived ? (
        <p role="status" className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4 text-sm text-[var(--sm-muted)]">
          Prontuário arquivado: novas prescrições estão bloqueadas. O histórico permanece disponível para consulta.
        </p>
      ) : null}

      {activeWorkout && !archived ? (
        <section
          aria-label="Base da prescrição"
          className="space-y-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
        >
          <p className="text-sm text-[var(--sm-ink)]">
            Salvar esta nova prescrição substituirá o treino ativo (<strong>{activeWorkout.title}</strong>), conservando o registro anterior no histórico do aluno.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={disabled} onClick={handleStartBlank}>
              Começar do zero
            </Button>
            <Button type="button" variant="outline" className="min-h-11" disabled={disabled} onClick={handleCopyActive}>
              Usar treino atual como base
            </Button>
          </div>
        </section>
      ) : null}

      <form onSubmit={handleSubmit} noValidate aria-busy={submitting} className="space-y-6">
        <section
          aria-label="Dados da prescrição"
          className="grid gap-4 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="workout-title">Título da prescrição</Label>
            <Input
              id="workout-title"
              value={form.title}
              disabled={disabled}
              onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
              placeholder="Informe o título do treino"
              className="min-h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workout-goal">Objetivo principal</Label>
            <Input
              id="workout-goal"
              value={form.goal}
              disabled={disabled}
              onChange={event => setForm(current => ({ ...current, goal: event.target.value }))}
              placeholder="Opcional"
              className="min-h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workout-duration">Duração (semanas)</Label>
            <Input
              id="workout-duration"
              type="text"
              inputMode="numeric"
              value={form.durationWeeks}
              disabled={disabled}
              aria-invalid={Boolean(durationError)}
              aria-describedby={durationError ? "workout-duration-error" : undefined}
              onChange={event => setForm(current => ({ ...current, durationWeeks: event.target.value }))}
              placeholder="Opcional (1 a 104)"
              className="min-h-11 tabular-nums"
            />
            {durationError ? (
              <p id="workout-duration-error" className="text-sm text-[var(--sm-danger)]">
                {durationError}
              </p>
            ) : null}
          </div>
        </section>

        <div className="space-y-5">
          <PeriodizationEditor durationWeeks={form.durationWeeks} value={form.periodization} splits={form.splits} disabled={submitting || archived || contextUnavailable} onChange={(periodization, durationWeeks) => setForm(current => ({ ...current, periodization, ...(durationWeeks !== undefined ? { durationWeeks } : {}) }))} />
          <WeeklyVolumePanel summary={weeklyVolume} splits={form.splits} />
          {form.splits.map((split, splitIndex) => (
            <WorkoutSplitCard
              key={split.id}
              split={split}
              splitIndex={splitIndex}
              totalSplits={form.splits.length}
              disabled={disabled}
              errors={errors}
              onUpdateField={(field, value) =>
                updateSplit(split.id, field, value)
              }
              onMoveSplitUp={() => moveSplitAtIndex(splitIndex, -1)}
              onMoveSplitDown={() => moveSplitAtIndex(splitIndex, 1)}
              onDuplicateSplit={() => duplicateSplitById(split.id)}
              onRemoveSplit={() => removeSplit(split.id)}
              onAddExercise={() => addExercise(split.id)}
              onUpdateExercise={(exerciseId, field, value) =>
                updateExercise(split.id, exerciseId, field, value)
              }
              onSelectLibraryExercise={(exerciseId, selection) =>
                selectLibraryExercise(split.id, exerciseId, selection)
              }
              onMoveExerciseUp={exIndex =>
                moveExerciseAtIndex(split.id, exIndex, -1)
              }
              onMoveExerciseDown={exIndex =>
                moveExerciseAtIndex(split.id, exIndex, 1)
              }
              onDuplicateExercise={exerciseId =>
                duplicateExerciseById(split.id, exerciseId)
              }
              onRemoveExercise={exerciseId =>
                removeExercise(split.id, exerciseId)
              }
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="min-h-11"
          onClick={addSplit}
        >
          Adicionar divisão
        </Button>

        <section
          aria-label="Orientações gerais"
          className="space-y-2 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
        >
          <Label htmlFor="workout-notes">Orientações gerais</Label>
          <Textarea
            id="workout-notes"
            value={form.notes}
            disabled={disabled}
            onChange={event => setForm(current => ({ ...current, notes: event.target.value }))}
            placeholder="Registre orientações gerais para este treino"
            className="min-h-24"
          />
        </section>

        {saveError ? (
          <p role="alert" className="text-sm text-[var(--sm-danger)]">
            {saveError}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="submit" disabled={disabled || invalid} className="min-h-11">
            {submitting ? "Salvando prescrição..." : "Salvar prescrição"}
          </Button>
        </div>
      </form>

      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent className="bg-[var(--sm-surface)]">
          <DialogTitle>Descartar alterações?</DialogTitle>
          <DialogDescription>
            Você possui alterações não salvas nesta prescrição. Se sair agora, o conteúdo preenchido será descartado.
          </DialogDescription>
          <div className="flex flex-wrap justify-end gap-2 pt-3">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setDiscardDialogOpen(false)}>
              Continuar editando
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={() => {
                setDiscardDialogOpen(false)
                leaveEditor()
              }}
            >
              Descartar e sair
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
