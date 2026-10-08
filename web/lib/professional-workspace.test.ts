import { describe, expect, it } from "vitest"
import { canAccessProfessionalPath, getNavigationForRole } from "./professional-workspace"
import type { UserRole } from "@/types/auth"

describe("owned Client overview access", () => {
  it.each(["NUTRITIONIST", "PERSONAL", "PHYSIO"] as const)("permits %s to open its owned overview", role => {
    expect(canAccessProfessionalPath(role, "/clientes/client-one/visao-360")).toBe(true)
  })
  it.each(["ADMIN", "PATIENT"] as const)("denies %s clinical overview", role => {
    // PATIENT é legado e deliberadamente não faz parte do contrato atual UserRole.
    expect(canAccessProfessionalPath(role as UserRole, "/clientes/client-one/visao-360")).toBe(false)
  })
})

describe("professional workspace policy", () => {
  it.each(["NUTRITIONIST", "PERSONAL", "PHYSIO"] as const)(
    "does not grant %s the removed access history route",
    (role) => {
      expect(canAccessProfessionalPath(role, "/auditoria")).toBe(false)
      expect(canAccessProfessionalPath(role, "/home")).toBe(true)
      expect(canAccessProfessionalPath(role, "/clientes")).toBe(true)
      expect(canAccessProfessionalPath(role, "/avaliacoes")).toBe(true)
      expect(canAccessProfessionalPath(role, "/agenda")).toBe(true)
    },
  )

  it.each(["NUTRITIONIST", "PERSONAL", "PHYSIO"] as const)(
    "shares the professional Agenda with %s",
    (role) => {
      expect(getNavigationForRole(role)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "agenda", href: "/agenda" }),
        ]),
      )
      expect(canAccessProfessionalPath(role, "/agenda")).toBe(true)
    },
  )

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
    expect(canAccessProfessionalPath("NUTRITIONIST", "/clientes/c1/nova-anamnese")).toBe(true)
    expect(canAccessProfessionalPath("PERSONAL", "/clientes/c1/nova-anamnese")).toBe(false)
    expect(canAccessProfessionalPath("NUTRITIONIST", "/receitas")).toBe(true)
    expect(canAccessProfessionalPath("PERSONAL", "/receitas")).toBe(false)
    expect(canAccessProfessionalPath("ADMIN", "/clientes")).toBe(false)
  })
})
