import type { ClientStatus } from "@/types/client"
import type { PhysicalAssessment } from "@/types/assessment"

export interface TrainingWorkspace {
  counts: { activeStudents: number; archivedStudents: number; withoutActiveWorkout: number }
  items: { clientId: string; name: string; goal: string | null; updatedAt: string; section: "RECENT" | "WITHOUT_ACTIVE_WORKOUT" }[]
}

export interface TrainingActiveWorkout {
  id: string
  clientId: string
  title: string
  goal: string | null
  durationWeeks: number | null
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export type TrainingAssessment = Omit<PhysicalAssessment, "userId" | "clientId" | "createdAt" | "updatedAt"> & { clientId: string }

export interface TrainingClientOverview {
  client: { id: string; status: ClientStatus }
  activeWorkout: TrainingActiveWorkout | null
  recentAssessments: TrainingAssessment[]
}
