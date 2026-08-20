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

  it("descarta os dados em memória a cada logout", () => {
    const professionalB = { ...professional, sub: "professional-b", name: "Dra. B", email: "b@example.com" }
    const patientB = { ...patient, id: "patient-b", name: "Paciente B", email: "patient-b@example.com" }
    let currentProfessional = professional
    let requestsForA = 0

    cy.intercept("GET", "**/auth/me", (request) => request.reply({ body: currentProfessional }))
    cy.intercept("POST", "**/auth/logout", { body: { message: "Logout realizado" } })
    cy.intercept("POST", "**/auth/login", (request) => {
      currentProfessional = request.body.email === "b@example.com" ? professionalB : professional
      request.reply({ body: { message: "Login realizado" } })
    })
    cy.intercept("GET", "**/diet-plans", { body: [] })
    cy.intercept("GET", "**/users", (request) => {
      if (currentProfessional.sub === professional.sub) requestsForA += 1
      request.reply({ body: [currentProfessional.sub === professional.sub ? patient : patientB] })
    }).as("sessionUsers")

    const login = (email: string) => {
      cy.get("#email").type(email)
      cy.get("#password").type("senha-segura")
      cy.contains("button", "Entrar no Sistema").click()
      cy.contains("a", "Meus Pacientes", { timeout: 20_000 }).first().click()
    }

    cy.visit("http://localhost:3001/home")
    cy.wait("@sessionUsers")
    cy.contains("button", "Sair da Conta").click()
    cy.url({ timeout: 20_000 }).should("include", "/auth/login")

    login("b@example.com")
    cy.contains("Paciente B", { timeout: 20_000 }).should("be.visible")
    cy.contains("Paciente Cache").should("not.exist")
    cy.contains("button", "Sair da Conta").click()
    cy.url({ timeout: 20_000 }).should("include", "/auth/login")

    login("cache@example.com")
    cy.contains("Paciente Cache", { timeout: 20_000 }).should("be.visible")
    cy.then(() => expect(requestsForA).to.equal(2))
  })
})
