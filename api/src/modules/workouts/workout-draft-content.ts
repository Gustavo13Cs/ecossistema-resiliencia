import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { DraftContentDto } from './dto/workout-draft.dto';
import {
  DraftContentV1,
  DraftContentV2,
  DraftContentInput,
  WORKOUT_DRAFT_MAX_BYTES,
} from './workout-draft.types';

function assertValid(value: object): void {
  const errors = validateSync(value, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  });
  if (errors.length) {
    // Apenas nomes de campos e regras; nunca incorporar valores clínicos ao erro.
    const fields = (items: ValidationError[], prefix = ''): string[] =>
      items.flatMap((error) => {
        const path = prefix ? `${prefix}.${error.property}` : error.property;
        return [
          ...Object.keys(error.constraints ?? {}).map(
            (rule) => `${path}: ${rule}`,
          ),
          ...fields(error.children ?? [], path),
        ];
      });
    throw new BadRequestException({
      message: fields(errors),
      error: 'Bad Request',
      statusCode: 400,
    });
  }
}

export function normalizeDraftContent(
  input: DraftContentDto,
): DraftContentInput {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Conteúdo de rascunho inválido.');
  const dto = plainToInstance(DraftContentDto, input);
  assertValid(dto);
  const text = (value?: string) => value?.trim() ?? '';
  return {
    ...(dto.periodization !== undefined
      ? { periodization: dto.periodization }
      : {}),
    title: text(dto.title),
    goal: text(dto.goal),
    durationWeeks: dto.durationWeeks ?? null,
    notes: text(dto.notes),
    splits: dto.splits.map((split) => ({
      ...(split.weeklyFrequency !== undefined
        ? { weeklyFrequency: split.weeklyFrequency }
        : {}),
      name: text(split.name),
      focus: text(split.focus),
      exercises: split.exercises.map((exercise) => ({
        ...(exercise.libraryReference
          ? { libraryReference: { ...exercise.libraryReference } }
          : {}),
        ...(exercise.secondaryMuscles !== undefined
          ? { secondaryMuscles: exercise.secondaryMuscles }
          : {}),
        name: text(exercise.name),
        sets: text(exercise.sets),
        reps: text(exercise.reps),
        rest: text(exercise.rest),
        notes: text(exercise.notes),
        muscleGroup: exercise.muscleGroup ?? null,
        load: text(exercise.load),
        effortType: exercise.effortType ?? null,
        effortTarget: text(exercise.effortTarget),
        tempo: text(exercise.tempo),
        method: exercise.method ?? null,
      })),
    })),
  };
}

export function assertDraftContentSize(
  content: DraftContentV1 | DraftContentV2,
): void {
  if (
    Buffer.byteLength(JSON.stringify(content), 'utf8') > WORKOUT_DRAFT_MAX_BYTES
  )
    throw new PayloadTooLargeException('O rascunho excede o limite de 64 KiB.');
}

export function toFinalizedWorkoutInput(
  clientId: string,
  content: DraftContentV1 | DraftContentV2,
): CreateWorkoutDto {
  assertDraftContentSize(content);
  // Só parâmetros/referência passam pelo DTO HTTP; snapshots persistidos são transportados separadamente.
  const normalized = normalizeDraftContent({
    ...content,
    splits: content.splits.map((split) => ({
      ...split,
      exercises: split.exercises.map((exercise) => {
        const { demonstrationSnapshot: _snapshot, ...input } =
          exercise as import('./workout-draft.types').DraftExerciseV2;
        void _snapshot;
        return input;
      }),
    })),
  });
  assertDraftContentSize(normalized);
  const optionalText = (value: string) => value || undefined;
  const dto = plainToInstance(CreateWorkoutDto, {
    clientId,
    ...(normalized.periodization !== undefined
      ? { periodization: normalized.periodization }
      : {}),
    title: normalized.title,
    goal: optionalText(normalized.goal),
    durationWeeks: normalized.durationWeeks ?? undefined,
    notes: optionalText(normalized.notes),
    splits: normalized.splits.map((split) => ({
      ...(split.weeklyFrequency !== undefined
        ? { weeklyFrequency: split.weeklyFrequency }
        : {}),
      name: split.name,
      focus: optionalText(split.focus),
      exercises: split.exercises.map((exercise) => ({
        ...(exercise.secondaryMuscles !== undefined
          ? { secondaryMuscles: exercise.secondaryMuscles }
          : {}),
        libraryReference: exercise.libraryReference,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        rest: optionalText(exercise.rest),
        notes: optionalText(exercise.notes),
        muscleGroup: exercise.muscleGroup ?? undefined,
        load: optionalText(exercise.load),
        effortType: exercise.effortType ?? undefined,
        effortTarget: optionalText(exercise.effortTarget),
        tempo: optionalText(exercise.tempo),
        method: exercise.method ?? undefined,
      })),
    })),
  });
  assertValid(dto);
  return dto;
}

/** Apenas conteúdo persistido autorizado; nunca usar para desserializar HTTP. */
export function upgradeDraftContent(
  content: DraftContentV1 | DraftContentV2,
): DraftContentV2 {
  return {
    ...content,
    splits: content.splits.map((split) => ({
      ...split,
      exercises: split.exercises.map((exercise) => {
        const saved = exercise as Partial<
          import('./workout-draft.types').DraftExerciseV2
        >;
        return {
          ...exercise,
          libraryReference: saved.libraryReference ?? null,
          demonstrationSnapshot: saved.demonstrationSnapshot ?? null,
        };
      }),
    })),
  };
}
