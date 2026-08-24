describe("Ciclo de vida de clientes", () => {
  it("edita, arquiva e preserva o prontuário sem exclusão", () => {
    let archiveRequests = 0
    let clientFetches = 0
    let clientDetailRouteRequests = 0
    let deleteRequests = 0
    let refetchStarted = false
    let releaseRefetch = () => {}
    const refetchGate = new Promise<void>((resolve) => {
      releaseRefetch = resolve
    })
    cy.intercept("GET", "**/auth/me", {
      statusCode: 200,
      body: { sub: "pro-1", role: "PERSONAL", name: "Prof. Caio" },
    })
    cy.intercept("GET", "**/clients?status=ACTIVE", {
      body: [{ id: "client-1", name: "Ana", status: "ACTIVE", email: null, phone: null }],
    }).as("activeClients")
    cy.intercept(
      {
        method: "GET",
        pathname: "/clientes/client-1",
        query: { _rsc: "*" },
      },
      (request) => {
        clientDetailRouteRequests += 1
        request.on("before:response", (response) => {
          response.setDelay(5_250)
        })
      },
    ).as("clientDetailRoute")
    cy.intercept("GET", "**/clients/client-1", (request) => {
      clientFetches += 1
      if (clientFetches === 1) {
        request.alias = "clientInitial"
        request.reply({ body: { id: "client-1", name: "Ana", status: "ACTIVE", email: null, phone: null } })
        return
      }

      if (clientFetches === 2) {
        request.alias = "clientRefetch"
        refetchStarted = true
        return refetchGate.then(() => {
          request.reply({ body: { id: "client-1", name: "Ana", status: "ACTIVE", email: null, phone: null } })
        })
      }

      request.alias = "clientArchiveRefetch"
      request.reply({ body: { id: "client-1", name: "Ana", status: "ARCHIVED", email: null, phone: null } })
    })
    cy.intercept("PATCH", "**/clients/client-1", (request) => {
      expect(request.body).to.deep.include({ name: "Ana Atualizada" })
      request.reply({
        delay: 1_000,
        statusCode: 200,
        body: { id: "client-1", ...request.body, status: "ACTIVE" },
      })
    }).as("updateClient")
    cy.intercept("PATCH", "**/clients/client-1/status", (request) => {
      archiveRequests += 1
      expect(request.body).to.deep.equal({ status: "ARCHIVED" })
      request.reply({ statusCode: 200, body: { id: "client-1", status: "ARCHIVED" } })
    }).as("archiveClient")
    cy.intercept("DELETE", "**/clients/**", (request) => {
      deleteRequests += 1
      request.reply({ statusCode: 500 })
    }).as("deleteClient")

    cy.visit("http://localhost:3001/clientes")
    cy.wait("@activeClients")
    cy.contains("a", "Ana").click()
    cy.location("pathname", { timeout: 60_000 }).should("eq", "/clientes/client-1")
    cy.wait("@clientDetailRoute")
    cy.then(() => expect(clientDetailRouteRequests).to.be.greaterThan(0))
    cy.wait("@clientInitial")
    cy.get('[name="name"]').clear().type("Ana Atualizada")
    cy.contains("button", "Salvar alterações").click()
    cy.contains("button", "Arquivar cliente").should("be.disabled").click({ force: true })
    cy.then(() => expect(archiveRequests).to.equal(0))
    cy.then(() => expect(deleteRequests).to.equal(0))
    cy.wait("@updateClient")
    cy.wrap(null).should(() => expect(refetchStarted).to.equal(true))
    cy.contains("button", "Arquivar cliente").should("be.disabled")
    cy.then(() => releaseRefetch())
    cy.wait("@clientRefetch")
    cy.contains("button", "Arquivar cliente").should("not.be.disabled")
    cy.contains("button", "Arquivar cliente").click()
    cy.contains("button", "Confirmar arquivamento").click()
    cy.wait("@archiveClient")
    cy.location("pathname").should("eq", "/clientes")
    cy.contains("Excluir cliente").should("not.exist")
    cy.then(() => expect(archiveRequests).to.equal(1))
    cy.then(() => expect(deleteRequests).to.equal(0))
  })

  it("restaura um cliente arquivado sem pedir exclusão", () => {
    let archivedFetches = 0
    let restoreRequests = 0
    let deleteRequests = 0
    cy.intercept("GET", "**/auth/me", {
      statusCode: 200,
      body: { sub: "pro-1", role: "PHYSIO", name: "Dra. Lia" },
    })
    cy.intercept("GET", "**/clients?status=ACTIVE", { body: [] }).as("activeClients")
    cy.intercept("GET", "**/clients?status=ARCHIVED", (request) => {
      archivedFetches += 1
      request.reply({
        delay: archivedFetches === 1 ? 0 : 1_000,
        body: [{ id: "client-2", name: "Bia", status: "ARCHIVED", email: null, phone: null }],
      })
    }).as("archivedClients")
    cy.intercept("PATCH", "**/clients/client-2/status", (request) => {
      restoreRequests += 1
      expect(request.body).to.deep.equal({ status: "ACTIVE" })
      request.reply({ statusCode: 200, body: { id: "client-2", status: "ACTIVE" } })
    }).as("restoreClient")
    cy.intercept("DELETE", "**/clients/**", (request) => {
      deleteRequests += 1
      request.reply({ statusCode: 500 })
    }).as("deleteClient")

    cy.visit("http://localhost:3001/clientes")
    cy.wait("@activeClients")
    cy.contains("button", "Arquivados").click()
    cy.wait("@archivedClients")
    cy.contains("Bia").should("be.visible")
    cy.contains("button", "Restaurar cliente").click()
    cy.wait("@restoreClient")
    cy.wait("@archivedClients")
    cy.contains("Cliente restaurado com sucesso.").should("be.visible")
    cy.contains("Excluir cliente").should("not.exist")
    cy.then(() => expect(restoreRequests).to.equal(1))
    cy.then(() => expect(deleteRequests).to.equal(0))
  })
})
