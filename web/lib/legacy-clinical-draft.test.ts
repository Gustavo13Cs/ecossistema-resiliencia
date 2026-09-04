import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  consumeLegacyDietDraft,
  discardLegacyDietDraft,
  readLegacyDietDraft,
} from "./legacy-clinical-draft"

const validDraft = {
  dietInfo: {
    title: "Plano de recuperação",
    goal: "Recuperação",
    notes: "Somente nesta sessão",
    durationDays: 14,
    patientWeight: 70,
  },
  targets: {
    kcal: 2100,
    pro: 120,
    carb: 240,
    fat: 65,
    fiber: 30,
    sodium: 2000,
    calcium: 1000,
    iron: 15,
  },
  meals: [
    {
      id: "meal-one",
      name: "Café da manhã",
      time: "08:00",
      notes: "",
      items: [],
    },
  ],
}

describe("legacy clinical draft", () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it("reads a valid draft without removing it before explicit choice", () => {
    localStorage.setItem("diet_draft_client-one", JSON.stringify(validDraft))

    expect(readLegacyDietDraft("client-one")).toEqual(validDraft)
    expect(localStorage.getItem("diet_draft_client-one")).not.toBeNull()
  })

  it("consumes a valid draft into memory and removes it immediately", () => {
    localStorage.setItem("diet_draft_client-one", JSON.stringify(validDraft))

    expect(consumeLegacyDietDraft("client-one")).toEqual(validDraft)
    expect(localStorage.getItem("diet_draft_client-one")).toBeNull()
  })

  it("discards without applying the draft", () => {
    localStorage.setItem("diet_draft_client-one", JSON.stringify(validDraft))

    expect(discardLegacyDietDraft("client-one")).toBe(true)
    expect(localStorage.getItem("diet_draft_client-one")).toBeNull()
  })

  it("reports invalid content as unreadable and keeps it until explicit discard", () => {
    localStorage.setItem("diet_draft_client-one", "{invalid")

    expect(readLegacyDietDraft("client-one")).toEqual({ status: "unreadable", reason: "invalid" })
    expect(consumeLegacyDietDraft("client-one")).toEqual({ status: "unreadable", reason: "invalid" })
    expect(localStorage.getItem("diet_draft_client-one")).toBe("{invalid")

    expect(discardLegacyDietDraft("client-one")).toBe(true)
    expect(localStorage.getItem("diet_draft_client-one")).toBeNull()
  })

  it("rejects an incomplete meal item without consuming or removing it", () => {
    const malformedDraft = {
      ...validDraft,
      meals: [{
        ...validDraft.meals[0],
        items: [{ id: "item-one", quantity: 100, measure: "g", food: { id: "food-one" } }],
      }],
    }
    const serialized = JSON.stringify(malformedDraft)
    localStorage.setItem("diet_draft_client-one", serialized)

    expect(readLegacyDietDraft("client-one")).toEqual({ status: "unreadable", reason: "invalid" })
    expect(consumeLegacyDietDraft("client-one")).toEqual({ status: "unreadable", reason: "invalid" })
    expect(localStorage.getItem("diet_draft_client-one")).toBe(serialized)

    expect(discardLegacyDietDraft("client-one")).toBe(true)
    expect(localStorage.getItem("diet_draft_client-one")).toBeNull()
  })

  it("fails safely when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })

    expect(readLegacyDietDraft("client-one")).toEqual({ status: "unreadable", reason: "unavailable" })
    expect(consumeLegacyDietDraft("client-one")).toEqual({ status: "unreadable", reason: "unavailable" })
  })
})
