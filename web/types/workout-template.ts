import type { DraftContentInput } from "./workout-draft"
export const TEMPLATE_GOAL_LABELS = { MUSCLE_GAIN: "Hipertrofia", STRENGTH: "Força", WEIGHT_LOSS: "Emagrecimento", CONDITIONING: "Condicionamento" } as const
export const TEMPLATE_LEVEL_LABELS = { BEGINNER: "Iniciante", INTERMEDIATE: "Intermediário", ADVANCED: "Avançado" } as const
export type TemplateGoal = keyof typeof TEMPLATE_GOAL_LABELS
export type TemplateLevel = keyof typeof TEMPLATE_LEVEL_LABELS
export type WorkoutTemplateFilters = { origin?: "all" | "global" | "private"; goal?: TemplateGoal; level?: TemplateLevel }
export type WorkoutTemplateSummary = { id: string; title: string; description: string | null; goal: TemplateGoal; level: TemplateLevel; targetAudience: string | null; estimatedWeeks: number | null; schemaVersion: number; createdAt: string; updatedAt: string; isGlobal: boolean }
export type WorkoutTemplateDetail = WorkoutTemplateSummary & { content: DraftContentInput }
export type WorkoutTemplatePage = { items: WorkoutTemplateSummary[]; nextCursor: string | null }
export type SaveWorkoutTemplateInput = { title: string; description?: string; goal: TemplateGoal; level: TemplateLevel; targetAudience?: string }
