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
    cy.intercept("GET", /\/users(?:\?.*)?$/, (request) => {
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
    cy.intercept("GET", /\/users(?:\?.*)?$/, (request) => {
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

  it("reutiliza paciente, avaliações e anamneses ao reabrir a ficha", () => {
    const counts = { patient: 0, assessments: 0, anamneses: 0 }
    cy.intercept("GET", /\/users(?:\?.*)?$/, { body: [patient] })
    cy.intercept("GET", `**/users/${patient.id}`, (request) => {
      counts.patient += 1
      request.reply({ body: patient })
    }).as("patientDetail")
    cy.intercept("GET", `**/assessments/user/${patient.id}`, (request) => {
      counts.assessments += 1
      request.reply({ body: [] })
    }).as("patientAssessments")
    cy.intercept("GET", `**/anamneses/user/${patient.id}`, (request) => {
      counts.anamneses += 1
      request.reply({ body: [] })
    }).as("patientAnamneses")

    cy.visit("http://localhost:3001/membros")
    cy.contains("a", "Prontuário Completo", { timeout: 20_000 }).click()
    cy.url({ timeout: 20_000 }).should("include", `/membros/${patient.id}`)
    cy.wait(["@patientDetail", "@patientAssessments", "@patientAnamneses"])
    cy.contains("Cadastrado em", { timeout: 20_000 }).should("be.visible")
    cy.get('a[href="/membros"]').first().click()
    cy.contains("Diretório de Pacientes", { timeout: 20_000 }).should("be.visible")
    cy.contains("a", "Prontuário Completo").click()
    cy.url({ timeout: 20_000 }).should("include", `/membros/${patient.id}`)
    cy.contains("Cadastrado em", { timeout: 20_000 }).should("be.visible")

    cy.then(() => expect(counts).to.deep.equal({ patient: 1, assessments: 1, anamneses: 1 }))
  })

  it("reutiliza a dieta ativa entre Início e Dieta do paciente", () => {
    const patientUser = { sub: patient.id, role: "PATIENT", name: patient.name, email: patient.email }
    let dietRequests = 0
    cy.intercept("GET", "**/auth/me", { body: patientUser })
    cy.intercept("GET", `**/diet-plans/user/${patient.id}/active`, (request) => {
      dietRequests += 1
      request.reply({ body: { id: "diet-1", title: "Dieta Cache", goal: "Saúde", meals: [] } })
    })
    cy.intercept("GET", "**/metrics/**", { body: { completedItems: [], consistency: 0 } })
    cy.intercept("GET", "**/supplements/**", { statusCode: 404, body: {} })

    cy.visit("http://localhost:3001/paciente")
    cy.get('aside a[href="/paciente/dieta"]', { timeout: 20_000 }).click()
    cy.contains("Plano Alimentar", { timeout: 20_000 }).should("be.visible")
    cy.get('aside a[href="/paciente"]').click()
    cy.contains("Dieta Cache", { timeout: 20_000 }).should("be.visible")
    cy.get('aside a[href="/paciente/dieta"]').click()
    cy.contains("Plano Alimentar", { timeout: 20_000 }).should("be.visible")
    cy.then(() => expect(dietRequests).to.equal(1))
  })

  it("mantém os gráficos acessíveis ao carregá-los sob demanda", () => {
    cy.intercept("GET", /\/users(?:\?.*)?$/, { body: [patient] })
    cy.intercept("GET", `**/users/${patient.id}`, { body: patient })
    cy.intercept("GET", `**/assessments/user/${patient.id}`, {
      body: [{ id: "assessment-1", date: "2026-08-20T12:00:00.000Z", weight: 75, bodyFat: 20, muscleMass: 35 }],
    })
    cy.intercept("GET", `**/anamneses/user/${patient.id}`, { body: [] })
    cy.intercept("GET", `**/diet-plans/user/${patient.id}/active`, { statusCode: 404, body: {} })
    cy.intercept("GET", "**/foods?*", { body: [] })

    cy.visit(`http://localhost:3001/membros/${patient.id}`, {
      onBeforeLoad(window) { window.localStorage.clear() },
    })
    cy.contains("Cadastrado em", { timeout: 20_000 }).should("be.visible")
    cy.get('[aria-label="Evolução da composição corporal"]').should("be.visible")

    cy.get(`a[href="/membros/${patient.id}/nova-dieta"]`).click()
    cy.contains("Prescrição Dietética", { timeout: 60_000 }).should("be.visible")
    cy.get('[aria-label="Distribuição de macronutrientes"]').should("be.visible")
  })
})
