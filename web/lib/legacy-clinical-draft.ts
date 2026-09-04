export interface LegacyDietInfo {
  title: string
  goal: string
  notes: string
  durationDays: number
  patientWeight: number
}

export interface LegacyDietTargets {
  kcal: number
  pro: number
  carb: number
  fat: number
  fiber: number
  sodium: number
  calcium: number
  iron: number
}

export interface LegacyDietMeal {
  id: string
  name: string
  time: string
  notes: string
  items: unknown[]
}

export interface LegacyDietDraft {
  dietInfo: LegacyDietInfo
  targets: LegacyDietTargets
  meals: LegacyDietMeal[]
}

export interface UnreadableLegacyDietDraft {
  status: "unreadable"
  reason: "invalid" | "unavailable"
}

export type LegacyDietDraftReadResult = LegacyDietDraft | UnreadableLegacyDietDraft | null

const draftKey = (clientId: string) => `diet_draft_${clientId}`
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

function isLegacyDietInfo(value: unknown): value is LegacyDietInfo {
  if (!isRecord(value)) return false
  return typeof value.title === "string"
    && typeof value.goal === "string"
    && typeof value.notes === "string"
    && isFiniteNumber(value.durationDays)
    && isFiniteNumber(value.patientWeight)
}

function isLegacyDietTargets(value: unknown): value is LegacyDietTargets {
  if (!isRecord(value)) return false
  return ["kcal", "pro", "carb", "fat", "fiber", "sodium", "calcium", "iron"]
    .every((field) => isFiniteNumber(value[field]))
}

function isLegacyDietMeal(value: unknown): value is LegacyDietMeal {
  if (!isRecord(value)) return false
  return typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.time === "string"
    && typeof value.notes === "string"
    && Array.isArray(value.items)
}

function isLegacyDietDraft(value: unknown): value is LegacyDietDraft {
  if (!isRecord(value)) return false
  return isLegacyDietInfo(value.dietInfo)
    && isLegacyDietTargets(value.targets)
    && Array.isArray(value.meals)
    && value.meals.every(isLegacyDietMeal)
}

export const isUnreadableLegacyDietDraft = (
  value: LegacyDietDraftReadResult,
): value is UnreadableLegacyDietDraft =>
  value !== null && "status" in value && value.status === "unreadable"

export function readLegacyDietDraft(clientId: string): LegacyDietDraftReadResult {
  try {
    const serialized = window.localStorage.getItem(draftKey(clientId))
    if (serialized === null) return null
    const parsed: unknown = JSON.parse(serialized)
    return isLegacyDietDraft(parsed) ? parsed : { status: "unreadable", reason: "invalid" }
  } catch (error) {
    return {
      status: "unreadable",
      reason: error instanceof SyntaxError ? "invalid" : "unavailable",
    }
  }
}

export function consumeLegacyDietDraft(clientId: string): LegacyDietDraftReadResult {
  const draft = readLegacyDietDraft(clientId)
  if (draft === null || isUnreadableLegacyDietDraft(draft)) return draft
  try {
    window.localStorage.removeItem(draftKey(clientId))
    return draft
  } catch {
    return { status: "unreadable", reason: "unavailable" }
  }
}

export function discardLegacyDietDraft(clientId: string): boolean {
  try {
    window.localStorage.removeItem(draftKey(clientId))
    return true
  } catch {
    return false
  }
}
