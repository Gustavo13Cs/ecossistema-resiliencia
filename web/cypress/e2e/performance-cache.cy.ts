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

const overviewFor = (name: string) => ({
  patient: { ...patient, name },
  activeDietPlan: null,
  activeWorkout: null,
  activeRehabPlan: null,
  latestAssessment: null,
  weightDelta: null,
  latestLabExam: null,
  activeAlerts: [],
  latestPhysioAssessment: null,
  conflictWarning: null,
  recentTimeline: [],
})

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
    cy.wait("@sessionUsers", { timeout: 20_000 })
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

  it("remove todos os dados clínicos em cache ao desvincular o paciente", () => {
    let deleted = false
    const counts = { patient: 0, assessments: 0, anamneses: 0 }

    cy.intercept("GET", /\/users(?:\?.*)?$/, (request) => {
      request.reply({ body: deleted ? [] : [patient] })
    })
    cy.intercept("GET", `**/users/${patient.id}`, (request) => {
      counts.patient += 1
      request.reply(deleted ? { statusCode: 404, body: {} } : { body: patient })
    }).as("deletedPatientDetail")
    cy.intercept("GET", `**/assessments/user/${patient.id}`, (request) => {
      counts.assessments += 1
      request.reply({ body: [] })
    }).as("deletedPatientAssessments")
    cy.intercept("GET", `**/anamneses/user/${patient.id}`, (request) => {
      counts.anamneses += 1
      request.reply({ body: [] })
    }).as("deletedPatientAnamneses")
    cy.intercept("DELETE", `**/users/${patient.id}`, (request) => {
      deleted = true
      request.reply({ statusCode: 200, body: {} })
    }).as("deletePatient")

    cy.visit("http://localhost:3001/membros")
    cy.contains("a", "Prontuário Completo", { timeout: 20_000 }).click()
    cy.wait(["@deletedPatientDetail", "@deletedPatientAssessments", "@deletedPatientAnamneses"])
    cy.get('a[href="/membros"]').first().click()
    cy.contains("Diretório de Pacientes", { timeout: 20_000 }).should("be.visible")
    cy.get('button[title="Remover"]').click()
    cy.contains("button", "Sim, Remover").click()
    cy.wait("@deletePatient")
    cy.contains(patient.name).should("not.exist")

    cy.go("back")
    cy.wait(["@deletedPatientDetail", "@deletedPatientAssessments", "@deletedPatientAnamneses"])
    cy.then(() => expect(counts).to.deep.equal({ patient: 2, assessments: 2, anamneses: 2 }))
  })

  it("atualiza lista e visão 360 depois de editar o cadastro", () => {
    let currentPatient = { ...patient }
    let usersRequests = 0
    let overviewRequests = 0

    cy.intercept("GET", /\/users(?:\?.*)?$/, (request) => {
      usersRequests += 1
      request.reply({ body: [currentPatient] })
    }).as("profileUsers")
    cy.intercept("GET", `**/users/${patient.id}`, (request) => request.reply({ body: currentPatient })).as("profilePatient")
    cy.intercept("GET", `**/assessments/user/${patient.id}`, { body: [] })
    cy.intercept("GET", `**/anamneses/user/${patient.id}`, { body: [] })
    cy.intercept("GET", `**/users/${patient.id}/overview`, (request) => {
      overviewRequests += 1
      request.reply({ body: overviewFor(currentPatient.name) })
    }).as("profileOverview")
    cy.intercept("PATCH", `**/users/${patient.id}`, (request) => {
      currentPatient = { ...currentPatient, name: request.body.name }
      request.reply({ statusCode: 200, body: currentPatient })
    }).as("updatePatient")

    cy.visit("http://localhost:3001/membros")
    cy.wait("@profileUsers")
    cy.contains("a", "Prontuário Completo").click()
    cy.wait("@profilePatient")
    cy.get(`a[href="/membros/${patient.id}/visao-360"]`).click()
    cy.wait("@profileOverview")
    cy.contains(patient.name, { timeout: 20_000 }).should("be.visible")
    cy.get(`a[href="/membros/${patient.id}"]`).first().click()

    cy.contains("button", "Editar Cadastro", { timeout: 20_000 }).click()
    cy.get("form").last().find('input').first().clear({ force: true }).type("Paciente Atualizado", { force: true })
    cy.contains("button", "Salvar Alterações").click()
    cy.wait("@updatePatient")
    cy.contains("Ficha atualizada com sucesso!").should("be.visible")
    cy.get('a[href="/membros"]').first().click()
    cy.wait("@profileUsers")
    cy.contains("Paciente Atualizado", { timeout: 20_000 }).should("be.visible")

    cy.contains("a", "Prontuário Completo").click()
    cy.get(`a[href="/membros/${patient.id}/visao-360"]`).click()
    cy.wait("@profileOverview")
    cy.contains("Paciente Atualizado", { timeout: 20_000 }).should("be.visible")
    cy.then(() => {
      expect(usersRequests).to.equal(2)
      expect(overviewRequests).to.equal(2)
    })
  })

  it("atualiza a visão 360 depois de uma nova avaliação", () => {
    let overviewRequests = 0
    cy.intercept("GET", `**/users/${patient.id}`, { body: patient })
    cy.intercept("GET", `**/assessments/user/${patient.id}`, { body: [] }).as("assessmentList")
    cy.intercept("GET", `**/anamneses/user/${patient.id}`, { body: [] })
    cy.intercept("GET", `**/users/${patient.id}/overview`, (request) => {
      overviewRequests += 1
      request.reply({ body: overviewFor(patient.name) })
    }).as("assessmentOverview")
    cy.intercept("POST", "**/assessments", { statusCode: 201, body: { id: "assessment-new" } }).as("createAssessment")

    cy.visit(`http://localhost:3001/membros/${patient.id}/visao-360`)
    cy.wait("@assessmentOverview")
    cy.get(`a[href="/membros/${patient.id}"]`).first().click()
    cy.contains("button", "Avaliar", { timeout: 20_000 }).click()
    cy.get('input[type="number"]').first().type("74")
    cy.contains("button", "Salvar Avaliação").click()
    cy.wait("@createAssessment")
    cy.wait("@assessmentList")
    cy.get(`a[href="/membros/${patient.id}/visao-360"]`).click()
    cy.wait("@assessmentOverview")
    cy.then(() => expect(overviewRequests).to.equal(2))
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
    cy.get('[aria-label="Evolução da composição corporal"]', { timeout: 20_000 }).should("be.visible")

    cy.get(`a[href="/membros/${patient.id}/nova-dieta"]`).click()
    cy.contains("Prescrição Dietética", { timeout: 60_000 }).should("be.visible")
    cy.get('[aria-label="Distribuição de macronutrientes"]', { timeout: 20_000 }).should("be.visible")
  })
})
