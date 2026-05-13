describe('Fluxo de Autenticação e Redirecionamento', () => {
  
  beforeEach(() => {
    cy.visit('http://localhost:3001/auth/login')
  })

  it('Deve redirecionar um Paciente para o App Mobile (/paciente)', () => {
    // 1. O robô procura o campo de e-mail e digita
    // ⚠️ ATENÇÃO: Troque este e-mail pelo e-mail real que você cadastrou para o Gustavo!
    cy.get('input[type="email"]').type('gustavocunha0401@gmail.com') 
    
    // 2. O robô procura o campo de senha e digita
    // ⚠️ ATENÇÃO: Troque pela senha que você usou no cadastro!
    cy.get('input[type="password"]').type('889447Gus@') 

    // 3. O robô clica no botão de entrar
    cy.get('button[type="submit"]').click()

    // 4. A GRANDE VERIFICAÇÃO: O robô confere se a URL mudou para /paciente
    cy.url().should('include', '/paciente')
    
    // 5. Opcional: Verifica se a palavra "Bom dia", "Boa tarde" ou "Meta de Água" aparece na tela
    cy.contains('Meta de Água').should('be.visible')
  })

})