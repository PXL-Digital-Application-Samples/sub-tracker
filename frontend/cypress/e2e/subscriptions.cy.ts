describe('Subscriptions', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/subscriptions');
    cy.contains('h1', 'Active Subscriptions');
    cy.contains('Loading...').should('not.exist');
  });

  it('displays active subscriptions', () => {
    cy.contains('Netflix', { timeout: 10000 });
    cy.contains('Spotify');
  });

  it('adds a new subscription', () => {
    cy.contains('Add Subscription').click();
    cy.get('input[required]').first().type('Cypress Test Service');
    cy.get('input[type="number"]').type('9.99');
    cy.get('select').select('monthly');
    cy.get('input[type="date"]').type('2026-01-01');
    cy.contains('button', 'Create').click();
    cy.contains('Cypress Test Service');
  });

  it('edits an existing subscription', () => {
    cy.contains('Netflix', { timeout: 10000 });
    
    // Force click to avoid "hidden from view" errors
    cy.contains('tr', 'Netflix').within(() => {
      cy.contains('Edit').click({ force: true });
    });

    cy.get('input[required]').first().clear().type('Netflix Updated');
    cy.get('input[type="number"]').clear().type('15.99');
    cy.contains('button', 'Save').click();

    cy.contains('Netflix Updated');
    cy.contains('€15.99');
  });

  it('cancels a subscription', () => {
    cy.contains('Spotify', { timeout: 10000 });

    cy.on('window:confirm', () => true);

    cy.contains('tr', 'Spotify').within(() => {
      cy.contains('Cancel').click({ force: true });
    });

    cy.contains('Spotify').should('not.exist');

    cy.visit('/history');
    cy.contains('Spotify');
  });

  it('deletes a subscription', () => {
    // Add a throwaway sub to delete
    cy.contains('Add Subscription').click();
    cy.get('input[required]').first().type('To Be Deleted');
    cy.get('input[type="number"]').type('100');
    cy.get('select').select('monthly');
    cy.get('input[type="date"]').type('2026-01-01');
    cy.contains('button', 'Create').click();
    cy.contains('To Be Deleted');

    cy.on('window:confirm', () => true);

    cy.contains('tr', 'To Be Deleted').within(() => {
      cy.contains('Delete').click({ force: true });
    });

    cy.contains('To Be Deleted').should('not.exist');
  });
});
