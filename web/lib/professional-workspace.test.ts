import { describe, expect, it } from "vitest"
import { canAccessProfessionalPath, getNavigationForRole } from "./professional-workspace"

describe("professional workspace policy", () => {
  it.each([
    ["NUTRITIONIST", ["Planos alimentares", "Alimentos"], ["Planilhas", "Reabilitação"]],
    ["PERSONAL", ["Planilhas"], ["Planos alimentares", "Alimentos", "Reabilitação"]],
    ["PHYSIO", ["Reabilitação"], ["Planos alimentares", "Alimentos", "Planilhas"]],
  ] as const)("isolates %s navigation", (role, visible, absent) => {
    const labels = getNavigationForRole(role).map((item) => item.label)
    visible.forEach((label) => expect(labels).toContain(label))
    absent.forEach((label) => expect(labels).not.toContain(label))
  })

  it("rejects direct cross-domain paths and every clinical path for ADMIN", () => {
    expect(canAccessProfessionalPath("PERSONAL", "/clientes/c1/nova-dieta")).toBe(false)
    expect(canAccessProfessionalPath("NUTRITIONIST", "/clientes/c1/novo-treino")).toBe(false)
    expect(canAccessProfessionalPath("PHYSIO", "/clientes/c1/nova-reabilitacao")).toBe(true)
    expect(canAccessProfessionalPath("ADMIN", "/clientes")).toBe(false)
  })
})
