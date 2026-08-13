describe("Jornada do Paciente - Perfil e Gamificação", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/auth/me", {
      body: { sub: "patient-e2e", role: "PATIENT", name: "Paciente Teste" },
    })
    cy.intercept("GET", "**/users/patient-e2e", {
      body: { id: "patient-e2e", name: "Paciente Teste", initialWeight: 80 },
    })
    cy.intercept("PATCH", "**/users/patient-e2e", { statusCode: 200, body: {} })
    cy.intercept("GET", "**/diet-plans/user/patient-e2e/active", { body: null })
    cy.intercept("GET", "**/metrics/today/patient-e2e", { body: [] })
    cy.intercept("GET", "**/metrics/consistency/patient-e2e", {
      body: { percentage: 0, activeDays: 0, totalLogs: 0, history: [] },
    })
    cy.intercept("GET", "**/supplements/user/patient-e2e/active", { body: null })
    cy.visit("http://localhost:3001/paciente")
  })

  it("Deve atualizar o peso no Perfil e recalcular a água na Home", () => {
    cy.contains("Perfil").click({ force: true })
    cy.url().should("include", "/paciente/perfil")

    cy.get('input[name="initialWeight"]').clear().type("80")
    cy.contains("Guardar Perfil").click()

    cy.contains("Perfil atualizado com sucesso!").should("be.visible")

    cy.contains("Início").click({ force: true })
    cy.url().should("include", "/paciente")

    cy.contains("2.8L").should("be.visible")
  })

  it("Deve permitir beber água e gamificar a barra", () => {
    cy.get('button[title="Beber 250ml"]').click()
    cy.contains("Meta de Água").parent().parent().invoke("text").should("not.match", /^0\.0L/)
  })
})
