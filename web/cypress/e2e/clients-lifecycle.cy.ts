describe("Ciclo de vida de clientes", () => {
  const clientFixture = (name: string, updatedAt: string) => ({
    id: "client-snapshot",
    professionalId: "pro-1",
    name,
    email: null,
    phone: null,
    birthDate: null,
    gender: null,
    goal: null,
    height: null,
    initialWeight: null,
    allergies: null,
    pathologies: null,
    typicalSleep: null,
    stressLevel: null,
    foodRelationship: null,
    psychologyHistory: null,
    exerciseType: null,
    exerciseFrequency: null,
    exerciseDuration: null,
    hasPersonal: null,
    workActivityLevel: null,
    professionalNotes: null,
    privacyNotes: null,
    status: "ACTIVE",
    createdAt: "2026-08-24T11:00:00.000Z",
    updatedAt,
  })

  it("mantém campos e versão no mesmo snapshot durante refetch e conflito", () => {
    let clientFetches = 0
    let updateRequests = 0

    cy.intercept("GET", "**/auth/me", {
      statusCode: 200,
      body: { sub: "pro-1", role: "NUTRITIONIST", name: "Dra. Ana" },
    })
    cy.intercept("GET", "**/clients/client-snapshot", (request) => {
      clientFetches += 1

      if (clientFetches === 1) {
        request.alias = "snapshotInitial"
        request.reply({ body: clientFixture("Ana inicial", "2026-08-24T12:00:00.000Z") })
        return
      }

      if (clientFetches === 2) {
        request.alias = "snapshotExternalRefetch"
        request.reply({ body: clientFixture("Ana externa", "2026-08-24T12:00:02.000Z") })
        return
      }

      if (clientFetches === 3) {
        request.alias = "snapshotManualReload"
        request.reply({ body: clientFixture("Ana mais recente", "2026-08-24T12:00:03.000Z") })
        return
      }

      request.alias = "snapshotAfterSaveRefetch"
      request.reply({ body: clientFixture("Após recarregar", "2026-08-24T12:00:04.000Z") })
    })
    cy.intercept("PATCH", "**/clients/client-snapshot", (request) => {
      updateRequests += 1

      if (updateRequests === 1) {
        expect(request.body).to.deep.include({
          name: "Rascunho 1",
          expectedUpdatedAt: "2026-08-24T12:00:00.000Z",
        })
        request.reply({
          statusCode: 200,
          body: clientFixture("Rascunho 1", "2026-08-24T12:00:01.000Z"),
        })
        return
      }

      if (updateRequests === 2) {
        expect(request.body).to.deep.include({
          name: "Rascunho 2",
          expectedUpdatedAt: "2026-08-24T12:00:01.000Z",
        })
        request.reply({
          statusCode: 409,
          body: { message: "O prontuário foi alterado em outra sessão." },
        })
        return
      }

      expect(request.body).to.deep.include({
        name: "Após recarregar",
        expectedUpdatedAt: "2026-08-24T12:00:03.000Z",
      })
      request.reply({
        statusCode: 200,
        body: clientFixture("Após recarregar", "2026-08-24T12:00:04.000Z"),
      })
    }).as("snapshotUpdate")

    cy.visit("http://localhost:3001/clientes/client-snapshot")
    cy.wait("@snapshotInitial")
    cy.get('[name="name"]').should("have.value", "Ana inicial").clear().type("Rascunho 1")
    cy.contains("button", "Salvar alterações").click()
    cy.wait("@snapshotUpdate")
    cy.wait("@snapshotExternalRefetch")
    cy.get('[name="name"]').should("have.value", "Rascunho 1").clear().type("Rascunho 2")
    cy.contains("button", "Salvar alterações").should("not.be.disabled").click()
    cy.wait("@snapshotUpdate")
    cy.contains("O prontuário mudou desde que você abriu esta tela.").should("be.visible")
    cy.contains("button", "Carregar versão mais recente").click()
    cy.wait("@snapshotManualReload")
    cy.get('[name="name"]').should("have.value", "Ana mais recente").clear().type("Após recarregar")
    cy.contains("button", "Salvar alterações").click()
    cy.wait("@snapshotUpdate")
    cy.wait("@snapshotAfterSaveRefetch")
    cy.then(() => expect(updateRequests).to.equal(3))
  })

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
      body: [{ id: "client-1", name: "Ana", status: "ACTIVE", email: null, phone: null, updatedAt: "2026-08-24T12:00:00.000Z" }],
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
        request.reply({ body: { id: "client-1", name: "Ana", status: "ACTIVE", email: null, phone: null, updatedAt: "2026-08-24T12:00:00.000Z" } })
        return
      }

      if (clientFetches === 2) {
        request.alias = "clientRefetch"
        refetchStarted = true
        return refetchGate.then(() => {
          request.reply({ body: { id: "client-1", name: "Ana", status: "ACTIVE", email: null, phone: null, updatedAt: "2026-08-24T12:00:01.000Z" } })
        })
      }

      request.alias = "clientArchiveRefetch"
      request.reply({ body: { id: "client-1", name: "Ana", status: "ARCHIVED", email: null, phone: null, updatedAt: "2026-08-24T12:00:02.000Z" } })
    })
    cy.intercept("PATCH", "**/clients/client-1", (request) => {
      expect(request.body).to.deep.include({
        name: "Ana Atualizada",
        expectedUpdatedAt: "2026-08-24T12:00:00.000Z",
      })
      request.reply({
        delay: 1_000,
        statusCode: 200,
        body: { id: "client-1", ...request.body, status: "ACTIVE", updatedAt: "2026-08-24T12:00:01.000Z" },
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
    cy.location("pathname", { timeout: 20_000 }).should("eq", "/clientes")
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
    cy.intercept("GET", "**/clients/client-2", {
      body: {
        id: "client-2",
        name: "Bia",
        status: "ARCHIVED",
        email: null,
        phone: null,
        updatedAt: "2026-08-24T12:00:00.000Z",
      },
    }).as("archivedClientDetail")
    cy.intercept("GET", "**/clients?status=ARCHIVED", (request) => {
      archivedFetches += 1
      request.reply({
        delay: archivedFetches === 1 ? 0 : 1_000,
        body: [{ id: "client-2", name: "Bia", status: "ARCHIVED", email: null, phone: null, updatedAt: "2026-08-24T12:00:00.000Z" }],
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
    cy.contains("button", "Restaurar cliente", { timeout: 20_000 })
      .should("be.visible")
      .then(($button) => {
        const button = $button[0]
        button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
        button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
      })
    cy.wait("@restoreClient")
    cy.wait("@archivedClients")
    cy.contains("Cliente restaurado com sucesso.", { timeout: 20_000 }).should("be.visible")
    cy.contains("Excluir cliente").should("not.exist")
    cy.then(() => expect(restoreRequests).to.equal(1))
    cy.then(() => expect(deleteRequests).to.equal(0))

    cy.visit("http://localhost:3001/clientes/client-2")
    cy.wait("@archivedClientDetail")
    cy.contains("Cliente arquivado").should("be.visible")
    cy.contains("button", "Arquivar cliente").should("not.exist")
  })
})
