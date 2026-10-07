interface AuditRow { clientId: string; sessionId: string | null; domain: string }
interface AuditPage { items: AuditRow[]; nextCursor: string | null }

const password = "SafeMove-E2E-2026!"
const origin = () => new URL(String(Cypress.config("baseUrl"))).origin

function login(email: string) {
  cy.visit("/auth/login")
  cy.findByLabelText("E-mail").type(email)
  cy.findByLabelText("Senha").type(password, { log: false })
  cy.findByRole("button", { name: "Entrar" }).click()
  cy.location("pathname").should("eq", "/home")
}

describe("Histórico de acessos com API e RLS reais", () => {
  it("consulta a própria base, não revela filtro estrangeiro e troca de conta sem reutilizar dados", () => {
    const suffix = Date.now()
    const emailA = `audit-a-${suffix}@e2e.test`
    const emailB = `audit-b-${suffix}@e2e.test`
    let clientA = ""
    let sessionA = ""

    for (const [name, email] of [["Auditoria A", emailA], ["Auditoria B", emailB]]) {
      cy.request({
        method: "POST", url: "/api/auth/register", log: false,
        headers: { Origin: origin() },
        body: { name, email, password, role: "NUTRITIONIST" },
      }).its("status").should("eq", 201)
    }

    login(emailA)
    cy.request<{ csrfToken: string }>("/api/auth/me").then(({ body }) => {
      cy.request<{ id: string }>({
        method: "POST", url: "/api/clients",
        headers: { Origin: origin(), "X-CSRF-Token": body.csrfToken },
        body: { name: "Prontuário sintético auditoria A" },
      }).then(({ body: client }) => {
        clientA = client.id
        cy.request(`/api/clients/${clientA}/overview`).its("status").should("eq", 200)
      })
    })
    cy.intercept("GET", "**/api/read-audit*").as("audit")
    cy.findByRole("navigation", { name: "Navegação principal" }).within(() => {
      cy.findByRole("link", { name: "Histórico de acessos" }).click()
    })
    cy.wait("@audit").then(({ response }) => {
      expect(response?.statusCode).to.eq(200)
      expect(response?.headers["cache-control"]).to.contain("no-store")
      const data = response?.body as AuditPage
      expect(data.items.every(row => row.clientId === clientA)).to.eq(true)
      sessionA = data.items.find(row => row.sessionId)?.sessionId ?? ""
      expect(sessionA).not.to.eq("")
    })
    cy.findByRole("heading", { name: "Histórico de acessos" }).should("be.visible")
    cy.findByText("Visão completa").should("be.visible")
    cy.then(() => cy.get("#audit-client").type(clientA))
    cy.findByRole("button", { name: "Filtrar" }).click()
    cy.wait("@audit").then(({ request }) => expect(request.query.clientId).to.eq(clientA))
    cy.then(() => cy.get(`main a[href="/clientes/${clientA}"]`).should("exist"))
    cy.then(() => cy.get("main").should("not.contain.text", sessionA))
    cy.window().then(win => {
      const stored = JSON.stringify({ ...win.localStorage, ...win.sessionStorage })
      expect(stored).not.to.contain(clientA)
      expect(stored).not.to.contain(sessionA)
    })

    cy.findByRole("button", { name: "Abrir menu da conta" }).click()
    cy.findByRole("button", { name: "Sair" }).click()
    cy.location("pathname").should("eq", "/auth/login")
    login(emailB)
    cy.visit("/auditoria")
    cy.wait("@audit").then(({ response }) => {
      expect(response?.statusCode).to.eq(200)
      expect((response?.body as AuditPage).items).to.have.length(0)
    })
    cy.findByText("Nenhum acesso encontrado").should("be.visible")
    cy.then(() => cy.get(`main a[href="/clientes/${clientA}"]`).should("not.exist"))

    cy.then(() => cy.get("#audit-client").type(clientA))
    cy.findByRole("button", { name: "Filtrar" }).click()
    cy.wait("@audit").then(({ response }) => { expect(response?.statusCode).to.eq(200); expect((response?.body as AuditPage).items).to.have.length(0) })
    cy.findByText("Nenhum acesso encontrado").should("be.visible")
    cy.get("#audit-client").clear()
    cy.findByRole("button", { name: "Filtrar" }).click()
    cy.findByText("Nenhum acesso encontrado").should("be.visible")
    cy.findByRole("button", { name: "Atualizar" }).click()
    cy.wait("@audit").its("response.statusCode").should("eq", 200)
    cy.findByText("Nenhum acesso encontrado").should("be.visible")

    cy.viewport(390, 844)
    cy.get("#audit-client").should("be.visible")
    cy.document().then(doc => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth)
    })
  })
})
export {}
