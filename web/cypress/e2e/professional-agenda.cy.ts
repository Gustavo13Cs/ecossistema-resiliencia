describe("Agenda profissional (mocked UI contract)", () => {
  const client = {
    id: "client-1",
    professionalId: "professional-1",
    name: "Marina Lopes",
    status: "ACTIVE",
    email: null,
    phone: null,
    updatedAt: "2026-09-14T12:00:00.000Z",
  }
  const createdEvent: {
    id: string
    appointmentId: string
    professionalId: string
    type: string
    previousStatus: string | null
    nextStatus: string | null
    previousStartsAt: string | null
    previousEndsAt: string | null
    nextStartsAt: string
    nextEndsAt: string
    createdAt: string
  } = {
    id: "event-1",
    appointmentId: "appointment-1",
    professionalId: "professional-1",
    type: "CREATED",
    previousStatus: null,
    nextStatus: "SCHEDULED",
    previousStartsAt: null,
    previousEndsAt: null,
    nextStartsAt: "2026-09-15T13:00:00.000Z",
    nextEndsAt: "2026-09-15T14:00:00.000Z",
    createdAt: "2026-09-14T12:00:00.000Z",
  }
  let appointment = {
    id: "appointment-1",
    professionalId: "professional-1",
    clientId: "client-1",
    kind: "FOLLOW_UP",
    status: "SCHEDULED",
    modality: "IN_PERSON",
    startsAt: "2026-09-15T13:00:00.000Z",
    endsAt: "2026-09-15T14:00:00.000Z",
    timeZone: "America/Sao_Paulo",
    location: "Consultório 2",
    meetingUrl: null,
    notes: "Revisar exames recentes",
    cancellationReason: null,
    cancelledAt: null,
    createdAt: "2026-09-14T12:00:00.000Z",
    updatedAt: "2026-09-14T12:00:00.000Z",
    client: { id: "client-1", name: "Marina Lopes", status: "ACTIVE" },
    events: [createdEvent],
  }

  beforeEach(() => {
    appointment = { ...appointment, status: "SCHEDULED", events: [createdEvent] }
    cy.intercept("GET", "**/auth/me", {
      statusCode: 200,
      body: {
        user: {
          sub: "professional-1",
          role: "NUTRITIONIST",
          name: "Dra. Ana",
        },
        csrfToken: "csrf-agenda-e2e",
      },
    })
    cy.intercept("GET", "**/clients?status=ACTIVE", {
      statusCode: 200,
      body: [client],
    }).as("clients")
    cy.intercept({ method: "GET", pathname: "/api/appointments" }, (request) => {
      request.reply({ statusCode: 200, body: [appointment] })
    }).as("appointments")
    cy.intercept("GET", "**/appointments/appointment-1", (request) => {
      request.reply({ statusCode: 200, body: appointment })
    }).as("appointmentDetails")
    cy.intercept("POST", "**/appointments/appointment-1/confirm", (request) => {
      expect(request.body).to.deep.equal({
        expectedUpdatedAt: appointment.updatedAt,
      })
      appointment = {
        ...appointment,
        status: "CONFIRMED",
        updatedAt: "2026-09-14T12:01:00.000Z",
        events: [
          createdEvent,
          {
            ...createdEvent,
            id: "event-2",
            type: "CONFIRMED",
            previousStatus: "SCHEDULED",
            nextStatus: "CONFIRMED",
            createdAt: "2026-09-14T12:01:00.000Z",
          },
        ],
      }
      request.reply({ statusCode: 201, body: appointment })
    }).as("confirmAppointment")
  })

  it("navigates the calendar, opens history and records confirmation", () => {
    cy.viewport(1280, 720)
    cy.visit("/agenda")
    cy.wait(["@clients", "@appointments"])
    cy.findByRole("heading", { name: "Agenda" }).should("be.visible")
    cy.findByRole("button", { name: "Dia" }).click()
    cy.get('input[type="date"]').clear().type("2026-09-15")
    cy.findByRole("button", { name: /Marina Lopes, Retorno/i }).click()
    cy.wait("@appointmentDetails")
    cy.findByRole("heading", { name: "Marina Lopes" }).should("be.visible")
    cy.contains("Atendimento criado").should("be.visible")
    cy.findByRole("button", { name: "Confirmar" }).click()
    cy.wait("@confirmAppointment")
    cy.findByRole("region", { name: "Histórico" })
      .contains("Confirmação registrada")
      .should("be.visible")
    cy.findByRole("status").contains("Confirmado").should("be.visible")
    cy.findByRole("button", { name: "Cancelar" }).should("be.visible")
    cy.findByRole("button", { name: "Close" }).should("be.visible")
    cy.window().then((window) => {
      cy.get('[data-slot="sheet-content"]').should(($sheet) => {
        const sheetRect = $sheet[0].getBoundingClientRect()

        expect($sheet[0].scrollWidth, "sheet horizontal overflow").to.be.at.most(
          $sheet[0].clientWidth,
        )
        expect(sheetRect.left, "sheet left edge").to.be.at.least(0)
        expect(sheetRect.right, "sheet right edge").to.be.at.most(
          window.innerWidth,
        )
      })
      cy.findByRole("button", { name: "Cancelar" }).should(($button) => {
        const buttonRect = $button[0].getBoundingClientRect()

        expect(buttonRect.right, "cancel action right edge").to.be.at.most(
          window.innerWidth,
        )
      })
    })
    cy.screenshot("agenda-profissional-desktop-final")

    cy.findByRole("button", { name: "Close" }).click()
    cy.viewport(390, 844)
    cy.findByRole("button", { name: "Semana" }).click()
    cy.findByRole("button", { name: /terça 15/i }).should("be.visible")
    cy.screenshot("agenda-profissional-mobile-final")
  })
})
