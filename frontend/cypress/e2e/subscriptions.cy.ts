describe('Subscriptions', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.visit('/subscriptions');
  });

  it('displays active subscriptions', () => {
    cy.contains('Netflix');
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
