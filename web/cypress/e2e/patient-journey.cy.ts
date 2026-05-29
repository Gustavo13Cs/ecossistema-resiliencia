describe('Jornada do Paciente - Perfil e Gamificação', () => {
  
  // O aquecimento do robô: indo na porta certa!
  beforeEach(() => {
    cy.visit('http://localhost:3001/auth/login')
    
    cy.get('input[type="email"]').type('gustavocunha0401@gmail.com') 
    cy.get('input[type="password"]').type('889447Gus@') 
    cy.get('button[type="submit"]').click()
    
    // Confirma que a porta abriu e ele entrou no dashboard
    cy.url().should('include', '/paciente')
  })

  it('Deve atualizar o peso no Perfil e recalcular a água na Home', () => {
    // 🌟 ADICIONE O { force: true } AQUI:
    cy.contains('Perfil').click({ force: true })
    cy.url().should('include', '/paciente/perfil')

    cy.get('input[name="initialWeight"]').clear().type('80')
    cy.contains('Guardar Perfil').click()

    cy.contains('Perfil atualizado com sucesso!').should('be.visible')

    // 🌟 ADICIONE O { force: true } AQUI TAMBÉM:
    cy.contains('Início').click({ force: true })
    cy.url().should('include', '/paciente')

    // Verifica a matemática da hidratação
    cy.contains('2.8L').should('be.visible')
  })

  it('Deve permitir beber água e gamificar a barra', () => {
    cy.get('button[title="Beber 250ml"]').click()
    cy.contains('Meta de Água').parent().parent().invoke('text').should('not.match', /^0\.0L/)
  })
})