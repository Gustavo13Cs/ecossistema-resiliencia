describe('Payload seguro do check-in de métricas', () => {
  it('não envia patientId ao marcar uma refeição como feita', () => {
    cy.intercept('GET', '**/auth/me', {
      body: {
        sub: 'patient-e2e',
        role: 'PATIENT',
        name: 'Paciente Teste',
      },
    });
    cy.intercept('GET', '**/diet-plans/user/patient-e2e/active', {
      body: {
        id: 'diet-1',
        title: 'Plano E2E',
        goal: 'Saúde',
        meals: [
          {
            id: 'meal-1',
            name: 'Café da manhã',
            time: '08:00',
            items: [],
          },
        ],
      },
    });
    cy.intercept('GET', '**/metrics/today/patient-e2e', { body: [] });
    cy.intercept('GET', '**/metrics/consistency/patient-e2e', {
      body: {
        percentage: 0,
        activeDays: 0,
        totalLogs: 0,
        history: [],
      },
    });
    cy.intercept('GET', '**/supplements/user/patient-e2e/active', {
      body: null,
    });
    cy.intercept('POST', '**/metrics/checkin', (request) => {
      expect(request.body).to.deep.equal({
        type: 'MEAL',
        itemName: 'Café da manhã',
      });
      request.reply({ statusCode: 201, body: { id: 'tracking-1' } });
    }).as('metricCheckIn');

    cy.visit('http://localhost:3001/paciente');
    cy.contains('button', 'Marcar como Feito').click();
    cy.wait('@metricCheckIn');
  });
});
