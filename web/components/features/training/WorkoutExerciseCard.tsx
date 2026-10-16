"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  summarizeAdvancedExercise,
  type WorkoutFormExercise,
} from "@/lib/workout-form"
import {
  EFFORT_TYPE_LABELS,
  MUSCLE_GROUP_OPTIONS,
  TRAINING_METHOD_LABELS,
  type EffortType,
  type MuscleGroup,
  type TrainingMethod,
} from "@/types/workout"
import { ExerciseLibraryCombobox } from "./ExerciseLibraryCombobox"

export interface WorkoutExerciseCardProps {
  exercise: WorkoutFormExercise
  index: number
  totalExercises: number
  disabled?: boolean
  errors: Record<string, string>
  onChange: <K extends Exclude<keyof WorkoutFormExercise, "id">>(
    field: K,
    value: WorkoutFormExercise[K],
  ) => void
  onSelectLibraryExercise: (selection: {
    name: string
    muscleGroup: MuscleGroup
  }) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onRemove: () => void
}

const TRAINING_METHOD_OPTIONS = Object.entries(TRAINING_METHOD_LABELS).map(
  ([value, label]) => ({
    value: value as TrainingMethod,
    label,
  }),
)

const EFFORT_TYPE_OPTIONS = Object.entries(EFFORT_TYPE_LABELS).map(
  ([value, label]) => ({
    value: value as EffortType,
    label,
  }),
)

export function WorkoutExerciseCard({
  exercise,
  index,
  totalExercises,
  disabled,
  errors,
  onChange,
  onSelectLibraryExercise,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: WorkoutExerciseCardProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const tempoError = exercise.tempo.trim()
    ? errors[`exercises.${exercise.id}.tempo`]
    : undefined
  const effortTypeError = errors[`exercises.${exercise.id}.effortType`]
  const effortTargetError = errors[`exercises.${exercise.id}.effortTarget`]
  const loadError = errors[`exercises.${exercise.id}.load`]
  const hasAdvancedError = Boolean(
    tempoError || effortTypeError || effortTargetError,
  )
  const isExpanded = advancedOpen || hasAdvancedError
  const summaryChips = summarizeAdvancedExercise(exercise)

  return (
    <div
      data-testid={`workout-exercise-card-${index}`}
      className="space-y-3 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-[var(--sm-muted)]">
            Exercício {index + 1}
          </span>
          {!isExpanded && summaryChips.length > 0 ? (
            <div
              aria-label={`Resumo avançado do exercício ${index + 1}`}
              className="flex flex-wrap items-center gap-1.5"
            >
              {summaryChips.map(chip => (
                <span
                  key={chip}
                  className="rounded-full border border-[var(--sm-border)] bg-[var(--sm-surface)] px-2.5 py-0.5 text-xs font-semibold text-[var(--sm-ink)]"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || index === 0}
            aria-label={`Mover exercício ${index + 1} para cima`}
            className="min-h-10 px-2.5 text-xs"
            onClick={onMoveUp}
          >
            <ArrowUp className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Subir</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || index === totalExercises - 1}
            aria-label={`Mover exercício ${index + 1} para baixo`}
            className="min-h-10 px-2.5 text-xs"
            onClick={onMoveDown}
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Descer</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={`Duplicar exercício ${index + 1}`}
            className="min-h-10 gap-1.5 px-3 text-xs"
            onClick={onDuplicate}
          >
            <Copy className="size-3.5" aria-hidden="true" />
            Duplicar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="min-h-10 px-3 text-xs"
            onClick={onRemove}
          >
            Remover exercício
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
          <Label htmlFor={`ex-name-${exercise.id}`}>Nome do exercício</Label>
          <div className="flex gap-2">
            <Input
              id={`ex-name-${exercise.id}`}
              value={exercise.name}
              disabled={disabled}
              onChange={event => onChange("name", event.target.value)}
              placeholder="Digite ou busque na biblioteca"
              className="min-h-11 flex-1"
            />
            <ExerciseLibraryCombobox
              exerciseId={exercise.id}
              currentName={exercise.name}
              currentMuscleGroup={exercise.muscleGroup}
              disabled={disabled}
              onSelect={onSelectLibraryExercise}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`ex-sets-${exercise.id}`}>Séries</Label>
          <Input
            id={`ex-sets-${exercise.id}`}
            value={exercise.sets}
            disabled={disabled}
            onChange={event => onChange("sets", event.target.value)}
            placeholder="Ex.: 4"
            className="min-h-11 tabular-nums"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`ex-reps-${exercise.id}`}>Repetições</Label>
          <Input
            id={`ex-reps-${exercise.id}`}
            value={exercise.reps}
            disabled={disabled}
            onChange={event => onChange("reps", event.target.value)}
            placeholder="Ex.: 8-10"
            className="min-h-11 tabular-nums"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`ex-rest-${exercise.id}`}>Descanso</Label>
          <Input
            id={`ex-rest-${exercise.id}`}
            value={exercise.rest}
            disabled={disabled}
            onChange={event => onChange("rest", event.target.value)}
            placeholder="Ex.: 90s"
            className="min-h-11 tabular-nums"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`ex-load-${exercise.id}`}>Carga</Label>
          <Input
            id={`ex-load-${exercise.id}`}
            value={exercise.load}
            disabled={disabled}
            aria-invalid={Boolean(loadError)}
            onChange={event => onChange("load", event.target.value)}
            placeholder="Ex.: 20 kg ou 70% 1RM"
            className="min-h-11"
          />
          {loadError ? (
            <p className="text-xs text-[var(--sm-danger)]">{loadError}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={isExpanded}
          onClick={() => setAdvancedOpen(current => !current)}
          className="min-h-9 gap-1.5 px-3 text-xs font-semibold"
        >
          {isExpanded ? (
            <ChevronUp className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden="true" />
          )}
          Parâmetros avançados
        </Button>
      </div>

      {isExpanded ? (
        <div className="space-y-3 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-3.5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor={`ex-group-${exercise.id}`}>Grupo muscular</Label>
              <select
                id={`ex-group-${exercise.id}`}
                value={exercise.muscleGroup}
                disabled={disabled}
                onChange={event =>
                  onChange(
                    "muscleGroup",
                    event.target.value as MuscleGroup | "",
                  )
                }
                className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"
              >
                <option value="">Não informado</option>
                {MUSCLE_GROUP_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`ex-method-${exercise.id}`}>
                Método de treino
              </Label>
              <select
                id={`ex-method-${exercise.id}`}
                value={exercise.method}
                disabled={disabled}
                onChange={event =>
                  onChange("method", event.target.value as TrainingMethod)
                }
                className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"
              >
                {TRAINING_METHOD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`ex-effort-type-${exercise.id}`}>
                Escala de esforço
              </Label>
              <select
                id={`ex-effort-type-${exercise.id}`}
                value={exercise.effortType}
                disabled={disabled}
                aria-invalid={Boolean(effortTypeError)}
                onChange={event =>
                  onChange("effortType", event.target.value as EffortType | "")
                }
                className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"
              >
                <option value="">Sem escala</option>
                {EFFORT_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {effortTypeError ? (
                <p className="text-xs text-[var(--sm-danger)]">
                  {effortTypeError}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`ex-effort-target-${exercise.id}`}>
                Esforço alvo
              </Label>
              <Input
                id={`ex-effort-target-${exercise.id}`}
                value={exercise.effortTarget}
                disabled={disabled}
                aria-invalid={Boolean(effortTargetError)}
                onChange={event => onChange("effortTarget", event.target.value)}
                placeholder="Ex.: 2 ou 8"
                className="min-h-11 tabular-nums"
              />
              {effortTargetError ? (
                <p className="text-xs text-[var(--sm-danger)]">
                  {effortTargetError}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`ex-tempo-${exercise.id}`}>Cadência</Label>
              <Input
                id={`ex-tempo-${exercise.id}`}
                value={exercise.tempo}
                disabled={disabled}
                aria-invalid={Boolean(tempoError)}
                onChange={event => onChange("tempo", event.target.value)}
                placeholder="Ex.: 3-0-1-0"
                className="min-h-11 tabular-nums"
              />
              {tempoError ? (
                <p className="text-xs text-[var(--sm-danger)]">{tempoError}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`ex-notes-${exercise.id}`}>
              Observações do exercício
            </Label>
            <Input
              id={`ex-notes-${exercise.id}`}
              value={exercise.notes}
              disabled={disabled}
              onChange={event => onChange("notes", event.target.value)}
              placeholder="Opcional"
              className="min-h-11"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
