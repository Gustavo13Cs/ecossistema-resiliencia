export const VOLUME_MUSCLES = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'CORE',
  'QUADRICEPS',
  'HAMSTRINGS',
  'GLUTES',
  'ADDUCTORS',
  'CALVES',
] as const;
export type VolumeMuscle = (typeof VOLUME_MUSCLES)[number];
export type SecondaryMuscle = { muscleGroup: string; weight: number };
export type VolumeLandmark =
  | 'NONE'
  | 'BELOW_MV'
  | 'MV'
  | 'MEV'
  | 'MAV'
  | 'ABOVE_MAV'
  | 'MRV';
export type VolumeExercise = {
  name: string;
  sets: string;
  muscleGroup?: string | null;
  secondaryMuscles?: SecondaryMuscle[] | null;
};
export type VolumeSplit = {
  name?: string;
  weeklyFrequency?: number | null;
  exercises: VolumeExercise[];
};
export type WeeklyVolumeSummary = {
  algorithmVersion: 1;
  rows: {
    muscleGroup: VolumeMuscle;
    direct: number;
    synergistic: number;
    total: number;
    landmark: VolumeLandmark;
  }[];
  excluded: { splitIndex: number; exerciseIndex: number; reason: string }[];
  complete: boolean;
  alerts: string[];
};
export type PeriodPhase = {
  name: string;
  type: 'ADAPTATION' | 'OVERLOAD' | 'PEAK' | 'DELOAD';
  startWeek: number;
  endWeek: number;
  effortType: 'RIR' | 'RPE' | null;
  effortTarget: string;
};
export type Periodization = {
  version: 1;
  startsOn: string;
  timeZone: string;
  phases: PeriodPhase[];
  progression: {
    intervalWeeks: number;
    repsDelta: number;
    effortDelta: number;
  } | null;
};
export type PlanWeek = {
  week: number;
  status: 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED';
  today: string;
};
export type ProjectableExercise = {
  sets: string;
  reps: string;
  effortType?: 'RIR' | 'RPE' | null;
  effortTarget?: string | null;
};
