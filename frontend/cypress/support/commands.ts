/// <reference types="cypress" />

Cypress.Commands.add('login', (email = 'user@test.com', password = 'password123') => {
  // Clear cookies to force a fresh login attempt, avoiding "already logged in" ambiguity
  cy.clearCookies();
  cy.visit('/login');
  
  // Ensure we are on the login page
  cy.contains('h1', 'Login').should('be.visible');
  
  cy.get('[data-testid="email"]').clear().type(email);
  cy.get('[data-testid="password"]').clear().type(password);
  cy.get('button[type="submit"]').click();
  
  // Explicitly wait for redirection to Dashboard
  cy.url().should('eq', Cypress.config().baseUrl + '/');
  cy.contains('Dashboard').should('be.visible');
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>
    }
  }
}

export {}
