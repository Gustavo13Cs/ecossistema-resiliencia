import {
  Client,
  PhysicalAssessment,
  Workout,
  WorkoutExercise,
  WorkoutSplit,
} from '@prisma/client';

export interface TrainingWorkspace {
  counts: {
    activeStudents: number;
    archivedStudents: number;
    withoutActiveWorkout: number;
  };
  items: (Pick<Client, 'name' | 'goal' | 'updatedAt'> & {
    clientId: string;
    section: 'RECENT' | 'WITHOUT_ACTIVE_WORKOUT';
  })[];
}

export type TrainingActiveWorkout = Pick<
  Workout,
  | 'id'
  | 'title'
  | 'goal'
  | 'durationWeeks'
  | 'createdAt'
  | 'updatedAt'
  | 'isActive'
  | 'finalizedAt'
  | 'revisionOfId'
> & { clientId: string };

export type TrainingAssessment = Omit<
  PhysicalAssessment,
  'userId' | 'clientId' | 'createdAt' | 'updatedAt'
> & { clientId: string };

export interface TrainingClientOverview {
  client: Pick<Client, 'id' | 'status'>;
  activeWorkout: TrainingActiveWorkout | null;
  recentAssessments: TrainingAssessment[];
}

export type WorkoutDetail = TrainingActiveWorkout &
  Pick<Workout, 'notes' | 'isTemplate'> & {
    client: Pick<Client, 'id' | 'name' | 'status'>;
    splits: (Pick<WorkoutSplit, 'id' | 'name' | 'focus' | 'position'> & {
      exercises: Pick<
        WorkoutExercise,
        | 'id'
        | 'name'
        | 'sets'
        | 'reps'
        | 'rest'
        | 'notes'
        | 'position'
        | 'muscleGroup'
        | 'load'
        | 'effortType'
        | 'effortTarget'
        | 'tempo'
        | 'method'
      >[];
    })[];
  };
