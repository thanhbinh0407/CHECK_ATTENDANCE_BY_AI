/**
 * E2E Tests for Payroll System using Cypress
 * Test scenarios: Dashboard → Create → Edit → Approve → Mark Paid
 */

describe('Payroll Management System E2E Tests', () => {
  const baseUrl = 'http://localhost:5173';
  const adminUser = {
    email: 'admin@test.com',
    password: 'password123'
  };
  const hrUser = {
    email: 'hr@test.com',
    password: 'password123'
  };
  const managerUser = {
    email: 'manager@test.com',
    password: 'password123'
  };

  beforeEach(() => {
    cy.visit(`${baseUrl}/login`);
  });

  describe('User Authentication', () => {
    it('should login with valid credentials', () => {
      cy.get('[data-testid="email-input"]').type(adminUser.email);
      cy.get('[data-testid="password-input"]').type(adminUser.password);
      cy.get('[data-testid="login-button"]').click();
      cy.url().should('include', '/dashboard');
    });

    it('should show error with invalid credentials', () => {
      cy.get('[data-testid="email-input"]').type('invalid@test.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();
      cy.get('[data-testid="error-message"]').should('contain', 'Invalid');
    });

    it('should logout successfully', () => {
      cy.loginAs(adminUser);
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Payroll Dashboard', () => {
    beforeEach(() => {
      cy.loginAs(adminUser);
      cy.visit(`${baseUrl}/payroll/dashboard`);
    });

    it('should display payroll dashboard with data', () => {
      cy.get('[data-testid="dashboard-title"]').should('contain', 'Bảng Lương');
      cy.get('[data-testid="status-card"]').should('have.length', 4);
      cy.get('[data-testid="payroll-table"]').should('be.visible');
    });

    it('should filter payrolls by month', () => {
      cy.get('[data-testid="month-select"]').select('1');
      cy.get('[data-testid="payroll-table"] tbody tr').should('have.length.greaterThan', 0);
    });

    it('should filter payrolls by status', () => {
      cy.get('[data-testid="status-select"]').select('draft');
      cy.get('[data-testid="status-badge"]').each(($el) => {
        cy.wrap($el).should('contain', 'Draft');
      });
    });

    it('should paginate through payroll list', () => {
      cy.get('[data-testid="next-page-button"]').click();
      cy.url().should('include', 'page=2');
      cy.get('[data-testid="prev-page-button"]').click();
      cy.url().should('include', 'page=1');
    });

    it('should search payroll by employee code', () => {
      cy.get('[data-testid="search-input"]').type('EMP001');
      cy.get('[data-testid="payroll-table"] tbody tr').each(($el) => {
        cy.wrap($el).should('contain', 'EMP001');
      });
    });
  });

  describe('Payroll Creation & Editing', () => {
    beforeEach(() => {
      cy.loginAs(hrUser);
      cy.visit(`${baseUrl}/payroll/dashboard`);
    });

    it('should create new payroll', () => {
      cy.get('[data-testid="create-payroll-button"]').click();
      cy.get('[data-testid="employee-select"]').select('EMP001');
      cy.get('[data-testid="month-input"]').type('1');
      cy.get('[data-testid="year-input"]').type('2026');
      cy.get('[data-testid="add-component-button"]').click();
      cy.get('[data-testid="save-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'tạo');
    });

    it('should edit draft payroll', () => {
      cy.get('[data-testid="edit-button"]').first().click();
      cy.get('[data-testid="component-amount"]').first().clear().type('5000000');
      cy.get('[data-testid="save-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'cập nhật');
    });

    it('should add payroll components', () => {
      cy.get('[data-testid="edit-button"]').first().click();
      cy.get('[data-testid="add-component-button"]').click();
      cy.get('[data-testid="component-select"]').last().select('Thưởng');
      cy.get('[data-testid="component-amount"]').last().type('1000000');
      cy.get('[data-testid="save-button"]').click();
      cy.get('[data-testid="success-message"]').should('be.visible');
    });

    it('should calculate totals automatically', () => {
      cy.get('[data-testid="edit-button"]').first().click();
      cy.get('[data-testid="component-amount"]').first().type('5000000');
      cy.get('[data-testid="total-income"]').should('contain', '5000000');
      cy.get('[data-testid="net-salary"]').should('contain', '');
    });

    it('should prevent editing non-draft payroll', () => {
      cy.get('[data-testid="payroll-table"] tbody tr:nth-child(2)').within(() => {
        cy.get('[data-testid="status-badge"]').should('not.contain', 'Draft');
      });
      cy.get('[data-testid="payroll-table"] tbody tr:nth-child(2)').within(() => {
        cy.get('[data-testid="edit-button"]').should('not.exist');
      });
    });
  });

  describe('Payroll Workflow', () => {
    beforeEach(() => {
      cy.loginAs(hrUser);
      cy.visit(`${baseUrl}/payroll/dashboard`);
    });

    it('should submit payroll for approval', () => {
      cy.get('[data-testid="payroll-table"] tbody tr:nth-child(1)').within(() => {
        cy.get('[data-testid="view-button"]').click();
      });
      cy.get('[data-testid="submit-button"]').click();
      cy.get('[data-testid="confirm-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'nộp');
      cy.get('[data-testid="status-badge"]').should('contain', 'Pending');
    });

    it('should approve payroll as manager', () => {
      cy.loginAs(managerUser);
      cy.visit(`${baseUrl}/payroll/dashboard`);
      cy.get('[data-testid="status-select"]').select('pending');
      cy.get('[data-testid="payroll-table"] tbody tr:nth-child(1)').within(() => {
        cy.get('[data-testid="view-button"]').click();
      });
      cy.get('[data-testid="approve-button"]').click();
      cy.get('[data-testid="confirm-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'duyệt');
      cy.get('[data-testid="status-badge"]').should('contain', 'Approved');
    });

    it('should reject payroll with reason', () => {
      cy.loginAs(managerUser);
      cy.visit(`${baseUrl}/payroll/dashboard`);
      cy.get('[data-testid="status-select"]').select('pending');
      cy.get('[data-testid="payroll-table"] tbody tr:nth-child(1)').within(() => {
        cy.get('[data-testid="view-button"]').click();
      });
      cy.get('[data-testid="reject-button"]').click();
      cy.get('[data-testid="reason-input"]').type('Số liệu chưa chính xác');
      cy.get('[data-testid="confirm-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'từ chối');
      cy.get('[data-testid="status-badge"]').should('contain', 'Draft');
    });

    it('should mark payroll as paid', () => {
      cy.loginAs(adminUser);
      cy.visit(`${baseUrl}/payroll/dashboard`);
      cy.get('[data-testid="status-select"]').select('approved');
      cy.get('[data-testid="payroll-table"] tbody tr:nth-child(1)').within(() => {
        cy.get('[data-testid="view-button"]').click();
      });
      cy.get('[data-testid="paid-button"]').click();
      cy.get('[data-testid="confirm-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'thanh toán');
      cy.get('[data-testid="status-badge"]').should('contain', 'Paid');
    });
  });

  describe('Reports & Exports', () => {
    beforeEach(() => {
      cy.loginAs(adminUser);
      cy.visit(`${baseUrl}/payroll/reports`);
    });

    it('should display reports page', () => {
      cy.get('[data-testid="reports-title"]').should('contain', 'Báo Cáo');
      cy.get('[data-testid="statistics-card"]').should('have.length.greaterThan', 0);
    });

    it('should export to Excel', () => {
      cy.get('[data-testid="export-excel-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'tải xuống');
    });

    it('should export to PDF', () => {
      cy.get('[data-testid="export-pdf-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'tải xuống');
    });

    it('should filter reports by month and year', () => {
      cy.get('[data-testid="month-select"]').select('1');
      cy.get('[data-testid="year-select"]').select('2026');
      cy.get('[data-testid="payroll-table"] tbody tr').should('have.length.greaterThan', 0);
    });
  });

  describe('Policy & Component Management', () => {
    beforeEach(() => {
      cy.loginAs(adminUser);
      cy.visit(`${baseUrl}/settings/policies`);
    });

    it('should display salary policies', () => {
      cy.get('[data-testid="policies-title"]').should('contain', 'Chính Sách');
      cy.get('[data-testid="policy-card"]').should('have.length.greaterThan', 0);
    });

    it('should create new salary policy', () => {
      cy.get('[data-testid="add-policy-button"]').click();
      cy.get('[data-testid="policy-name-input"]').type('New Policy');
      cy.get('[data-testid="base-salary-input"]').type('5000000');
      cy.get('[data-testid="save-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'tạo');
    });

    it('should manage payroll components', () => {
      cy.visit(`${baseUrl}/settings/components`);
      cy.get('[data-testid="components-title"]').should('contain', 'Khoản');
      cy.get('[data-testid="component-card"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.loginAs(adminUser);
    });

    it('should handle network errors gracefully', () => {
      cy.intercept('GET', '/api/payrolls', { forceNetworkError: true });
      cy.visit(`${baseUrl}/payroll/dashboard`);
      cy.get('[data-testid="error-message"]').should('be.visible');
    });

    it('should handle validation errors', () => {
      cy.visit(`${baseUrl}/payroll/dashboard`);
      cy.get('[data-testid="create-payroll-button"]').click();
      cy.get('[data-testid="save-button"]').click();
      cy.get('[data-testid="validation-error"]').should('be.visible');
    });

    it('should handle permission errors', () => {
      cy.loginAs(hrUser);
      cy.visit(`${baseUrl}/settings/policies`);
      cy.get('[data-testid="access-denied"]').should('be.visible');
    });
  });

  describe('Performance Tests', () => {
    it('should load dashboard in less than 2 seconds', () => {
      cy.loginAs(adminUser);
      cy.visit(`${baseUrl}/payroll/dashboard`);
      cy.window().then((win) => {
        expect(performance.now()).to.be.lessThan(2000);
      });
    });

    it('should render large payroll list efficiently', () => {
      cy.loginAs(adminUser);
      cy.visit(`${baseUrl}/payroll/dashboard?limit=100`);
      cy.get('[data-testid="payroll-table"] tbody tr').should('have.length', 100);
      cy.get('body').should('not.have.class', 'slow-render');
    });
  });

  describe('Accessibility Tests', () => {
    beforeEach(() => {
      cy.loginAs(adminUser);
      cy.visit(`${baseUrl}/payroll/dashboard`);
    });

    it('should have proper heading hierarchy', () => {
      cy.get('h1').should('have.length.greaterThan', 0);
      cy.get('h2').should('have.length.greaterThan', 0);
    });

    it('should have alt text for images', () => {
      cy.get('img').each(($img) => {
        cy.wrap($img).should('have.attr', 'alt');
      });
    });

    it('should be keyboard navigable', () => {
      cy.get('[data-testid="create-payroll-button"]').focus().should('have.class', 'focus');
      cy.realPress('Tab');
    });
  });
});

// Custom Cypress commands
Cypress.Commands.add('loginAs', (user) => {
  cy.visit('http://localhost:5173/login');
  cy.get('[data-testid="email-input"]').type(user.email);
  cy.get('[data-testid="password-input"]').type(user.password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
});
