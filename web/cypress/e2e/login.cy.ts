describe("Fluxo de autenticação", () => {
  it("redireciona paciente autenticado", () => {
    cy.intercept("POST", "**/auth/login", { statusCode: 201, body: {} })
    cy.intercept("GET", "**/auth/me", {
      statusCode: 200,
      body: { sub: "patient-e2e", role: "PATIENT", name: "Paciente Teste" },
    })

    cy.visit("http://localhost:3001/auth/login")
    cy.get('input[type="email"]').type("patient@example.test")
    cy.get('input[type="password"]').type("not-a-real-password")
    cy.get('button[type="submit"]').click()
    cy.url().should("include", "/paciente")
  })
})
