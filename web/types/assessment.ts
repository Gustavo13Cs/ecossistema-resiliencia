export interface PhysicalAssessment {
  id: string
  clientId: string | null
  userId: string | null
  date: string
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
  waist: number | null
  abdomen: number | null
  hips: number | null
  thorax: number | null
  armLeft: number | null
  armRight: number | null
  thighLeft: number | null
  thighRight: number | null
  calfLeft: number | null
  calfRight: number | null
  skinfoldTriceps: number | null
  skinfoldSubscapular: number | null
  skinfoldChest: number | null
  skinfoldAxillary: number | null
  skinfoldSuprailiac: number | null
  skinfoldAbdominal: number | null
  skinfoldThigh: number | null
  benchPress1RM: number | null
  squat1RM: number | null
  deadlift1RM: number | null
  vo2Max: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CreateAssessmentInput = Partial<Record<Exclude<keyof PhysicalAssessment, "id" | "clientId" | "userId" | "date" | "notes" | "createdAt" | "updatedAt">, number>> & { date?: string; notes?: string }
