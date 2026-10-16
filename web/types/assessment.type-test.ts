import type {
  AssessmentCreateInput,
  CreateAssessmentInput,
  PersonalAssessmentValues,
  PersonalNumericField,
  PhysicalAssessment,
} from "./assessment"

// Contrato compilado por npm run typecheck; não é uma suíte de execução Vitest.
type Assert<T extends true> = T

export type PersonalFieldExcludesUnknownUnits = Assert<
  Extract<PersonalNumericField, "muscleMass" | "vo2Max"> extends never ? true : false
>
export type PersonalPayloadExcludesUnknownUnits = Assert<
  Extract<keyof AssessmentCreateInput, "muscleMass" | "vo2Max"> extends never ? true : false
>
export type PersonalFormExcludesUnknownUnits = Assert<
  Extract<keyof PersonalAssessmentValues, "muscleMass" | "vo2Max"> extends never ? true : false
>

export const strengthOnlyPersonal: AssessmentCreateInput = { clientId: "client-1", squat1RM: 80 }
export const strengthOnlyShared: CreateAssessmentInput = strengthOnlyPersonal
export const personalForm: Partial<PersonalAssessmentValues> = { squat1RM: "80", weight: "", notes: "Força" }
export const personalNumericField: PersonalNumericField = "benchPress1RM"

// @ts-expect-error Unidade desconhecida: a nova entrada Personal não admite muscleMass.
export const personalMass: AssessmentCreateInput = { clientId: "client-1", muscleMass: 55 }
// @ts-expect-error Unidade desconhecida: a nova entrada Personal não admite vo2Max.
export const personalVo2: AssessmentCreateInput = { clientId: "client-1", vo2Max: 42 }
// @ts-expect-error O formulário Personal não captura muscleMass.
export const personalMassForm: Partial<PersonalAssessmentValues> = { muscleMass: "55" }
// @ts-expect-error O formulário Personal não captura vo2Max.
export const personalVo2Form: Partial<PersonalAssessmentValues> = { vo2Max: "42" }
// @ts-expect-error Os seletores numéricos Personal não oferecem muscleMass.
export const personalMassField: PersonalNumericField = "muscleMass"
// @ts-expect-error Os seletores numéricos Personal não oferecem vo2Max.
export const personalVo2Field: PersonalNumericField = "vo2Max"

export const sharedLegacyInput: CreateAssessmentInput = { muscleMass: 55, vo2Max: 42, date: "2026-10-15T12:00:00.000Z" }
export const historicalUnknownUnits: Pick<PhysicalAssessment, "muscleMass" | "vo2Max"> = { muscleMass: 55, vo2Max: 42 }
