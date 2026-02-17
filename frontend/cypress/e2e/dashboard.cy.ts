describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  it('displays summary cards', () => {
    cy.contains('Total Active');
    cy.contains('Monthly Cost');
    cy.contains('Yearly Cost');
  });

  it('updates totals when subscriptions change', () => {
    // Get initial values - we might need to parse them but let's just check for change
    cy.get('.summary-card').contains('Monthly Cost').parent().find('.summary-value').then(($val) => {
      const initialMonthly = $val.text();

      // Add a subscription
      cy.visit('/subscriptions');
      cy.contains('Add Subscription').click();
      cy.get('input[required]').first().type('Dashboard Test');
      cy.get('input[type="number"]').type('1000'); // $10.00
      cy.get('select').select('monthly');
      cy.get('input[type="date"]').type('2026-01-01');
      cy.contains('button', 'Create').click();
      cy.contains('h1', 'Active Subscriptions');
      cy.contains('Dashboard Test').should('be.visible');

      // Go back to dashboard
      cy.visit('/');
      cy.contains('h1', 'Dashboard');
      cy.contains('h2', 'Recent Active Subscriptions');
      cy.contains('No active subscriptions found.').should('not.exist');
      
      cy.get('.summary-card').contains('Monthly Cost').parent().find('.summary-value').should(($newVal) => {
        expect($newVal.text()).to.not.equal(initialMonthly);
      });

      // Cleanup
      cy.visit('/subscriptions');
      cy.on('window:confirm', () => true);
      cy.contains('tr', 'Dashboard Test').within(() => {
        cy.contains('Delete').click();
      });
    });
  });
});
