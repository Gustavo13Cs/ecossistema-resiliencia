describe('Cadastro profissional', () => {
  it('encerra a sessão com papel desconhecido antes de exibir rota protegida', () => {
    cy.intercept('GET', '**/auth/me', {
      statusCode: 200,
      body: { sub: 'unknown-e2e', role: 'UNKNOWN', name: 'Papel desconhecido' },
    })
    cy.intercept('POST', '**/auth/logout', { statusCode: 201 }).as('logout')

    cy.visit('http://localhost:3001/membros')
    cy.wait('@logout')
    cy.location('pathname', { timeout: 20_000 }).should('eq', '/auth/login')
  })

  it('preserva a sessão ADMIN e oferece somente a navegação interna mínima', () => {
    let logoutRequests = 0
    let adminHomeRouteRequests = 0
    let clinicalRequests = 0
    cy.intercept('GET', '**/auth/me', {
      statusCode: 200,
      body: { sub: 'admin-e2e', role: 'ADMIN', name: 'Admin SafeMove' },
    })
    cy.intercept('POST', '**/auth/logout', (request) => {
      logoutRequests += 1
      request.reply({ statusCode: 201 })
    })
    cy.intercept('GET', '**/users', (request) => {
      clinicalRequests += 1
      request.reply({ statusCode: 200, body: [] })
    })
    cy.intercept(
      {
        method: 'GET',
        pathname: '/home',
        query: { _rsc: '*' },
      },
      (request) => {
        adminHomeRouteRequests += 1
        request.continue()
      },
    ).as('adminHomeRoute')

    cy.visit('http://localhost:3001/membros')
    cy.location('pathname', { timeout: 20_000 }).should('eq', '/home')
    cy.wait('@adminHomeRoute')
    cy.then(() => expect(adminHomeRouteRequests).to.be.greaterThan(0))
    cy.contains('Área do Administrador', { timeout: 20_000 }).should('be.visible')
    cy.get('aside').within(() => {
      cy.contains('Início').should('be.visible')
      cy.contains('Clientes').should('not.exist')
    })
    cy.then(() => expect(logoutRequests).to.equal(0))
    cy.then(() => expect(clinicalRequests).to.equal(0))
  })

  it('oferece uma atuação obrigatória e nunca envia PATIENT', () => {
    cy.intercept('POST', '**/auth/register', (request) => {
      expect(request.body).to.deep.include({
        name: 'Dra. Ana',
        email: 'ana@example.test',
        role: 'PHYSIO',
      })
      expect(request.body.role).not.to.equal('PATIENT')
      request.reply({ statusCode: 201, body: { id: 'pro-1' } })
    }).as('register')

    cy.visit('http://localhost:3001/auth/register')
    cy.contains('Paciente / Aluno').should('not.exist')
    cy.contains('button', 'Fisioterapeuta', { timeout: 20_000 })
      .should('be.visible')
      .click({ timeout: 20_000 })
    cy.get('input[name="name"]').type('Dra. Ana')
    cy.get('input[name="email"]').type('ana@example.test')
    cy.get('input[name="password"]').type('12345678')
    cy.contains('button', 'Criar conta').click()
    cy.wait('@register')
  })
})
