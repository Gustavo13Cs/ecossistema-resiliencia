"use client"

import { useState } from "react"
import { isAxiosError } from "axios"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useWeeklyVolumeSummary } from "@/hooks/features/useWeeklyVolumeSummary"
import { useWorkoutTemplateHubMutations } from "@/hooks/features/useWorkoutTemplates"
import { fromDraftContent, toDraftContent } from "@/lib/workout-draft-form"
import {
  createEmptyWorkoutForm,
  createWorkoutExercise,
  createWorkoutSplit,
  duplicateExercise,
  duplicateSplit,
  moveItem,
  suggestedSecondaryMuscles,
  validateWorkoutForm,
  type WorkoutForm,
  type WorkoutFormSplit,
} from "@/lib/workout-form"
import { validatePeriodization } from "@/lib/workout-periodization"
import {
  TRAINING_ENVIRONMENT_LABELS,
  type TrainingEnvironment,
} from "@/types/training-anamnesis"
import {
  TEMPLATE_GOAL_LABELS,
  TEMPLATE_LEVEL_LABELS,
  type TemplateGoal,
  type TemplateLevel,
  type WorkoutTemplateDetail,
} from "@/types/workout-template"
import { PeriodizationEditor } from "./PeriodizationEditor"
import { WeeklyVolumePanel } from "./WeeklyVolumePanel"
import { WorkoutSplitCard } from "./WorkoutSplitCard"

export interface WorkoutTemplateFormDialogProps {
  open: boolean
  initialTemplate?: WorkoutTemplateDetail | null
  onClose: () => void
  onSuccess: (saved: WorkoutTemplateDetail) => void
  onAccessDenied: () => void
}

const selectClass =
  "min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"

function buildInitialWorkoutForm(
  template?: WorkoutTemplateDetail | null,
): WorkoutForm {
  if (template?.content) {
    return fromDraftContent(template.content)
  }
  const empty = createEmptyWorkoutForm()
  const split = createWorkoutSplit(0)
  return {
    ...empty,
    durationWeeks: "8",
    splits: [{ ...split, exercises: [createWorkoutExercise()] }],
  }
}

function validateTemplateForm(
  title: string,
  goal: TemplateGoal | "",
  level: TemplateLevel | "",
  form: WorkoutForm,
): Record<string, string> {
  const normalizedForm: WorkoutForm = {
    ...form,
    title: title.trim(),
    goal: goal ? TEMPLATE_GOAL_LABELS[goal] : "",
  }
  const errors = validateWorkoutForm(normalizedForm)
  delete errors.periodization

  if (title.trim().length < 2) {
    errors.title = "Informe um nome com ao menos 2 caracteres para o modelo."
  }
  if (!goal) {
    errors.goal = "Selecione o objetivo principal do modelo."
  }
  if (!level) {
    errors.level = "Selecione o nível recomendado do modelo."
  }

  const parsedDuration = form.durationWeeks.trim()
    ? Number(form.durationWeeks)
    : null
  const periodErrors = validatePeriodization(
    form.periodization,
    parsedDuration,
    false,
  )
  if (periodErrors.length > 0) {
    errors.periodization = periodErrors.join(" ")
  }

  const serialized = toDraftContent(normalizedForm)
  if (new TextEncoder().encode(JSON.stringify(serialized)).byteLength > 65536) {
    errors.content =
      "O modelo excede o limite de 64 KiB. Reduza divisões ou exercícios antes de salvar."
  }

  return errors
}

export function WorkoutTemplateFormDialog(
  props: WorkoutTemplateFormDialogProps,
) {
  const { user } = useAuth()
  if (!props.open || !user?.sub || user.role !== "PERSONAL") return null
  return (
    <TemplateFormSession
      key={`${user.sub}:${props.initialTemplate?.id ?? "new"}`}
      {...props}
    />
  )
}

function TemplateFormSession({
  open,
  initialTemplate,
  onClose,
  onSuccess,
  onAccessDenied,
}: WorkoutTemplateFormDialogProps) {
  const isEditing = Boolean(initialTemplate)
  const { createStandaloneMutation, updateTemplateMutation } =
    useWorkoutTemplateHubMutations()

  const [title, setTitle] = useState(() => initialTemplate?.title ?? "")
  const [goal, setGoal] = useState<TemplateGoal | "">(
    () => initialTemplate?.goal ?? "",
  )
  const [level, setLevel] = useState<TemplateLevel | "">(
    () => initialTemplate?.level ?? "",
  )
  const [environment, setEnvironment] = useState<TrainingEnvironment | "">(
    () => initialTemplate?.environment ?? "",
  )
  const [targetAudience, setTargetAudience] = useState(
    () => initialTemplate?.targetAudience ?? "",
  )
  const [description, setDescription] = useState(
    () => initialTemplate?.description ?? "",
  )
  const [form, setForm] = useState<WorkoutForm>(() =>
    buildInitialWorkoutForm(initialTemplate),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const weeklyVolume = useWeeklyVolumeSummary(form.splits)
  const busy =
    createStandaloneMutation.isPending || updateTemplateMutation.isPending

  const updateForm = (updater: (current: WorkoutForm) => WorkoutForm) => {
    if (busy) return
    setForm(updater)
    setErrors({})
    setSubmitError(null)
  }

  const updateSplit = (
    splitId: string,
    updater: (split: WorkoutFormSplit) => WorkoutFormSplit,
  ) => {
    updateForm(current => ({
      ...current,
      splits: current.splits.map(split =>
        split.id === splitId ? updater(split) : split,
      ),
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return

    const validation = validateTemplateForm(title, goal, level, form)
    setErrors(validation)
    setSubmitError(null)
    if (Object.keys(validation).length > 0 || !goal || !level) {
      return
    }

    const content = toDraftContent({
      ...form,
      title: title.trim(),
      goal: TEMPLATE_GOAL_LABELS[goal],
      notes: "",
      periodization: form.periodization
        ? { ...form.periodization, startsOn: "" }
        : null,
    })

    try {
      const saved =
        isEditing && initialTemplate
          ? await updateTemplateMutation.mutateAsync({
              templateId: initialTemplate.id,
              input: {
                title: title.trim(),
                goal,
                level,
                environment: environment || null,
                targetAudience: targetAudience.trim() || null,
                description: description.trim() || null,
                content,
              },
            })
          : await createStandaloneMutation.mutateAsync({
              title: title.trim(),
              goal,
              level,
              environment: environment || null,
              targetAudience: targetAudience.trim() || null,
              description: description.trim() || null,
              content,
            })
      onSuccess(saved)
    } catch (error) {
      if (
        isAxiosError(error) &&
        [401, 403].includes(error.response?.status ?? 0)
      ) {
        onAccessDenied()
        return
      }
      const code = isAxiosError<{ code?: string }>(error)
        ? error.response?.data?.code
        : undefined
      if (code === "TEMPLATE_REFERENCE_UNAVAILABLE") {
        setSubmitError(
          "Um exercício vinculado da biblioteca não está mais disponível. Atualize ou retire o vínculo antes de salvar.",
        )
        return
      }
      setSubmitError(
        "Não foi possível salvar o modelo de treino. Suas alterações foram preservadas; tente novamente.",
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && !busy) onClose()
      }}
    >
      <DialogContent
        overlayClassName="print:hidden"
        className="max-h-[92dvh] overflow-y-auto sm:max-w-5xl print:hidden"
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Editar modelo de treino"
              : "Novo modelo de treino"}
          </DialogTitle>
          <DialogDescription>
            Estruture divisões, seleção de exercícios, cadência, métodos e
            periodização sem vincular dados clínicos de nenhum aluno. Cargas
            individuais e data inicial do bloco serão definidas ao aplicar em um
            prontuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={event => void handleSubmit(event)} className="space-y-6">
          {Object.keys(errors).length > 0 ? (
            <div
              role="alert"
              className="space-y-1.5 rounded-[var(--sm-radius-sm)] border border-[var(--sm-danger)] bg-[var(--sm-surface)] p-3 text-sm text-[var(--sm-danger)]"
            >
              <p className="font-bold">Revise os campos antes de salvar:</p>
              <ul className="list-inside list-disc space-y-0.5 text-xs">
                {Object.entries(errors).map(([key, value]) => (
                  <li key={key}>{value}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {submitError ? (
            <p
              role="alert"
              className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-danger)] bg-[var(--sm-surface)] p-3 text-sm text-[var(--sm-danger)]"
            >
              {submitError}
            </p>
          ) : null}

          <fieldset
            disabled={busy}
            className="grid gap-4 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <legend className="px-1 text-xs font-extrabold uppercase tracking-wider text-[var(--sm-muted)]">
              Identificação e classificação do modelo
            </legend>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="tpl-title">Nome do modelo</Label>
              <Input
                id="tpl-title"
                name="title"
                value={title}
                maxLength={200}
                aria-invalid={Boolean(errors.title)}
                onChange={event => {
                  setTitle(event.target.value)
                  if (errors.title) {
                    setErrors(prev => {
                      const next = { ...prev }
                      delete next.title
                      return next
                    })
                  }
                }}
                placeholder="Ex.: Upper / Lower Hipertrofia 4x — Condomínio"
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-goal">Objetivo principal</Label>
              <select
                id="tpl-goal"
                name="goal"
                value={goal}
                aria-invalid={Boolean(errors.goal)}
                onChange={event => {
                  setGoal(event.target.value as TemplateGoal | "")
                  setErrors(prev => {
                    const next = { ...prev }
                    delete next.goal
                    return next
                  })
                }}
                className={selectClass}
              >
                <option value="">Selecione o objetivo</option>
                {Object.entries(TEMPLATE_GOAL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-level">Nível recomendado</Label>
              <select
                id="tpl-level"
                name="level"
                value={level}
                aria-invalid={Boolean(errors.level)}
                onChange={event => {
                  setLevel(event.target.value as TemplateLevel | "")
                  setErrors(prev => {
                    const next = { ...prev }
                    delete next.level
                    return next
                  })
                }}
                className={selectClass}
              >
                <option value="">Selecione o nível</option>
                {Object.entries(TEMPLATE_LEVEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-environment">
                Ambiente recomendado (opcional)
              </Label>
              <select
                id="tpl-environment"
                name="environment"
                value={environment}
                onChange={event =>
                  setEnvironment(event.target.value as TrainingEnvironment | "")
                }
                className={selectClass}
              >
                <option value="">Qualquer ambiente</option>
                {Object.entries(TRAINING_ENVIRONMENT_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
              <Label htmlFor="tpl-audience">Público-alvo (opcional)</Label>
              <Input
                id="tpl-audience"
                name="targetAudience"
                value={targetAudience}
                maxLength={120}
                onChange={event => setTargetAudience(event.target.value)}
                placeholder="Ex.: Adultos intermediários com até 50 min por sessão"
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-duration">Duração estimada (semanas)</Label>
              <Input
                id="tpl-duration"
                name="durationWeeks"
                inputMode="numeric"
                value={form.durationWeeks}
                aria-invalid={Boolean(errors.durationWeeks)}
                onChange={event =>
                  updateForm(current => ({
                    ...current,
                    durationWeeks: event.target.value,
                  }))
                }
                placeholder="Ex.: 8"
                className="min-h-11 tabular-nums"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="tpl-description">
                Descrição metodológica (opcional)
              </Label>
              <Textarea
                id="tpl-description"
                name="description"
                value={description}
                maxLength={2000}
                rows={2}
                onChange={event => setDescription(event.target.value)}
                placeholder="Explique foco técnico, distribuição semanal e quando utilizar este modelo."
              />
            </div>
          </fieldset>

          <PeriodizationEditor
            durationWeeks={form.durationWeeks}
            value={form.periodization}
            splits={form.splits}
            disabled={busy}
            onChange={(periodization, durationWeeks) =>
              updateForm(current => ({
                ...current,
                periodization: periodization
                  ? { ...periodization, startsOn: "" }
                  : null,
                ...(durationWeeks !== undefined ? { durationWeeks } : {}),
              }))
            }
          />

          <WeeklyVolumePanel summary={weeklyVolume} splits={form.splits} />

          <div className="space-y-4">
            {form.splits.map((split, splitIndex) => (
              <WorkoutSplitCard
                key={split.id}
                split={split}
                splitIndex={splitIndex}
                totalSplits={form.splits.length}
                disabled={busy}
                errors={errors}
                onUpdateField={(field, value) =>
                  updateSplit(split.id, item => ({ ...item, [field]: value }))
                }
                onMoveSplitUp={() =>
                  updateForm(current => ({
                    ...current,
                    splits: moveItem(current.splits, splitIndex, -1),
                  }))
                }
                onMoveSplitDown={() =>
                  updateForm(current => ({
                    ...current,
                    splits: moveItem(current.splits, splitIndex, 1),
                  }))
                }
                onDuplicateSplit={() =>
                  updateForm(current => ({
                    ...current,
                    splits: current.splits.flatMap(item =>
                      item.id === split.id
                        ? [item, duplicateSplit(item)]
                        : [item],
                    ),
                  }))
                }
                onRemoveSplit={() =>
                  updateForm(current => ({
                    ...current,
                    splits: current.splits.filter(item => item.id !== split.id),
                  }))
                }
                onAddExercise={() =>
                  updateSplit(split.id, item => ({
                    ...item,
                    exercises: [...item.exercises, createWorkoutExercise()],
                  }))
                }
                onUpdateExercise={(exerciseId, field, value) =>
                  updateSplit(split.id, item => ({
                    ...item,
                    exercises: item.exercises.map(exercise =>
                      exercise.id === exerciseId
                        ? { ...exercise, [field]: value }
                        : exercise,
                    ),
                  }))
                }
                onSelectLibraryExercise={(exerciseId, selection) =>
                  updateSplit(split.id, item => ({
                    ...item,
                    exercises: item.exercises.map(exercise =>
                      exercise.id === exerciseId
                        ? {
                            ...exercise,
                            ...selection,
                            secondaryMuscles: suggestedSecondaryMuscles(
                              selection.libraryReference,
                            ),
                            demonstrationSnapshot: null,
                          }
                        : exercise,
                    ),
                  }))
                }
                onMoveExerciseUp={position =>
                  updateSplit(split.id, item => ({
                    ...item,
                    exercises: moveItem(item.exercises, position, -1),
                  }))
                }
                onMoveExerciseDown={position =>
                  updateSplit(split.id, item => ({
                    ...item,
                    exercises: moveItem(item.exercises, position, 1),
                  }))
                }
                onDuplicateExercise={exerciseId =>
                  updateSplit(split.id, item => ({
                    ...item,
                    exercises: item.exercises.flatMap(exercise =>
                      exercise.id === exerciseId
                        ? [exercise, duplicateExercise(exercise)]
                        : [exercise],
                    ),
                  }))
                }
                onRemoveExercise={exerciseId =>
                  updateSplit(split.id, item => ({
                    ...item,
                    exercises: item.exercises.filter(
                      exercise => exercise.id !== exerciseId,
                    ),
                  }))
                }
              />
            ))}

            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="min-h-11"
              onClick={() =>
                updateForm(current => ({
                  ...current,
                  splits: [
                    ...current.splits,
                    createWorkoutSplit(current.splits.length),
                  ],
                }))
              }
            >
              Adicionar divisão ao modelo
            </Button>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="min-h-11"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="min-h-11">
              {busy
                ? "Salvando modelo..."
                : isEditing
                  ? "Salvar alterações do modelo"
                  : "Criar modelo privado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
