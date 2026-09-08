import { describe, expect, it } from "vitest"
import type { ProfessionalRole } from "@/types/auth"
import { getClientFieldGroups } from "./client-field-policy"

const EXPECTED_FIELDS: Record<ProfessionalRole, readonly string[]> = {
  NUTRITIONIST: [
    "name",
    "email",
    "phone",
    "birthDate",
    "gender",
    "goal",
    "professionalNotes",
    "privacyNotes",
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
    "name",
    "email",
    "phone",
    "birthDate",
    "gender",
    "goal",
    "professionalNotes",
    "privacyNotes",
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
    "name",
    "email",
    "phone",
    "birthDate",
    "gender",
    "goal",
    "professionalNotes",
    "privacyNotes",
    "height",
    "initialWeight",
    "pathologies",
    "exerciseType",
    "exerciseFrequency",
    "exerciseDuration",
    "workActivityLevel",
  ],
}

describe("getClientFieldGroups", () => {
  it("does not expose nutrition-only intake fields to a Personal", () => {
    const names = getClientFieldGroups("PERSONAL").flatMap((group) => group.fields)

    expect(names).toContain("exerciseFrequency")
    expect(names).not.toContain("foodRelationship")
    expect(names).not.toContain("allergies")
  })

  it.each(Object.entries(EXPECTED_FIELDS) as [ProfessionalRole, readonly string[]][])(
    "returns the exact, duplicate-free %s intake matrix",
    (role, expectedFields) => {
      const names = getClientFieldGroups(role).flatMap((group) => group.fields)

      expect(new Set(names).size).toBe(names.length)
      expect([...names].sort()).toEqual([...expectedFields].sort())
    },
  )
})
