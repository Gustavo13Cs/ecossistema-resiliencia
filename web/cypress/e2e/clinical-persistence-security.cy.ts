const persistedClientId = "41000000-0000-4000-8000-000000000001"
const privateOtherClientId = "41000000-0000-4000-8000-000000000002"
const printAttack = '<svg onload="window.attacked=true"><script>window.attacked=true</script></style> " & \''

function assertNoClinicalStorage() {
  cy.window().then(browser => {
    for (const storage of [browser.localStorage, browser.sessionStorage]) {
      const persisted = Array.from({ length: storage.length }, (_, index) => {
        const key = storage.key(index)!
        return `${key}=${storage.getItem(key)}`
      }).join("\n")
      expect(persisted).not.to.match(/safemove_client_goals|safemove_central_lab_exams|safemove_issued_lab_orders|Synthetic|Cliente privado/i)
    }
  })
}
function openGoals() {
  cy.intercept("GET", "**/client-goals").as("goals")
  cy.visit("/metas")
  cy.wait("@goals").its("response.statusCode").should("eq", 200)
  cy.contains("Cliente privado B").should("not.exist")
}
function openLabs() {
  cy.intercept("GET", "**/lab-exams").as("exams")
  cy.intercept("GET", "**/lab-orders").as("orders")
  cy.visit("/exames")
  cy.wait(["@exams", "@orders"]).then(interceptions => {
    for (const interception of interceptions) {
      expect(interception.response?.statusCode).to.equal(200)
      expect(JSON.stringify(interception.response?.body)).not.to.contain(privateOtherClientId)
    }
  })
}

describe("Clinical persistence and print security over real HTTP", () => {
  beforeEach(() => cy.loginAs("NUTRITIONIST"))
  afterEach(() => {
    cy.request<{ csrfToken: string }>("/api/auth/me").then(session => {
      const headers = { Origin: "http://localhost:3001", "X-CSRF-Token": session.body.csrfToken }
      for (const resource of ["client-goals", "lab-exams", "lab-orders"]) {
        cy.request<{ id: string; clientId: string }[]>(`/api/${resource}`).then(response => {
          for (const row of response.body.filter(record => record.clientId === persistedClientId)) {
            const id = resource === "client-goals" ? row.clientId : row.id
            cy.request({ method: "DELETE", url: `/api/${resource}/${id}`, headers }).its("status").should("eq", 200)
          }
        })
      }
    })
  })
  it("persists goals, exams and orders through the UI/reload and deletes only server records", () => {
    let goalId: string, examId: string, orderId: string
    cy.on("window:confirm", () => true)
    openGoals()
    cy.findByRole("button", { name: "Pactuar Nova Meta" }).click()
    cy.get("#client-select").select(persistedClientId)
    cy.get("#start-weight").clear().type("90")
    cy.get("#target-weight").clear().type("80")
    cy.get("#clinical-notes").type("Synthetic goal")
    cy.intercept("PUT", `**/client-goals/${persistedClientId}`).as("saveGoal")
    cy.findByRole("button", { name: "Salvar Meta Clínica" }).click()
    cy.wait("@saveGoal").then(({ request, response }) => {
      expect(response?.statusCode).to.equal(200)
      expect(response!.body.clientId).to.equal(persistedClientId)
      expect(request.body).not.to.have.property("professionalId")
      goalId = response!.body.id
    })
    cy.wait("@goals")
    cy.get('[title="Editar meta clínica"]').click()
    cy.get("#clinical-notes").clear().type("Synthetic updated goal")
    cy.findByRole("button", { name: "Salvar Meta Clínica" }).click()
    cy.wait("@saveGoal").then(({ response }) => expect(response!.body.id).to.equal(goalId))
    cy.wait("@goals")
    cy.reload()
    cy.wait("@goals").then(({ response }) => {
      expect(response!.body).to.have.length(1)
      expect(response!.body[0]).to.include({ id: goalId, clinicalNotes: "Synthetic updated goal" })
    })
    cy.findByRole("button", { name: "Detalhes" }).click()
    cy.contains("Synthetic updated goal").should("be.visible")
    cy.findByRole("button", { name: "Close" }).click()
    assertNoClinicalStorage()

    openLabs()
    cy.findByRole("button", { name: "Registrar Novo Laudo" }).click()
    cy.get('[role="dialog"] select').first().select(persistedClientId)
    cy.get('[role="dialog"] input[type="number"]').first().type("89")
    cy.get('[role="dialog"] textarea').type("Synthetic exam")
    cy.intercept("POST", "**/lab-exams").as("createExam")
    cy.findByRole("button", { name: "Registrar Laudo" }).click()
    cy.wait("@createExam").then(({ request, response }) => {
      expect(response?.statusCode).to.equal(201)
      expect(request.body.clientId).to.equal(persistedClientId)
      expect(request.body).not.to.have.property("patientId")
      examId = response!.body.id
    })
    cy.wait("@exams")
    cy.reload()
    cy.wait("@exams").then(({ response }) => expect(response!.body[0].id).to.equal(examId))
    cy.contains("Synthetic exam").should("be.visible")

    cy.findByRole("button", { name: "Emitir Pedido de Exame" }).click()
    cy.get('[role="dialog"] select').first().select(persistedClientId)
    cy.get('[role="dialog"] input[placeholder^="Digitar outro"]').type(printAttack, { parseSpecialCharSequences: false })
    cy.findByRole("button", { name: "Adicionar" }).click()
    cy.get('[role="dialog"] textarea').clear().type(printAttack, { parseSpecialCharSequences: false })
    cy.intercept("POST", "**/lab-orders").as("createOrder")
    cy.findByRole("button", { name: "Registrar Pedido" }).click()
    cy.wait("@createOrder").then(({ response }) => { expect(response?.statusCode).to.equal(201); orderId = response!.body.id })
    cy.wait("@orders")
    cy.reload()
    cy.wait(["@exams", "@orders"]).then(interceptions => expect(interceptions[1].response!.body[0].id).to.equal(orderId))
    cy.contains("button", "Pedidos Emitidos").click()
    cy.contains(printAttack).should("be.visible")
    cy.window().then(browser => {
      // Captura o documento de impressão sem abrir a caixa de impressão do SO.
      const detached = browser.document.implementation.createHTMLDocument("")
      const loadEvents = new browser.EventTarget()
      const print = cy.stub()
      cy.wrap(print).as("print")
      const popup = { document: detached, opener: browser, closed: false, focus: cy.stub(), print, addEventListener: loadEvents.addEventListener.bind(loadEvents) }
      const open = cy.stub(browser, "open").returns(popup as unknown as Window)
      cy.wrap(open).as("openPrint")
      cy.wrap({ detached, loadEvents, popup }).as("printPreview")
    })
    cy.findByRole("button", { name: "Imprimir" }).click()
    cy.get("@openPrint").should("have.been.calledOnce")
    cy.get("@printPreview").then(value => {
      const { detached, loadEvents, popup } = value as unknown as { detached: Document; loadEvents: EventTarget; popup: { opener: Window | null } }
      expect(detached.querySelector("script, svg, img, [onload], [onerror]")).to.be.null
      expect(detached.querySelector(".instructions")?.textContent).to.equal(printAttack)
      expect(popup.opener).to.be.null
      loadEvents.dispatchEvent(new Event("load"))
    })
    cy.get("@print").should("have.been.calledOnce")
    assertNoClinicalStorage()

    cy.intercept("DELETE", "**/lab-orders/*").as("deleteOrder")
    cy.get('[title="Excluir requisição"]').click()
    cy.wait("@deleteOrder").its("response.statusCode").should("eq", 200)
    cy.contains("button", "Laudos & Exames Recebidos").click()
    cy.intercept("DELETE", "**/lab-exams/*").as("deleteExam")
    cy.findByRole("button", { name: "Excluir Laudo" }).click()
    cy.wait("@deleteExam").its("response.statusCode").should("eq", 200)
    cy.contains("Synthetic exam").should("not.exist")
    openGoals()
    cy.findByRole("button", { name: "Detalhes" }).click()
    cy.intercept("DELETE", `**/client-goals/${persistedClientId}`).as("deleteGoal")
    cy.findByRole("button", { name: "Excluir" }).click()
    cy.wait("@deleteGoal").its("response.statusCode").should("eq", 200)
    cy.wait("@goals")
    cy.reload()
    cy.wait("@goals").its("response.body").should("deep.equal", [])
    assertNoClinicalStorage()
  })
  it("keeps failed drafts open, reports no success, and cleans legacy clinical storage", () => {
    cy.visit("/metas", {
      onBeforeLoad(browser) {
        for (const storage of [browser.localStorage, browser.sessionStorage]) {
          storage.setItem("safemove_client_goals_v1_previous-professional", "Synthetic previous goal")
          storage.setItem("safemove_central_lab_exams_v1", "Synthetic previous exam")
          storage.setItem("safemove_issued_lab_orders_v1", "Synthetic previous order")
        }
      },
    })
    cy.findByRole("button", { name: "Pactuar Nova Meta" }).click()
    cy.get("#client-select").select(persistedClientId)
    cy.get("#start-weight").clear().type("90")
    cy.get("#target-weight").clear().type("80")
    cy.get("#clinical-notes").type("Synthetic failed goal")
    cy.intercept("PUT", "**/client-goals/*", { statusCode: 500, body: { message: "Synthetic failure" } }).as("failedGoal")
    cy.findByRole("button", { name: "Salvar Meta Clínica" }).click()
    cy.wait("@failedGoal")
    cy.findByRole("alert").should("contain.text", "Não foi possível salvar a meta")
    cy.get("#clinical-notes").should("have.value", "Synthetic failed goal")
    cy.get('[data-sonner-toast][data-type="success"]').should("not.exist")
    assertNoClinicalStorage()
    cy.findByRole("button", { name: "Cancelar" }).click()

    openLabs()
    cy.findByRole("button", { name: "Registrar Novo Laudo" }).click()
    cy.get('[role="dialog"] select').first().select(persistedClientId)
    cy.get('[role="dialog"] input[type="number"]').first().type("89")
    cy.get('[role="dialog"] textarea').type("Synthetic failed exam")
    cy.intercept("POST", "**/lab-exams", { statusCode: 500, body: { message: "Synthetic failure" } }).as("failedExam")
    cy.findByRole("button", { name: "Registrar Laudo" }).click()
    cy.wait("@failedExam")
    cy.findByRole("alert").should("contain.text", "Não foi possível salvar o exame")
    cy.get('[role="dialog"] textarea').should("have.value", "Synthetic failed exam")
    cy.findByRole("button", { name: "Cancelar" }).click()
    cy.findByRole("button", { name: "Emitir Pedido de Exame" }).click()
    cy.get('[role="dialog"] select').first().select(persistedClientId)
    cy.intercept("POST", "**/lab-orders", { statusCode: 500, body: { message: "Synthetic failure" } }).as("failedOrder")
    cy.findByRole("button", { name: "Registrar Pedido" }).click()
    cy.wait("@failedOrder")
    cy.findByRole("alert").should("contain.text", "Não foi possível salvar o pedido")
    cy.findAllByRole("button", { name: /Imprimir|Copiar|WhatsApp/ }).should("not.exist")
    cy.get('[data-sonner-toast][data-type="success"]').should("not.exist")
    assertNoClinicalStorage()
    cy.request("/api/lab-exams").its("body").should("deep.equal", [])
    cy.request("/api/lab-orders").its("body").should("deep.equal", [])
    cy.request("/api/client-goals").its("body").should("deep.equal", [])
  })
})
