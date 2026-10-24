"use client"

import { ArrowDown, ArrowUp, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { WorkoutFormExercise, WorkoutFormSplit } from "@/lib/workout-form"
import type { MuscleGroup } from "@/types/workout"
import type { LibraryReference } from "@/types/exercise-demonstration"
import { WorkoutExerciseCard } from "./WorkoutExerciseCard"

export interface WorkoutSplitCardProps {
  split: WorkoutFormSplit
  splitIndex: number
  totalSplits: number
  disabled?: boolean
  errors: Record<string, string>
  onUpdateField: <K extends "name" | "focus" | "weeklyFrequency">(field: K, value: WorkoutFormSplit[K]) => void
  onMoveSplitUp: () => void
  onMoveSplitDown: () => void
  onDuplicateSplit: () => void
  onRemoveSplit: () => void
  onAddExercise: () => void
  onUpdateExercise: <K extends Exclude<keyof WorkoutFormExercise, "id">>(
    exerciseId: string,
    field: K,
    value: WorkoutFormExercise[K],
  ) => void
  onSelectLibraryExercise: (
    exerciseId: string,
    selection: { name: string; muscleGroup: MuscleGroup; libraryReference: LibraryReference },
  ) => void
  onMoveExerciseUp: (exerciseIndex: number) => void
  onMoveExerciseDown: (exerciseIndex: number) => void
  onDuplicateExercise: (exerciseId: string) => void
  onRemoveExercise: (exerciseId: string) => void
}

export function WorkoutSplitCard({
  split,
  splitIndex,
  totalSplits,
  disabled,
  errors,
  onUpdateField,
  onMoveSplitUp,
  onMoveSplitDown,
  onDuplicateSplit,
  onRemoveSplit,
  onAddExercise,
  onUpdateExercise,
  onSelectLibraryExercise,
  onMoveExerciseUp,
  onMoveExerciseDown,
  onDuplicateExercise,
  onRemoveExercise,
}: WorkoutSplitCardProps) {
  const count = split.exercises.length
  const countLabel =
    count === 1 ? "1 exercício" : `${count} exercícios`

  return (
    <section
      aria-label={`Divisão ${split.name || splitIndex + 1}`}
      className="space-y-4 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
    >
      <div className="flex flex-col gap-4 border-b border-[var(--sm-border)] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--sm-muted)]">
              Divisão {splitIndex + 1}
            </span>
            <span className="rounded-full border border-[var(--sm-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--sm-muted)] tabular-nums">
              {countLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || splitIndex === 0}
              aria-label={`Mover divisão ${splitIndex + 1} para cima`}
              className="min-h-10 px-2.5 text-xs"
              onClick={onMoveSplitUp}
            >
              <ArrowUp className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Subir divisão</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || splitIndex === totalSplits - 1}
              aria-label={`Mover divisão ${splitIndex + 1} para baixo`}
              className="min-h-10 px-2.5 text-xs"
              onClick={onMoveSplitDown}
            >
              <ArrowDown className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Descer divisão</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              aria-label={`Duplicar divisão ${splitIndex + 1}`}
              className="min-h-10 gap-1.5 px-3 text-xs"
              onClick={onDuplicateSplit}
            >
              <Copy className="size-3.5" aria-hidden="true" />
              Duplicar divisão
            </Button>
            {totalSplits > 1 ? (
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className="min-h-10 px-3 text-xs"
                onClick={onRemoveSplit}
              >
                Remover divisão
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`split-frequency-${split.id}`}>Frequência semanal</Label>
            <select id={`split-frequency-${split.id}`} value={split.weeklyFrequency ?? ""} disabled={disabled}
              aria-invalid={Boolean(errors[`splits.${split.id}.weeklyFrequency`])}
              onChange={event => onUpdateField("weeklyFrequency", event.target.value ? Number(event.target.value) : null)}
              className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm">
              <option value="">Não informada</option>
              {[1, 2, 3, 4, 5, 6, 7].map(frequency => <option key={frequency} value={frequency}>{frequency} {frequency === 1 ? "vez" : "vezes"}/semana</option>)}
            </select>
            {errors[`splits.${split.id}.weeklyFrequency`] ? <p className="text-xs text-[var(--sm-danger)]">{errors[`splits.${split.id}.weeklyFrequency`]}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`split-name-${split.id}`}>Nome da divisão</Label>
            <Input
              id={`split-name-${split.id}`}
              value={split.name}
              disabled={disabled}
              onChange={event => onUpdateField("name", event.target.value)}
              className="min-h-11 font-semibold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`split-focus-${split.id}`}>Foco da divisão</Label>
            <Input
              id={`split-focus-${split.id}`}
              value={split.focus}
              disabled={disabled}
              onChange={event => onUpdateField("focus", event.target.value)}
              placeholder="Opcional"
              className="min-h-11"
            />
          </div>
        </div>
      </div>

      {split.exercises.length === 0 ? (
        <p className="text-sm text-[var(--sm-muted)]">
          Nenhum exercício adicionado nesta divisão.
        </p>
      ) : (
        <div className="space-y-4">
          {split.exercises.map((exercise, exIndex) => (
            <WorkoutExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={exIndex}
              totalExercises={split.exercises.length}
              disabled={disabled}
              errors={errors}
              onChange={(field, value) =>
                onUpdateExercise(exercise.id, field, value)
              }
              onSelectLibraryExercise={selection =>
                onSelectLibraryExercise(exercise.id, selection)
              }
              onMoveUp={() => onMoveExerciseUp(exIndex)}
              onMoveDown={() => onMoveExerciseDown(exIndex)}
              onDuplicate={() => onDuplicateExercise(exercise.id)}
              onRemove={() => onRemoveExercise(exercise.id)}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        className="min-h-11"
        onClick={onAddExercise}
      >
        Adicionar exercício
      </Button>
    </section>
  )
}
