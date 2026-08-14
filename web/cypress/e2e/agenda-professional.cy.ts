describe("Agenda diária do profissional", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/auth/me", {
      body: {
        sub: "professional-e2e",
        role: "NUTRITIONIST",
        name: "Dra. Ana",
      },
    })

    cy.intercept("GET", "**/users", {
      body: [
        {
          id: "patient-e2e",
          name: "Paciente Teste",
          email: "paciente@teste.com",
          phone: "(11) 99999-9999",
        },
      ],
    }).as("getMembers")

    cy.intercept("GET", "**/agenda/patient/patient-e2e*", {
      body: {
        patient: { id: "patient-e2e", name: "Paciente Teste" },
        occurrences: [
          {
            id: "occurrence-owned",
            scheduledFor: "2026-08-13T18:00:00.000Z",
            status: "PENDING",
            completedAt: null,
            skipReason: null,
            patientNote: null,
            task: {
              id: "task-owned",
              patientId: "patient-e2e",
              title: "Hidratação da manhã",
              category: "HYDRATION",
              instructions: "Beber um copo de agua.",
              priority: "NORMAL",
              startsAt: "2026-08-13T12:00:00.000Z",
              endsAt: "2026-08-20T02:59:00.000Z",
              timeZone: "America/Sao_Paulo",
              recurrenceRule: "FREQ=DAILY;INTERVAL=1",
              status: "ACTIVE",
              professional: {
                id: "professional-e2e",
                name: "Dra. Ana",
                role: "NUTRITIONIST",
              },
            },
          },
          {
            id: "occurrence-other",
            scheduledFor: "2026-08-13T20:00:00.000Z",
            status: "PENDING",
            completedAt: null,
            skipReason: null,
            patientNote: null,
            task: {
              id: "task-other",
              patientId: "patient-e2e",
              title: "Alongamento orientado",
              category: "REHABILITATION",
              instructions: "Realizar sem dor.",
              priority: "LOW",
              startsAt: "2026-08-13T20:00:00.000Z",
              endsAt: null,
              timeZone: "America/Sao_Paulo",
              recurrenceRule: null,
              status: "ACTIVE",
              professional: {
                id: "professional-other",
                name: "Dr. Bruno",
                role: "PHYSIO",
              },
            },
          },
        ],
        summary: { actionable: 2, completed: 0, percentage: 0 },
      },
    }).as("getAgenda")

    cy.intercept("GET", "**/health-check-ins/patient/patient-e2e*", {
      statusCode: 403,
      body: { message: "Consentimento não concedido" },
    }).as("getCheckIns")

    cy.intercept("POST", "**/agenda/tasks", (request) => {
      expect(request.body).to.deep.equal({
        patientId: "patient-e2e",
        title: "Hidratação da tarde",
        category: "HYDRATION",
        priority: "NORMAL",
        startsAt: "2026-08-13T18:00:00.000Z",
        timeZone: "America/Sao_Paulo",
        recurrenceRule: "FREQ=DAILY;INTERVAL=1",
      })

      request.reply({
        statusCode: 201,
        body: { id: "task-created", ...request.body, status: "ACTIVE" },
      })
    }).as("createTask")

    cy.intercept("PATCH", "**/agenda/tasks/task-owned", (request) => {
      expect(request.body).to.deep.equal({
        title: "Hidratação da manhã",
        category: "HYDRATION",
        priority: "NORMAL",
        startsAt: "2026-08-13T12:00:00.000Z",
        timeZone: "America/Sao_Paulo",
        recurrenceRule: null,
        endsAt: null,
        instructions: null,
      })

      request.reply({
        statusCode: 200,
        body: { id: "task-owned", ...request.body, status: "ACTIVE" },
      })
    }).as("updateTask")
  })

  it("abre o paciente, cria uma tarefa e respeita consentimento e autoria", () => {
    cy.visit("http://localhost:3001/membros")
    cy.wait("@getMembers")
    cy.contains("tr", "Paciente Teste").within(() => {
      cy.contains("a", "Agenda").click()
    })

    cy.wait(["@getAgenda", "@getCheckIns"], { requestTimeout: 20000 })
    cy.contains("h1", "Agenda de Paciente Teste").should("be.visible")
    cy.contains("Paciente ainda não compartilhou estes registros").should("be.visible")

    cy.contains("article", "Hidratação da manhã").within(() => {
      cy.contains("button", "Editar").should("be.visible")
      cy.contains("button", "Pausar").should("be.visible")
      cy.contains("button", "Encerrar").should("be.visible")
    })
    cy.contains("article", "Alongamento orientado").within(() => {
      cy.contains("button", "Editar").should("not.exist")
      cy.contains("button", "Pausar").should("not.exist")
      cy.contains("button", "Encerrar").should("not.exist")
    })

    cy.contains("button", "Nova tarefa").click()
    cy.get("#agenda-task-title").type("Hidratação da tarde")
    cy.get("#agenda-task-category").select("HYDRATION")
    cy.get("#agenda-task-priority").select("NORMAL")
    cy.get("#agenda-task-starts-at").type("2026-08-13T15:00")
    cy.get("#agenda-task-time-zone").clear().type("America/Sao_Paulo")
    cy.get("#agenda-task-recurrence").select("DAILY")
    cy.contains("button", "Criar tarefa").click()

    cy.wait("@createTask")
    cy.contains("Tarefa criada com sucesso").should("be.visible")

    cy.contains("article", "Hidratação da manhã").within(() => {
      cy.contains("button", "Editar").click()
    })
    cy.get("#agenda-task-time-zone").clear().type("Invalid/Time_Zone")
    cy.contains("button", "Salvar alterações").click()
    cy.get('[role="alert"]').should("contain.text", "fuso horário")

    cy.get("#agenda-task-time-zone").clear().type("America/Sao_Paulo")
    cy.get("#agenda-task-recurrence").select("ONCE")
    cy.get("#agenda-task-ends-at").clear()
    cy.get("#agenda-task-instructions").clear()
    cy.contains("button", "Salvar alterações").click()

    cy.wait("@updateTask")
    cy.contains("Tarefa atualizada com sucesso").should("be.visible")
  })
})
