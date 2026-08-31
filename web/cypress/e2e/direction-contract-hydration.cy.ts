describe("Direction contract production hydration", () => {
  it("hydrates the public login form without a React uncaught error", () => {
    cy.visit("http://localhost:3001/auth/login")

    cy.get("#email").should("be.visible")
    cy.get("#password").should("be.visible")
  })
})
