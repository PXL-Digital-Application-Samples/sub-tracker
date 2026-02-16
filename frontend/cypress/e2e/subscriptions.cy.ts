describe('Subscriptions', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.visit('/subscriptions');
    cy.contains('h1', 'Active Subscriptions');
  });

  it('displays active subscriptions', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.error').length) {
        cy.log('ERROR FOUND ON PAGE:', $body.find('.error').text());
      }
    });
    // Wait longer for the data to load
    cy.contains('Netflix', { timeout: 10000 });
    cy.contains('Spotify');
  });

  it('adds a new subscription', () => {
    cy.contains('Add Subscription').click();
    cy.get('input[required]').first().type('Cypress Test Service');
    cy.get('input[type="number"]').type('999');
    cy.get('select').select('monthly');
    cy.get('input[type="date"]').type('2026-01-01');
    cy.contains('Create').click();
    cy.contains('Cypress Test Service');
  });
});
