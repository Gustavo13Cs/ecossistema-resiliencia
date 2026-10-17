import {
  EffortType,
  MuscleGroup,
  TrainingMethod,
  WorkoutDraftStatus,
} from '@prisma/client';

export const WORKOUT_DRAFT_SCHEMA_VERSION = 1 as const;
export const WORKOUT_DRAFT_MAX_BYTES = 65536;

export type DraftExerciseV1 = {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
  muscleGroup: MuscleGroup | null;
  load: string;
  effortType: EffortType | null;
  effortTarget: string;
  tempo: string;
  method: TrainingMethod | null;
};
export type DraftSplitV1 = {
  name: string;
  focus: string;
  exercises: DraftExerciseV1[];
};
export type DraftContentV1 = {
  title: string;
  goal: string;
  durationWeeks: number | null;
  notes: string;
  splits: DraftSplitV1[];
};
export type DraftVersionInput = { expectedVersion: number };
export type DraftSaveInput = DraftVersionInput & { content: DraftContentV1 };
export type DraftRebaseInput = DraftVersionInput & {
  expectedActiveWorkoutId: string | null;
};
export type WorkoutDraftResource = {
  id: string;
  clientId: string;
  status: WorkoutDraftStatus;
  version: number;
  schemaVersion: number;
  content: DraftContentV1 | null;
  sourceWorkoutId: string | null;
  baseActiveWorkoutId: string | null;
  finalizedWorkoutId: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
};

export type DraftListQuery = {
  clientId?: string;
  cursor?: string;
  limit?: number;
};
export type DraftCursor = { updatedAt: string; id: string };
export type DraftSummary = Pick<
  WorkoutDraftResource,
  'id' | 'clientId' | 'status' | 'version' | 'createdAt' | 'updatedAt'
> & {
  title: string;
  client: {
    id: string;
    name: string;
    status: import('@prisma/client').ClientStatus;
  };
};
export type DraftPage = { items: DraftSummary[]; nextCursor: string | null };
export type DraftAck = Pick<
  WorkoutDraftResource,
  'id' | 'clientId' | 'status' | 'version'
>;
export type FinalizedDraftResult = DraftAck & {
  finalizedWorkoutId: string;
  workout: import('./training-read.types').WorkoutDetail;
};
