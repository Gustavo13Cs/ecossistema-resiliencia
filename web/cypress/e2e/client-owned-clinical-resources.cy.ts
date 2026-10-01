const clinicalClientId = '81000000-0000-4000-8000-000000000011'
const clinicalClient = {
  id: clinicalClientId, professionalId: 'pro-1', name: 'Cliente sintético', status: 'ACTIVE',
  email: null, phone: null, birthDate: null, gender: null, goal: null, height: null,
  initialWeight: null, allergies: null, pathologies: null, typicalSleep: null,
  stressLevel: null, foodRelationship: null, psychologyHistory: null, exerciseType: null,
  exerciseFrequency: null, exerciseDuration: null, hasPersonal: null, workActivityLevel: null,
  professionalNotes: null, privacyNotes: null,
  createdAt: '2026-09-30T12:00:00.000Z', updatedAt: '2026-09-30T12:00:00.000Z',
}

function clinicalSession(role: 'NUTRITIONIST' | 'PERSONAL' | 'PHYSIO') {
  cy.intercept('GET', '**/auth/me', { body: { user: { sub: 'pro-1', role, name: 'Profissional sintético' }, csrfToken: 'csrf-e2e' } }).as('auth')
  cy.intercept('GET', `**/clients/${clinicalClientId}`, { body: clinicalClient }).as('client')
  cy.intercept('GET', '**/clients?*', { body: [clinicalClient] })
  cy.intercept('GET', `**/assessments/client/${clinicalClientId}`, { body: [] })
}

function clinicalWrite(path: string) {
  cy.intercept('POST', `**/${path}`, request => {
    expect(request.body.clientId).to.equal(clinicalClientId)
    for (const field of ['userId', 'patientId', 'creatorId', 'professionalId']) expect(request.body).not.to.have.property(field)
    request.reply({ statusCode: 201, body: { ...request.body, id: 'synthetic-record' } })
  }).as('clinicalSave')
}

describe('Contratos clínicos por prontuário Client', () => {
  it('prescreve treino para o Client selecionado', () => {
    clinicalSession('PERSONAL')
    cy.intercept('GET', `**/workouts/client/${clinicalClientId}/active`, { body: null }).as('active')
    clinicalWrite('workouts')
    cy.visit(`/clientes/${clinicalClientId}/novo-treino`)
    cy.wait(['@auth', '@client', '@active'])
    cy.contains('button', 'Finalizar Ficha').click()
    cy.wait('@clinicalSave')
  })
  it('prescreve reabilitação para o Client selecionado', () => {
    clinicalSession('PHYSIO')
    cy.intercept('GET', `**/rehab-plans/client/${clinicalClientId}/active`, { body: null }).as('active')
    clinicalWrite('rehab-plans')
    cy.visit(`/clientes/${clinicalClientId}/nova-reabilitacao`)
    cy.wait(['@auth', '@client', '@active'])
    cy.contains('button', 'Finalizar Protocolo').click()
    cy.wait('@clinicalSave')
  })
  it('registra avaliação fisioterapêutica a partir do prontuário', () => {
    clinicalSession('PHYSIO')
    clinicalWrite('physio-assessments')
    cy.visit(`/clientes/${clinicalClientId}`)
    cy.wait(['@auth', '@client'])
    cy.contains('button', 'Nova avaliação fisioterapêutica').click()
    cy.get('input[placeholder="Ex: Dor no joelho direito ao subir escadas"]').type('Queixa sintética')
    cy.contains('button', 'Salvar Avaliação Fisioterapêutica').click()
    cy.wait('@clinicalSave')
    cy.contains('h2', 'Avaliação Fisioterapêutica').should('not.exist')
  })
  it('registra anamnese no Client selecionado', () => {
    clinicalSession('NUTRITIONIST')
    clinicalWrite('anamneses')
    cy.visit(`/clientes/${clinicalClientId}/nova-anamnese`)
    cy.wait(['@auth', '@client'])
    cy.get('textarea[placeholder="Ex: Apendicite em 2015, asma controlada..."]').type('História sintética')
    cy.contains('button', 'Selar e Guardar').click()
    cy.wait('@clinicalSave')
  })
  it('registra suplementos no Client selecionado', () => {
    clinicalSession('NUTRITIONIST')
    cy.intercept('GET', `**/supplements/client/${clinicalClientId}/active`, { body: null }).as('active')
    clinicalWrite('supplements')
    cy.visit(`/clientes/${clinicalClientId}/nova-suplementacao`)
    cy.wait(['@auth', '@client', '@active'])
    cy.contains('button', 'Adicionar Nova Fórmula').click()
    cy.get('input[placeholder="Nome do Suplemento ou Fórmula"]').clear().type('Fórmula sintética')
    cy.contains('button', 'Finalizar Receita').click()
    cy.wait('@clinicalSave')
  })
  it('registra exame no Client selecionado', () => {
    clinicalSession('NUTRITIONIST')
    cy.intercept('GET', `**/lab-exams/client/${clinicalClientId}`, { body: [] }).as('history')
    clinicalWrite('lab-exams')
    cy.visit(`/clientes/${clinicalClientId}/exames`)
    cy.wait(['@auth', '@history'])
    cy.contains('button', 'Novo Registro').click()
    cy.get('input[type="date"]').type('2026-09-30')
    cy.get('input[placeholder="Ex: Colesterol Total"]').type('Marcador sintético')
    cy.get('input[placeholder="Ex: 180.5"]').type('90')
    cy.get('input[placeholder="Ex: mg/dL"]').type('mg/dL')
    cy.contains('button', 'Salvar Exames').click()
    cy.wait('@clinicalSave')
  })
  it('carrega o overview pela identidade Client sem rota de paciente', () => {
    clinicalSession('PHYSIO')
    cy.intercept('GET', '**/users/*/overview', () => { throw new Error('Legacy overview route used') })
    cy.intercept('GET', `**/clients/${clinicalClientId}/overview`, { body: {
      client: clinicalClient, activeDietPlan: null, activeWorkout: null, activeRehabPlan: null,
      latestAssessment: null, previousAssessment: null, weightDelta: null, latestLabExam: null,
      activeAlerts: [], latestPhysioAssessment: null, conflictWarning: null, recentTimeline: [],
    } }).as('overview')
    cy.visit(`/clientes/${clinicalClientId}/visao-360`)
    cy.wait(['@auth', '@overview'])
    cy.contains('Cliente sintético').should('be.visible')
  })
})
