describe('User Profile', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/profile');
  });

  it('displays user profile information', () => {
    cy.get('input[name="email"]').should('have.value', 'user@test.com');
    cy.get('input[name="first_name"]').should('have.value', 'Test');
    cy.get('input[name="last_name"]').should('have.value', 'User');
  });

  it('updates user profile information', () => {
    cy.get('input[name="first_name"]').clear().type('UpdatedName');
    cy.get('input[name="zipcode"]').clear().type('54321');
    cy.get('button[type="submit"]').click();
    
    cy.contains('Profile updated successfully').should('be.visible');
    
    // Refresh and check values
    cy.visit('/profile');
    cy.get('input[name="first_name"]').should('have.value', 'UpdatedName');
    cy.get('input[name="zipcode"]').should('have.value', '54321');

    // Cleanup
    cy.get('input[name="first_name"]').clear().type('Test');
    cy.get('input[name="zipcode"]').clear().type('1000');
    cy.get('button[type="submit"]').click();
  });

  it('changes user password', () => {
    cy.visit('/profile/password');
    cy.get('[data-testid="old-password"]').type('password123');
    cy.get('input[name="newPassword"]').type('newpassword123');
    cy.get('input[name="confirmPassword"]').type('newpassword123');
    cy.get('button[type="submit"]').click({ force: true });

    cy.contains('Password changed successfully').should('be.visible');

    // Test new password by logging out and in
    cy.get('.logout-btn').click();
    cy.login('user@test.com', 'newpassword123');
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // Restore original password for other tests
    cy.visit('/profile/password');
    cy.get('input[name="oldPassword"]').type('newpassword123');
    cy.get('input[name="newPassword"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('password123');
    cy.get('button[type="submit"]').click();
  });
});
