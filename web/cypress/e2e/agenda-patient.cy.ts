describe("Agenda diária do paciente", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/auth/me", {
      body: { sub: "patient-e2e", role: "PATIENT", name: "Paciente Teste" },
    })

    cy.intercept("GET", "**/agenda/patient/patient-e2e*", {
      body: {
        patient: { id: "patient-e2e", name: "Paciente Teste" },
        occurrences: [
          {
            id: "occurrence-1",
            scheduledFor: "2026-08-13T12:00:00.000Z",
            status: "PENDING",
            completedAt: null,
            skipReason: null,
            patientNote: null,
            task: {
              id: "task-1",
              title: "Tomar suplemento",
              category: "NUTRITION",
              instructions: "Tomar com água após o almoço.",
              priority: "NORMAL",
              professional: {
                id: "professional-1",
                name: "Dra. Ana",
                role: "NUTRITIONIST",
              },
            },
          },
        ],
        summary: { actionable: 5, completed: 3, percentage: 60 },
      },
    }).as("getAgenda")

    cy.intercept("POST", "**/agenda/occurrences/occurrence-1/complete", {
      statusCode: 200,
      body: { id: "occurrence-1", status: "COMPLETED" },
    }).as("completeTask")
    cy.intercept("POST", "**/agenda/occurrences/*/skip", {
      statusCode: 200,
      body: { id: "occurrence-1", status: "SKIPPED" },
    }).as("skipTask")
    cy.intercept("POST", "**/health-check-ins", {
      statusCode: 201,
      body: { id: "check-in-1", painLevel: 4 },
    }).as("createCheckIn")
    cy.intercept("GET", "**/consents/me", {
      body: [
        {
          professional: {
            id: "professional-1",
            name: "Dra. Ana",
            role: "NUTRITIONIST",
          },
          category: "HEALTH_CHECK_IN",
          granted: false,
          updatedAt: null,
        },
      ],
    }).as("getConsents")
    cy.intercept(
      "PUT",
      "**/consents/professional-1/HEALTH_CHECK_IN",
      {
        statusCode: 200,
        body: { granted: true },
      },
    ).as("updateConsent")

    cy.visit("http://localhost:3001/paciente/agenda")
  })

  it("conclui uma tarefa, registra um check-in e concede compartilhamento", () => {
    cy.contains("Sua agenda de hoje").should("be.visible")
    cy.contains("60% concluído").should("be.visible")
    cy.contains("Tomar suplemento").should("be.visible")
    cy.contains("Concluir").click()
    cy.wait("@completeTask")
    cy.contains("Tarefa concluída").should("be.visible")
    cy.contains("Check-in de saúde").click()
    cy.get('input[name="painLevel"]').type("4")
    cy.contains("Salvar check-in").click()
    cy.wait("@createCheckIn")
    cy.contains("Compartilhamento de saúde").click()
    cy.get('[data-testid="consent-professional-1"]').click()
    cy.wait("@updateConsent")
  })
})
