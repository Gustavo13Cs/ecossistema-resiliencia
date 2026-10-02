const privateClient = "41000000-0000-4000-8000-000000000001"

function expireAccessCookie() {
  cy.getCookie("access_token").then((cookie) => {
    expect(cookie?.httpOnly).to.equal(true)
    cy.clearCookie("access_token")
    cy.getCookie("access_token").should("be.null")
  })
}

function expectNoStoredCredentials() {
  cy.window().then((browserWindow) => {
    for (const storage of [browserWindow.localStorage, browserWindow.sessionStorage]) {
      const values = Array.from({ length: storage.length }, (_, index) => {
        const key = storage.key(index)
        return key ? `${key}=${storage.getItem(key)}` : ""
      }).join("\n")
      expect(values).not.to.match(/access_token|refresh_token|csrf_token|Cliente privado A|safemove_client_goals|safemove_central_lab_exams|safemove_issued_lab_orders/i)
    }
  })
}

describe("Revocable sessions over real browser HTTP", () => {
  it("recovers expired access on reload, coalesces concurrent recovery and revokes on logout", () => {
    cy.loginAs("NUTRITIONIST")
    cy.visit(`/clientes/${privateClient}`)
    cy.findByText("Cliente privado A").should("be.visible")
    cy.getCookie("refresh_token").should("include", { httpOnly: true, path: "/api/auth" })
    cy.window().then((browserWindow) => {
      expect(browserWindow.document.cookie).not.to.match(/access_token|refresh_token|csrf_token/)
    })

    cy.intercept("POST", "**/api/auth/refresh").as("refresh")
    expireAccessCookie()
    cy.reload()
    cy.wait("@refresh").its("response.statusCode").should("eq", 200)
    cy.findByText("Cliente privado A").should("be.visible")
    cy.location("pathname").should("eq", `/clientes/${privateClient}`)
    cy.getCookie("access_token").should("include", { httpOnly: true })
    expectNoStoredCredentials()

    // Client-side navigation starts both aggregate queries under the same
    // provider/API instance. Both responses come from the real Nest API.
    cy.intercept("GET", "**/api/lab-exams").as("exams")
    cy.intercept("GET", "**/api/lab-orders").as("orders")
    expireAccessCookie()
    cy.get('a[href="/exames"]').filter(":visible").first().click()
    cy.wait("@exams").its("response.statusCode").should("eq", 401)
    cy.wait("@orders").its("response.statusCode").should("eq", 401)
    cy.wait("@refresh").its("response.statusCode").should("eq", 200)
    cy.wait("@exams").its("response.statusCode").should("eq", 200)
    cy.wait("@orders").its("response.statusCode").should("eq", 200)
    cy.get("@refresh.all").should("have.length", 2)
    cy.location("pathname").should("eq", "/exames")

    let oldAccess = ""
    let oldRefresh = ""
    let csrf = ""
    cy.getCookie("access_token").then((cookie) => { oldAccess = cookie!.value })
    cy.getCookie("refresh_token").then((cookie) => { oldRefresh = cookie!.value })
    cy.request("/api/auth/csrf").then(({ body }: { body: { csrfToken: string } }) => { csrf = body.csrfToken })
    cy.intercept("POST", "**/api/auth/logout").as("logout")
    cy.findByRole("button", { name: "Abrir menu da conta" }).click()
    cy.findByRole("button", { name: "Sair" }).click()
    cy.wait("@logout").its("response.statusCode").should("eq", 200)
    cy.location("pathname").should("eq", "/auth/login")
    for (const name of ["access_token", "refresh_token", "csrf_token"]) cy.getCookie(name).should("be.null")
    cy.then(() => {
      cy.request({ url: "/api/auth/me", failOnStatusCode: false, headers: { Authorization: `Bearer ${oldAccess}` } }).its("status").should("eq", 401)
      cy.request({ method: "POST", url: "/api/auth/refresh", failOnStatusCode: false, headers: { Origin: "http://localhost:3001", "X-CSRF-Token": csrf, Cookie: `refresh_token=${oldRefresh}; csrf_token=${csrf}` } }).its("status").should("eq", 401)
    })
    cy.visit(`/clientes/${privateClient}`)
    cy.location("pathname").should("eq", "/auth/login")
    cy.contains("Cliente privado A").should("not.exist")
    expectNoStoredCredentials()
  })
})
