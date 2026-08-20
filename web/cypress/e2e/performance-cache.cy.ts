const professional = {
  sub: "professional-cache-e2e",
  role: "NUTRITIONIST",
  name: "Dra. Cache",
  email: "cache@example.com",
}

const patient = {
  id: "patient-cache-e2e",
  name: "Paciente Cache",
  email: "paciente-cache@example.com",
  phone: "(11) 99999-9999",
  createdAt: "2026-08-01T12:00:00.000Z",
}

describe("Cache de navegação", () => {
  beforeEach(() => {
    cy.viewport(1280, 900)
    cy.intercept("GET", "**/auth/me", { body: professional })
  })

  it("reutiliza a lista de pacientes ao alternar entre Home e Membros", () => {
    let usersRequests = 0
    cy.intercept("GET", "**/users", (request) => {
      usersRequests += 1
      request.reply({ body: [patient] })
    }).as("getUsers")

    cy.visit("http://localhost:3001/home")
    cy.wait("@getUsers")
    cy.contains("a", "Meus Pacientes").first().click()
    cy.contains("Diretório de Pacientes", { timeout: 20_000 }).should("be.visible")
    cy.contains("a", "Início").first().click()
    cy.contains("Bom dia", { timeout: 20_000 }).should("be.visible")
    cy.contains("a", "Meus Pacientes").first().click()
    cy.contains("Diretório de Pacientes", { timeout: 20_000 }).should("be.visible")

    cy.then(() => {
      expect(usersRequests).to.equal(1)
    })
  })
})
