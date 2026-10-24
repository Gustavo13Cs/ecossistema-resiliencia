import type { ClientStatus } from "@/types/client"
import type { AppointmentStatus } from "@/types/appointment"
import type { RecipeFilters } from "@/types/recipe"

export const queryKeys = {
  workoutDraftsRoot: (sub: string) => ["workout-drafts", sub] as const,
  workoutDrafts: (sub: string, clientId?: string, cursor?: string) => ["workout-drafts", sub, "list", clientId ?? "all", cursor ?? "first"] as const,
  workoutDraft: (sub: string, clientId: string, draftId: string) => ["workout-drafts", sub, "client", clientId, "detail", draftId] as const,
  trainingWorkspace: (sub: string) => ["training-workspace", sub] as const,
  trainingOverview: (sub: string, clientId: string) => ["training-overview", sub, clientId] as const,
  workoutsRoot: (sub: string) => ["workouts", sub] as const,
  workouts: (sub: string) => ["workouts", sub, "list"] as const,
  workout: (sub: string, clientId: string, workoutId: string, week?: number) => ["workouts", sub, "client", clientId, "detail", workoutId, ...(week !== undefined ? ["week", String(week)] : [])] as const,
  activeWorkout: (sub: string, clientId: string) => ["workouts", sub, "client", clientId, "active"] as const,
  exerciseLibraryRoot: (sub: string) => ["exercise-library", sub] as const,
  exerciseLibrary: (sub: string, q: string, muscleGroup: string, equipment = "ALL") =>
    ["exercise-library", sub, "list", q, muscleGroup, equipment] as const,
  exerciseLibraryDetail: (sub: string, exerciseId: string) =>
    ["exercise-library", sub, "detail", exerciseId] as const,
  centralLabExams: (sessionUserId: string) => ["central-lab-exams", sessionUserId] as const,
  labOrders: (sessionUserId: string) => ["lab-orders", sessionUserId] as const,
  clientGoals: (sessionUserId: string) => ["client-goals", sessionUserId] as const,
  supplements: (sessionUserId: string, clientId: string) => ["supplements", sessionUserId, clientId] as const,
  labExams: (sessionUserId: string, clientId: string) => ["lab-exams", sessionUserId, clientId] as const,
  rehabPlan: (sessionUserId: string, clientId: string) => ["rehab-plan", sessionUserId, clientId] as const,
  users: (sessionUserId: string) => ["users", sessionUserId] as const,
  clients: (sessionUserId: string, status: ClientStatus) =>
    ["clients", sessionUserId, status] as const,
  client: (sessionUserId: string, clientId: string) => ["client", sessionUserId, clientId] as const,
  patient: (sessionUserId: string, patientId: string) => ["patient", sessionUserId, patientId] as const,
  assessments: (sessionUserId: string, patientId: string) => ["assessments", sessionUserId, patientId] as const,
  anamneses: (sessionUserId: string, patientId: string) => ["anamneses", sessionUserId, patientId] as const,
  diet: (sessionUserId: string, patientId: string) => ["diet", sessionUserId, patientId] as const,
  patientOverview: (sessionUserId: string, clientId: string) => ["patient-overview", sessionUserId, clientId] as const,
  professionalAlerts: (sessionUserId: string) => ["professional-alerts", sessionUserId] as const,
  agenda: (sessionUserId: string, patientId: string, from: string, to: string) => ["agenda", sessionUserId, patientId, from, to] as const,
  appointmentsRoot: (sessionUserId: string) => ["appointments", sessionUserId] as const,
  appointments: (
    sessionUserId: string,
    from: string,
    to: string,
    clientId?: string,
    status?: AppointmentStatus,
  ) => ["appointments", sessionUserId, from, to, clientId ?? "all", status ?? "all"] as const,
  consultationNotes: (sessionUserId: string, patientId: string) => ["consultation-notes", sessionUserId, patientId] as const,
  dietHistory: (sessionUserId: string, patientId: string) => ["diet-history", sessionUserId, patientId] as const,
  dashboardSummary: (sessionUserId: string) => ["dashboard-summary", sessionUserId] as const,
  evolution: (sessionUserId: string) => ["evolution", sessionUserId] as const,
  recipesRoot: (sessionUserId: string) => ["recipes", sessionUserId] as const,
  recipes: (sessionUserId: string, filters: RecipeFilters) =>
    ["recipes", sessionUserId, filters] as const,
  recipe: (sessionUserId: string, recipeId: string) =>
    ["recipe", sessionUserId, recipeId] as const,
  recipeFoodSearch: (sessionUserId: string, query: string) =>
    ["recipe-food-search", sessionUserId, query] as const,
}
