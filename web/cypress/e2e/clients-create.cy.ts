describe('Diretório de clientes', () => {
  it('lista clientes ativos e cria um prontuário sem dados de autenticação ou propriedade', () => {
    let newClientRouteRequests = 0
    cy.intercept('GET', '**/auth/me', {
      statusCode: 200,
      body: { sub: 'pro-1', role: 'NUTRITIONIST', name: 'Dra. Ana' },
    })
    cy.intercept(
      {
        method: 'GET',
        pathname: '/clientes/novo',
        query: { _rsc: '*' },
      },
      (request) => {
        newClientRouteRequests += 1
        request.on('before:response', (response) => {
          response.setDelay(4_250)
        })
      },
    ).as('newClientRoute')
    cy.intercept('GET', '**/clients?status=ACTIVE', { body: [] }).as('listClients')
    cy.intercept('POST', '**/clients', (request) => {
      expect(request.body).to.deep.include({
        name: 'Cliente Teste',
        email: 'cliente@example.test',
      })
      expect(request.body).not.to.have.property('password')
      expect(request.body).not.to.have.property('role')
      expect(request.body).not.to.have.property('professionalId')
      request.reply({
        statusCode: 201,
        body: { id: 'client-1', ...request.body, status: 'ACTIVE' },
      })
    }).as('createClient')

    cy.visit('http://localhost:3001/clientes')
    cy.wait('@listClients')
    cy.contains('Nenhum cliente ativo').should('be.visible')
    cy.contains('a', 'Novo cliente').click()
    cy.location('pathname', { timeout: 20_000 }).should('eq', '/clientes/novo')
    cy.wait('@newClientRoute')
    cy.then(() => expect(newClientRouteRequests).to.be.greaterThan(0))
    cy.get('[name="name"]').type('Cliente Teste')
    cy.get('[name="email"]').type('cliente@example.test')
    cy.contains('Senha').should('not.exist')
    cy.contains('button', 'Salvar cliente').click()
    cy.wait('@createClient')
    cy.location('pathname').should('eq', '/clientes')
  })
})
