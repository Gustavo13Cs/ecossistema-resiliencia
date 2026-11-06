import type { ExerciseEquipment } from "./workout"

export const TRAINING_ENVIRONMENT_LABELS = {
  FULL_GYM: "Academia completa",
  CONDO_GYM: "Academia de condomínio / hotel",
  STUDIO: "Studio de Personal",
  HOME: "Residência / Casa",
  OUTDOOR: "Parque / Ar livre",
} as const

export type TrainingEnvironment = keyof typeof TRAINING_ENVIRONMENT_LABELS

export const TRAINING_ENVIRONMENT_DEFAULT_EQUIPMENT: Readonly<
  Record<TrainingEnvironment, readonly ExerciseEquipment[]>
> = {
  FULL_GYM: [
    "BARBELL",
    "DUMBBELL",
    "MACHINE",
    "CABLE",
    "SMITH",
    "KETTLEBELL",
    "BAND",
    "BODYWEIGHT",
    "OTHER",
  ],
  CONDO_GYM: ["DUMBBELL", "CABLE", "MACHINE", "BAND", "BODYWEIGHT"],
  STUDIO: ["BARBELL", "DUMBBELL", "CABLE", "KETTLEBELL", "BAND", "BODYWEIGHT"],
  HOME: ["DUMBBELL", "BAND", "BODYWEIGHT"],
  OUTDOOR: ["BAND", "BODYWEIGHT"],
}

export const TRAINING_EXPERIENCE_LABELS = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
} as const

export type TrainingExperienceLevel = keyof typeof TRAINING_EXPERIENCE_LABELS

export type ParqAnswers = {
  heartCondition: boolean
  chestPainActivity: boolean
  chestPainRest: boolean
  dizzinessOrSyncope: boolean
  boneOrJointProblem: boolean
  bloodPressureMedication: boolean
  otherReason: boolean
}

export const EMPTY_PARQ_ANSWERS: ParqAnswers = {
  heartCondition: false,
  chestPainActivity: false,
  chestPainRest: false,
  dizzinessOrSyncope: false,
  boneOrJointProblem: false,
  bloodPressureMedication: false,
  otherReason: false,
}

export const PARQ_QUESTIONS: ReadonlyArray<{
  key: keyof ParqAnswers
  label: string
  shortLabel: string
}> = [
  {
    key: "heartCondition",
    label:
      "Algum médico já informou que o aluno possui problema cardíaco ou hipertensão arterial diagnosticada?",
    shortLabel: "Condição cardíaca ou PA elevada",
  },
  {
    key: "chestPainActivity",
    label:
      "O aluno sente dor ou aperto no peito durante a prática de atividades físicas?",
    shortLabel: "Dor torácica no esforço",
  },
  {
    key: "chestPainRest",
    label:
      "No último mês, apresentou dor no peito em repouso ou fora da atividade física?",
    shortLabel: "Dor torácica em repouso",
  },
  {
    key: "dizzinessOrSyncope",
    label:
      "Apresenta perda de equilíbrio por tontura ou já desmaiou nos últimos 12 meses?",
    shortLabel: "Tontura ou síncope",
  },
  {
    key: "boneOrJointProblem",
    label:
      "Possui lesão óssea, articular ou tendínea que possa agravar com sobrecarga de treino?",
    shortLabel: "Restrição osteoarticular",
  },
  {
    key: "bloodPressureMedication",
    label:
      "Faz uso atual de medicamentos prescritos para pressão arterial ou condição cardíaca?",
    shortLabel: "Medicação cardiovascular",
  },
  {
    key: "otherReason",
    label:
      "Há qualquer outra condição clínica pela qual o exercício exija liberação médica prévia?",
    shortLabel: "Outra cautela clínica",
  },
]

export interface TrainingAnamnesisRecord {
  id: string
  clientId: string
  parqAnswers: ParqAnswers
  hasPositiveParq: boolean
  medicalClearanceNotes: string | null
  musculoskeletalHistory: string | null
  trainingExperience: TrainingExperienceLevel | null
  daysPerWeek: number | null
  maxSessionMinutes: number | null
  environment: TrainingEnvironment
  availableEquipment: ExerciseEquipment[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTrainingAnamnesisInput {
  clientId: string
  parqAnswers: ParqAnswers
  medicalClearanceNotes?: string | null
  musculoskeletalHistory?: string | null
  trainingExperience?: TrainingExperienceLevel | null
  daysPerWeek?: number | null
  maxSessionMinutes?: number | null
  environment: TrainingEnvironment
  availableEquipment: ExerciseEquipment[]
  notes?: string | null
}
