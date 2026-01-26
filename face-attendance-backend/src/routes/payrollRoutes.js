/**
 * Payroll Routes
 * API endpoints for payroll management system
 * 
 * Author: Senior Development Team
 * Version: 2.0
 * Date: 25-01-2026
 */

const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

/**
 * PAYROLL ROUTES
 * CRUD operations for payroll/bảng lương
 */

// Get all payrolls with filters (month, year, status, policy)
router.get('/payrolls', 
  authenticate,
  payrollController.getAllPayrolls
);

// Get payroll by ID with details
router.get('/payrolls/:id',
  authenticate,
  payrollController.getPayrollById
);

// Create new payroll (Draft status)
router.post('/payrolls',
  authenticate,
  authorize(['HR', 'ADMIN']),
  payrollController.createPayroll
);

// Update payroll (only in Draft status)
router.put('/payrolls/:id',
  authenticate,
  authorize(['HR', 'ADMIN']),
  payrollController.updatePayroll
);

// Submit payroll for approval (Draft → Pending)
router.put('/payrolls/:id/submit',
  authenticate,
  authorize(['HR', 'ADMIN']),
  payrollController.submitPayroll
);

// Approve payroll (Pending → Approved)
router.put('/payrolls/:id/approve',
  authenticate,
  authorize(['MANAGER', 'ADMIN']),
  payrollController.approvePayroll
);

// Reject payroll with reason (Pending/Approved → Draft)
router.put('/payrolls/:id/reject',
  authenticate,
  authorize(['MANAGER', 'ADMIN']),
  payrollController.rejectPayroll
);

// Mark payroll as paid (Approved → Paid)
router.put('/payrolls/:id/mark-paid',
  authenticate,
  authorize(['ADMIN', 'ACCOUNTANT']),
  payrollController.markAsPaid
);

// Delete payroll (only Draft status)
router.delete('/payrolls/:id',
  authenticate,
  authorize(['HR', 'ADMIN']),
  payrollController.deletePayroll
);

// Bulk approve payrolls
router.post('/payrolls/bulk/approve',
  authenticate,
  authorize(['MANAGER', 'ADMIN']),
  payrollController.bulkApprovePayrolls
);

/**
 * PAYROLL DETAIL ROUTES
 * Line items for each payroll
 */

// Get payroll details (components with amounts)
router.get('/payrolls/:payrollId/details',
  authenticate,
  payrollController.getPayrollDetails
);

// Update single payroll detail/component
router.put('/payrolls/:payrollId/details/:detailId',
  authenticate,
  authorize(['HR', 'ADMIN']),
  payrollController.updatePayrollDetail
);

/**
 * SALARY POLICY ROUTES
 * Pre-built payroll policies (Day/Night × Probation/Official)
 */

// Get all salary policies
router.get('/salary-policies',
  authenticate,
  payrollController.getAllSalaryPolicies
);

// Get salary policy by ID
router.get('/salary-policies/:id',
  authenticate,
  payrollController.getSalaryPolicyById
);

// Create new salary policy (Admin only)
router.post('/salary-policies',
  authenticate,
  authorize(['ADMIN']),
  payrollController.createSalaryPolicy
);

// Update salary policy
router.put('/salary-policies/:id',
  authenticate,
  authorize(['ADMIN']),
  payrollController.updateSalaryPolicy
);

// Deactivate salary policy
router.put('/salary-policies/:id/deactivate',
  authenticate,
  authorize(['ADMIN']),
  payrollController.deactivateSalaryPolicy
);

/**
 * PAYROLL COMPONENT ROUTES
 * 28 pre-built components (19 income + 9 deduction)
 */

// Get all payroll components
router.get('/payroll-components',
  authenticate,
  payrollController.getAllPayrollComponents
);

// Get payroll components filtered by type (income/deduction)
router.get('/payroll-components/type/:type',
  authenticate,
  payrollController.getComponentsByType
);

// Get payroll component by ID
router.get('/payroll-components/:id',
  authenticate,
  payrollController.getPayrollComponentById
);

// Create new payroll component (Admin only)
router.post('/payroll-components',
  authenticate,
  authorize(['ADMIN']),
  payrollController.createPayrollComponent
);

// Update payroll component
router.put('/payroll-components/:id',
  authenticate,
  authorize(['ADMIN']),
  payrollController.updatePayrollComponent
);

// Deactivate payroll component
router.put('/payroll-components/:id/deactivate',
  authenticate,
  authorize(['ADMIN']),
  payrollController.deactivatePayrollComponent
);

/**
 * PAYROLL REPORTS ROUTES
 * Analytics, monthly summaries, exports
 */

// Get monthly payroll summary
router.get('/reports/monthly-summary',
  authenticate,
  payrollController.getMonthlyPayrollSummary
);

// Get employee payroll history
router.get('/reports/employee/:userId/history',
  authenticate,
  payrollController.getEmployeePayrollHistory
);

// Get payroll statistics (by status, total amounts, etc.)
router.get('/reports/statistics',
  authenticate,
  payrollController.getPayrollStatistics
);

// Export payroll data to Excel
router.get('/reports/export/excel',
  authenticate,
  authorize(['HR', 'ADMIN', 'ACCOUNTANT']),
  payrollController.exportToExcel
);

// Export payroll data to PDF (payslip)
router.get('/payrolls/:id/export/pdf',
  authenticate,
  payrollController.exportPayslipToPDF
);

// Get payroll audit trail (who changed what and when)
router.get('/payrolls/:id/audit-trail',
  authenticate,
  authorize(['ADMIN']),
  payrollController.getAuditTrail
);

/**
 * CALCULATION ROUTES
 * Helper endpoints for calculations
 */

// Calculate payroll components automatically
router.post('/calculate',
  authenticate,
  payrollController.calculatePayroll
);

// Get tax calculation details
router.post('/calculate/tax',
  authenticate,
  payrollController.calculateTax
);

// Get insurance deduction details
router.post('/calculate/insurance',
  authenticate,
  payrollController.calculateInsurance
);

module.exports = router;
