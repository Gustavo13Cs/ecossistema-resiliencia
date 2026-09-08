/// <reference types="cypress-real-events" />

import type {} from "@testing-library/cypress"
import type {} from "cypress-axe"

export type E2ERole = "NUTRITIONIST" | "PERSONAL" | "PHYSIO"

declare global {
  namespace Cypress {
    interface Chainable {
      loginAs(role: E2ERole): Chainable<void>
    }
  }
}
