import type { TrainingEnvironment } from "./training-anamnesis"
import type { DraftContentInput } from "./workout-draft"

export const TEMPLATE_GOAL_LABELS = {
  MUSCLE_GAIN: "Hipertrofia",
  STRENGTH: "Força",
  WEIGHT_LOSS: "Emagrecimento",
  CONDITIONING: "Condicionamento",
} as const

export const TEMPLATE_LEVEL_LABELS = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
} as const

export type TemplateGoal = keyof typeof TEMPLATE_GOAL_LABELS
export type TemplateLevel = keyof typeof TEMPLATE_LEVEL_LABELS

export type WorkoutTemplateFilters = {
  origin?: "all" | "global" | "private"
  status?: "active" | "archived" | "all"
  goal?: TemplateGoal
  level?: TemplateLevel
  environment?: TrainingEnvironment
  q?: string
}

export type WorkoutTemplateSummary = {
  id: string
  title: string
  description: string | null
  goal: TemplateGoal
  level: TemplateLevel
  targetAudience: string | null
  environment?: TrainingEnvironment | null
  estimatedWeeks: number | null
  schemaVersion: number
  archivedAt?: string | null
  createdAt: string
  updatedAt: string
  isGlobal: boolean
}

export type WorkoutTemplateDetail = WorkoutTemplateSummary & {
  content: DraftContentInput
}

export type WorkoutTemplatePage = {
  items: WorkoutTemplateSummary[]
  nextCursor: string | null
}

export type SaveWorkoutTemplateInput = {
  title: string
  description?: string
  goal: TemplateGoal
  level: TemplateLevel
  targetAudience?: string
  environment?: TrainingEnvironment | null
}

export type CreateStandaloneWorkoutTemplateInput = {
  title: string
  description?: string | null
  goal: TemplateGoal
  level: TemplateLevel
  targetAudience?: string | null
  environment?: TrainingEnvironment | null
  content: DraftContentInput
}

export type UpdateWorkoutTemplateInput = {
  title?: string
  description?: string | null
  goal?: TemplateGoal
  level?: TemplateLevel
  targetAudience?: string | null
  environment?: TrainingEnvironment | null
  content?: DraftContentInput
}
