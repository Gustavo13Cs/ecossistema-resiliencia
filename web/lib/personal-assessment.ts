import type { AssessmentCreateInput, PersonalAssessmentValues, PersonalNumericField } from "@/types/assessment"

export const PERSONAL_ASSESSMENT_FIELDS: Record<PersonalNumericField, { label: string; unit: string }> = {
  weight: { label: "Peso", unit: "kg" },
  bodyFat: { label: "Gordura corporal", unit: "%" },
  waist: { label: "Cintura", unit: "cm" },
  abdomen: { label: "Abdômen", unit: "cm" },
  hips: { label: "Quadril", unit: "cm" },
  thorax: { label: "Tórax", unit: "cm" },
  armLeft: { label: "Braço esquerdo", unit: "cm" },
  armRight: { label: "Braço direito", unit: "cm" },
  thighLeft: { label: "Coxa esquerda", unit: "cm" },
  thighRight: { label: "Coxa direita", unit: "cm" },
  calfLeft: { label: "Panturrilha esquerda", unit: "cm" },
  calfRight: { label: "Panturrilha direita", unit: "cm" },
  skinfoldTriceps: { label: "Dobra tricipital", unit: "mm" },
  skinfoldSubscapular: { label: "Dobra subescapular", unit: "mm" },
  skinfoldChest: { label: "Dobra peitoral", unit: "mm" },
  skinfoldAxillary: { label: "Dobra axilar média", unit: "mm" },
  skinfoldSuprailiac: { label: "Dobra supra-ilíaca", unit: "mm" },
  skinfoldAbdominal: { label: "Dobra abdominal", unit: "mm" },
  skinfoldThigh: { label: "Dobra da coxa", unit: "mm" },
  benchPress1RM: { label: "Supino 1RM informado", unit: "kg" },
  squat1RM: { label: "Agachamento 1RM informado", unit: "kg" },
  deadlift1RM: { label: "Terra 1RM informado", unit: "kg" },
}

export const PERSONAL_ASSESSMENT_GROUPS: { title: string; fields: PersonalNumericField[] }[] = [
  { title: "Medidas gerais", fields: ["weight", "bodyFat"] },
  { title: "Força informada", fields: ["benchPress1RM", "squat1RM", "deadlift1RM"] },
  { title: "Perímetros", fields: ["waist", "abdomen", "hips", "thorax", "armLeft", "armRight", "thighLeft", "thighRight", "calfLeft", "calfRight"] },
  { title: "Dobras cutâneas", fields: ["skinfoldTriceps", "skinfoldSubscapular", "skinfoldChest", "skinfoldAxillary", "skinfoldSuprailiac", "skinfoldAbdominal", "skinfoldThigh"] },
]

function parseMeasurement(value: string): number {
  const normalized = value.trim().replace(",", ".")
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN
}

function isValidMeasurement(field: PersonalNumericField, value: number) {
  return Number.isFinite(value) && (field === "bodyFat" ? value >= 0 && value <= 100 : value > 0)
}

export function buildPersonalAssessmentPayload(values: Partial<PersonalAssessmentValues>, clientId: string): AssessmentCreateInput {
  const payload: AssessmentCreateInput = { clientId }
  for (const field of Object.keys(PERSONAL_ASSESSMENT_FIELDS) as PersonalNumericField[]) {
    const raw = values[field]?.trim()
    if (!raw) continue
    const value = parseMeasurement(raw)
    if (isValidMeasurement(field, value)) payload[field] = value
  }
  if (values.notes?.trim()) payload.notes = values.notes.trim()
  return payload
}

export function validatePersonalAssessment(values: Partial<PersonalAssessmentValues>): Record<string, string> {
  const errors: Record<string, string> = {}
  let hasMeasurement = false
  for (const field of Object.keys(PERSONAL_ASSESSMENT_FIELDS) as PersonalNumericField[]) {
    const raw = values[field]?.trim()
    if (!raw) continue
    if (!isValidMeasurement(field, parseMeasurement(raw))) {
      errors[field] = field === "bodyFat" ? "Informe um percentual entre 0 e 100." : "Informe um número finito maior que zero."
    } else hasMeasurement = true
  }
  if (!hasMeasurement) errors.measurement = "Preencha ao menos uma medida numérica válida."
  return errors
}
