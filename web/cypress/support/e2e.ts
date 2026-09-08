import "@testing-library/cypress/add-commands"
import "cypress-axe"
import "cypress-real-events/support"
import "./commands"
import type { E2ERole } from "./commands"

const emailByRole: Record<E2ERole, string> = {
  NUTRITIONIST: "nutri.phase1@e2e.test",
  PERSONAL: "personal.phase1@e2e.test",
  PHYSIO: "physio.phase1@e2e.test",
}

Cypress.Commands.add("loginAs", (role: E2ERole) => {
  cy.session(["professional-phase1", role], () => {
    cy.visit("/auth/login")
    cy.findByLabelText("E-mail").type(emailByRole[role])
    cy.findByLabelText("Senha").type("SafeMove-E2E-2026!", { log: false })
    cy.findByRole("button", { name: "Entrar" }).click()
    cy.location("pathname", { timeout: 20_000 }).should("eq", "/home")
  })

  cy.visit("/home")
  cy.location("pathname", { timeout: 20_000 }).should("eq", "/home")
})
