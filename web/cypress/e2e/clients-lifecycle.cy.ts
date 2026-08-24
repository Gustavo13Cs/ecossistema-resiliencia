describe("Ciclo de vida de clientes", () => {
  it("edita, arquiva e preserva o prontuário sem exclusão", () => {
    cy.intercept("GET", "**/auth/me", {
      statusCode: 200,
      body: { sub: "pro-1", role: "PERSONAL", name: "Prof. Caio" },
    })
    cy.intercept("GET", "**/clients?status=ACTIVE", {
      body: [{ id: "client-1", name: "Ana", status: "ACTIVE", email: null, phone: null }],
    }).as("activeClients")
    cy.intercept("GET", "**/clients/client-1", {
      body: { id: "client-1", name: "Ana", status: "ACTIVE", email: null, phone: null },
    }).as("client")
    cy.intercept("PATCH", "**/clients/client-1", (request) => {
      expect(request.body).to.deep.include({ name: "Ana Atualizada" })
      request.reply({ statusCode: 200, body: { id: "client-1", ...request.body, status: "ACTIVE" } })
    }).as("updateClient")
    cy.intercept("PATCH", "**/clients/client-1/status", (request) => {
      expect(request.body).to.deep.equal({ status: "ARCHIVED" })
      request.reply({ statusCode: 200, body: { id: "client-1", status: "ARCHIVED" } })
    }).as("archiveClient")

    cy.visit("http://localhost:3001/clientes")
    cy.wait("@activeClients")
    cy.contains("a", "Ana").click()
    cy.wait("@client")
    cy.get('[name="name"]').clear().type("Ana Atualizada")
    cy.contains("button", "Salvar alterações").click()
    cy.wait("@updateClient")
    cy.contains("button", "Arquivar cliente").click()
    cy.contains("button", "Confirmar arquivamento").click()
    cy.wait("@archiveClient")
    cy.contains("Excluir cliente").should("not.exist")
  })

  it("restaura um cliente arquivado sem pedir exclusão", () => {
    cy.intercept("GET", "**/auth/me", {
      statusCode: 200,
      body: { sub: "pro-1", role: "PHYSIO", name: "Dra. Lia" },
    })
    cy.intercept("GET", "**/clients?status=ACTIVE", { body: [] }).as("activeClients")
    cy.intercept("GET", "**/clients?status=ARCHIVED", {
      body: [{ id: "client-2", name: "Bia", status: "ARCHIVED", email: null, phone: null }],
    }).as("archivedClients")
    cy.intercept("PATCH", "**/clients/client-2/status", (request) => {
      expect(request.body).to.deep.equal({ status: "ACTIVE" })
      request.reply({ statusCode: 200, body: { id: "client-2", status: "ACTIVE" } })
    }).as("restoreClient")

    cy.visit("http://localhost:3001/clientes")
    cy.wait("@activeClients")
    cy.contains("button", "Arquivados").click()
    cy.wait("@archivedClients")
    cy.contains("Bia").should("be.visible")
    cy.contains("button", "Restaurar cliente").click()
    cy.wait("@restoreClient")
    cy.contains("Excluir cliente").should("not.exist")
  })
})
