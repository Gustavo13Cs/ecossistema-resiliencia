import { BadRequestException } from '@nestjs/common';
import type {
  Periodization,
  PlanWeek,
  PeriodPhase,
  SecondaryMuscle,
  WeeklyVolumeSummary,
} from './workout-p3.types';
import {
  getPlanWeek,
  projectExercise,
  validatePeriodization,
} from './workout-periodization';
import { summarizeWeeklyVolume } from './workout-volume';
import type { WorkoutDetail } from './training-read.types';
export type WorkoutWeekProjection = {
  week: number;
  planWeek: PlanWeek;
  phase: PeriodPhase;
  volume: WeeklyVolumeSummary;
  exercises: {
    id: string;
    sets: string;
    reps: string;
    effortType?: 'RIR' | 'RPE' | null;
    effortTarget?: string | null;
    warnings: string[];
  }[];
};
export function withWeekProjection(
  workout: WorkoutDetail,
  selectedWeek?: number,
  now = new Date(),
): WorkoutDetail {
  if (!workout.periodization) {
    if (selectedWeek !== undefined)
      throw new BadRequestException('Este treino não possui periodização.');
    return workout;
  }
  const config = workout.periodization as unknown as Periodization;
  const duration = workout.durationWeeks;
  if (validatePeriodization(config, duration, true).length || !duration)
    throw new BadRequestException('Configuração de periodização indisponível.');
  const planWeek = getPlanWeek(config, duration, now);
  const week = selectedWeek ?? planWeek.week;
  if (!Number.isInteger(week) || week < 1 || week > duration)
    throw new BadRequestException('Semana fora da duração do mesociclo.');
  const phase = config.phases.find(
    (item) => week >= item.startWeek && week <= item.endWeek,
  )!;
  const splits = workout.splits.map((split) => ({
    ...split,
    exercises: split.exercises.map((exercise) => ({
      ...projectExercise(exercise, config, week),
      secondaryMuscles: exercise.secondaryMuscles as unknown as
        | SecondaryMuscle[]
        | null,
    })),
  }));
  return {
    ...workout,
    weekProjection: {
      week,
      planWeek,
      phase,
      volume: summarizeWeeklyVolume(splits),
      exercises: splits.flatMap((split) =>
        split.exercises.map((exercise) => ({
          id: exercise.id,
          sets: exercise.sets,
          reps: exercise.reps,
          effortType: exercise.effortType,
          effortTarget: exercise.effortTarget,
          warnings: exercise.warnings,
        })),
      ),
    },
  };
}
