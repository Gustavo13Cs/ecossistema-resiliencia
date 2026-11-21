export type ClientStatus = "ACTIVE" | "ARCHIVED"

export interface ClientSummary {
  id: string
  professionalId: string
  name: string
  email: string | null
  phone: string | null
  goal: string | null
  initialWeight: number | null
  status: ClientStatus
  createdAt: string
  updatedAt: string
}

export interface Client extends ClientSummary {
  birthDate: string | null
  gender: string | null
  height: number | null
  allergies: string | null
  pathologies: string | null
  typicalSleep: string | null
  stressLevel: number | null
  foodRelationship: string | null
  psychologyHistory: string | null
  exerciseType: string | null
  exerciseFrequency: string | null
  exerciseDuration: string | null
  hasPersonal: string | null
  workActivityLevel: string | null
  professionalNotes: string | null
  privacyNotes: string | null
}

export type ClientFormValues = Omit<
  Client,
  "id" | "professionalId" | "status" | "createdAt" | "updatedAt"
>
