"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { DemonstrationPresentation } from "@/types/exercise-demonstration"
import type { MuscleGroup } from "@/types/workout"

export type RehabItemCategory =
  | "KINESIOTHERAPY"
  | "ELECTROTHERAPY"
  | "THERMOTHERAPY"
  | "MANUAL_THERAPY"
  | "EDUCATION"

export const REHAB_ITEM_CATEGORY_LABELS: Record<RehabItemCategory, string> = {
  KINESIOTHERAPY: "Cinesioterapia",
  ELECTROTHERAPY: "Eletroterapia",
  THERMOTHERAPY: "Termoterapia / Crioterapia",
  MANUAL_THERAPY: "Terapia Manual",
  EDUCATION: "Educação / Orientação",
}

export interface RehabModalityParams {
  modality: string
  frequency?: string
  pulseWidth?: string
  intensity?: string
  emissionMode?: string
  durationMinutes?: number
  applicationSite?: string
}

export interface RehabExercise {
  id: string
  name: string
  sets?: string | null
  reps?: string | null
  notes?: string | null
  position?: number
  category?: RehabItemCategory
  modalityParams?: RehabModalityParams | null
  isHomeExercise?: boolean
  homeFrequency?: string | null
  patientInstructions?: string | null
  catalogExerciseId?: string | null
  demonstrationSnapshot?: DemonstrationPresentation | null
}

export interface RehabSession {
  id: string
  name: string
  focus?: string | null
  position?: number
  progressionCriteria?: string | null
  estimatedWeeks?: number | null
  exercises: RehabExercise[]
}

export interface RehabPlan {
  id: string
  title: string
  durationWeeks?: number | null
  currentPhaseIndex?: number
  goal?: string | null
  notes?: string | null
  isActive?: boolean
  isTemplate?: boolean
  updatedAt?: string
  sessions: RehabSession[]
}

export interface CuratedRehabProtocol {
  id: string
  conditionArea: string
  title: string
  goal: string
  durationWeeks: number
  notes: string
  sessions: Array<{
    name: string
    focus: string
    estimatedWeeks: number
    progressionCriteria: string
    exercises: Array<Omit<RehabExercise, "id">>
  }>
}

export interface PhysioExerciseCatalogItem {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: string
  notes: string | null
  hasIllustration: boolean
  demonstration: DemonstrationPresentation | null
}

export function useFisio(clientId?: string) {
  const { user } = useAuth()
  const enabled = Boolean(user?.sub && clientId)
  const query = useQuery({
    queryKey: queryKeys.rehabPlan(user?.sub ?? "anonymous", clientId ?? "unselected"),
    queryFn: async () => {
      const response = await api.get<RehabPlan | null>(`/rehab-plans/client/${clientId}/active`)
      return response.data
    },
    enabled,
  })

  return {
    rehabPlan: enabled ? query.data ?? null : null,
    loading: enabled && query.isPending,
    error: enabled && query.isError ? "Falha ao carregar o protocolo de reabilitação. Tente novamente." : null,
    refetch: query.refetch,
  }
}
