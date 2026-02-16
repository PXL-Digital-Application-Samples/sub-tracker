describe('Authentication', () => {
  it('redirects to login when not authenticated', () => {
    cy.visit('/');
    cy.url().should('include', '/login');
  });

  it('logs in with valid credentials', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.contains('Dashboard');
  });

  it('shows error with invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('wrong@test.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid credentials');
  });

  it('logs out successfully', () => {
    // login first
    cy.visit('/login');
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    cy.get('.logout-btn').click();
    cy.url().should('include', '/login');
  });
});
