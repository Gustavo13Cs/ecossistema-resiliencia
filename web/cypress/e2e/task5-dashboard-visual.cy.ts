describe("Task 5 dashboard visual evidence", () => {
  it("captures the real production dashboard with isolated synthetic records", () => {
    cy.viewport(1586, 992)
    cy.visit("http://localhost:3001/auth/login")
    cy.get("#email").type("task5.fisio@example.test")
    cy.get("#password").type("Task5Pass1", { log: false })
    cy.contains("button", /^Entrar$/).click()
    cy.location("pathname", { timeout: 20_000 }).should("eq", "/home")
    cy.contains("h1", "Olá, Marina", { timeout: 20_000 }).should("be.visible")
    cy.contains("Mariana Costa").should("be.visible")
    cy.contains("Rafael Martins").should("be.visible")
    cy.window().then((window) => window.document.fonts.ready)
    cy.screenshot("dashboard-reproduction", {
      capture: "viewport",
      overwrite: true,
    })

    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(
        document.documentElement.clientWidth,
      )
    })

    cy.viewport(390, 844)
    cy.contains("h1", "Olá, Marina").should("be.visible")
    cy.get('[aria-label="Ações rápidas"]').should("be.visible")
    cy.get('[aria-label="Resumo da base"]').should("be.visible")
    cy.get('[aria-label="Clientes recentes"]').should("be.visible")
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(
        document.documentElement.clientWidth,
      )
    })
    cy.screenshot("dashboard-mobile-reproduction", {
      capture: "viewport",
      overwrite: true,
    })
  })
})
