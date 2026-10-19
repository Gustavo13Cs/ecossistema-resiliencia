import type { ExerciseEquipment, MuscleGroup } from '@prisma/client';
export interface DemonstrationAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt: string;
  sourcePageUrl: string;
  author: string;
  licenseName: string;
  licenseUrl: string;
  upstreamSourcePageUrl?: string;
  changes?: string;
}
export interface DemonstrationSnapshot {
  revision: string;
  instruction: string;
  assets?: DemonstrationAsset[];
  personalVideoUrl?: string;
}
export interface LibraryReference {
  source: 'CATALOG' | 'CUSTOM';
  exerciseId: string;
  demonstrationRevision: string | null;
}
export interface DemonstrationPresentation extends Omit<
  DemonstrationSnapshot,
  'assets'
> {
  assets?: (DemonstrationAsset & { displayAllowed: boolean })[];
}
export interface DemonstrationManifestEntry {
  exerciseId: string;
  sourceExerciseId: string;
  originalName: string;
  muscleGroup: MuscleGroup;
  equipment: ExerciseEquipment;
  itemRevision: string;
  instruction: string;
  assets: DemonstrationAsset[];
}
