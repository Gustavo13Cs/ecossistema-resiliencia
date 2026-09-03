import type { ProfessionalRole } from "@/types/auth"
import type { ClientFormValues } from "@/types/client"

export type ClientFieldName = keyof ClientFormValues

export type ClientFormPayload = Pick<ClientFormValues, "name"> &
  Partial<Omit<ClientFormValues, "name">>

export interface ClientFieldGroup {
  id: "identity" | "professional-context" | "private-notes"
  title: string
  description: string
  fields: readonly ClientFieldName[]
}

const IDENTITY_FIELDS = [
  "name",
  "email",
  "phone",
  "birthDate",
  "gender",
  "goal",
] as const satisfies readonly ClientFieldName[]

const PRIVATE_NOTE_FIELDS = [
  "professionalNotes",
  "privacyNotes",
] as const satisfies readonly ClientFieldName[]

const ROLE_FIELDS = {
  NUTRITIONIST: [
    "height",
    "initialWeight",
    "allergies",
    "pathologies",
    "typicalSleep",
    "stressLevel",
    "foodRelationship",
    "psychologyHistory",
    "workActivityLevel",
  ],
  PERSONAL: [
    "height",
    "initialWeight",
    "pathologies",
    "exerciseType",
    "exerciseFrequency",
    "exerciseDuration",
    "hasPersonal",
    "workActivityLevel",
  ],
  PHYSIO: [
    "height",
    "initialWeight",
    "pathologies",
    "exerciseType",
    "exerciseFrequency",
    "exerciseDuration",
    "workActivityLevel",
  ],
} as const satisfies Record<ProfessionalRole, readonly ClientFieldName[]>

const ROLE_GROUP_CONTENT: Record<ProfessionalRole, Pick<ClientFieldGroup, "title" | "description">> = {
  NUTRITIONIST: {
    title: "Contexto nutricional",
    description: "Informações que apoiam o acompanhamento nutricional.",
  },
  PERSONAL: {
    title: "Contexto de treinamento",
    description: "Informações relevantes para o planejamento do treinamento.",
  },
  PHYSIO: {
    title: "Contexto fisioterapêutico",
    description: "Informações relevantes para o acompanhamento fisioterapêutico.",
  },
}

export function getClientFieldGroups(role: ProfessionalRole): readonly ClientFieldGroup[] {
  return [
    {
      id: "identity",
      title: "Identificação e contato",
      description: "Dados essenciais para identificar e contatar este prontuário.",
      fields: IDENTITY_FIELDS,
    },
    {
      id: "professional-context",
      ...ROLE_GROUP_CONTENT[role],
      fields: ROLE_FIELDS[role],
    },
    {
      id: "private-notes",
      title: "Anotações privadas",
      description: "Conteúdo visível somente dentro da sua conta profissional.",
      fields: PRIVATE_NOTE_FIELDS,
    },
  ]
}
