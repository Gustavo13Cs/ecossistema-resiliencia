describe('Cadastro profissional', () => {
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
    cy.contains('button', 'Fisioterapeuta').click()
    cy.get('input[name="name"]').type('Dra. Ana')
    cy.get('input[name="email"]').type('ana@example.test')
    cy.get('input[name="password"]').type('12345678')
    cy.contains('button', 'Criar conta').click()
    cy.wait('@register')
  })
})
