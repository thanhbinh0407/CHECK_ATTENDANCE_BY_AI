/**
 * API Client Configuration
 * Centralized axios instance with interceptors
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Payroll API endpoints
 */
export const payrollApi = {
  // Payroll CRUD
  getAllPayrolls: (params) => apiClient.get('/payrolls', { params }),
  getPayrollById: (id) => apiClient.get(`/payrolls/${id}`),
  createPayroll: (data) => apiClient.post('/payrolls', data),
  updatePayroll: (id, data) => apiClient.put(`/payrolls/${id}`, data),
  deletePayroll: (id) => apiClient.delete(`/payrolls/${id}`),

  // Payroll Workflow
  submitPayroll: (id) => apiClient.put(`/payrolls/${id}/submit`, {}),
  approvePayroll: (id, data) => apiClient.put(`/payrolls/${id}/approve`, data),
  rejectPayroll: (id, data) => apiClient.put(`/payrolls/${id}/reject`, data),
  markAsPaid: (id, data) => apiClient.put(`/payrolls/${id}/mark-paid`, data),
  bulkApprovePayrolls: (data) => apiClient.post('/payrolls/bulk/approve', data),

  // Payroll Details
  getPayrollDetails: (payrollId) => apiClient.get(`/payrolls/${payrollId}/details`),
  updatePayrollDetail: (payrollId, detailId, data) =>
    apiClient.put(`/payrolls/${payrollId}/details/${detailId}`, data),

  // Salary Policies
  getAllSalaryPolicies: () => apiClient.get('/salary-policies'),
  getSalaryPolicyById: (id) => apiClient.get(`/salary-policies/${id}`),
  createSalaryPolicy: (data) => apiClient.post('/salary-policies', data),
  updateSalaryPolicy: (id, data) => apiClient.put(`/salary-policies/${id}`, data),
  deactivateSalaryPolicy: (id) => apiClient.put(`/salary-policies/${id}/deactivate`, {}),

  // Payroll Components
  getAllPayrollComponents: () => apiClient.get('/payroll-components'),
  getComponentsByType: (type) => apiClient.get(`/payroll-components/type/${type}`),
  getPayrollComponentById: (id) => apiClient.get(`/payroll-components/${id}`),
  createPayrollComponent: (data) => apiClient.post('/payroll-components', data),
  updatePayrollComponent: (id, data) => apiClient.put(`/payroll-components/${id}`, data),
  deactivatePayrollComponent: (id) =>
    apiClient.put(`/payroll-components/${id}/deactivate`, {}),

  // Reports
  getMonthlyPayrollSummary: (params) =>
    apiClient.get('/reports/monthly-summary', { params }),
  getEmployeePayrollHistory: (userId, params) =>
    apiClient.get(`/reports/employee/${userId}/history`, { params }),
  getPayrollStatistics: (params) => apiClient.get('/reports/statistics', { params }),
  exportToExcel: (params) => apiClient.get('/reports/export/excel', {
    params,
    responseType: 'blob',
  }),
  exportPayslipToPDF: (id) => apiClient.get(`/payrolls/${id}/export/pdf`, {
    responseType: 'blob',
  }),
  getAuditTrail: (id) => apiClient.get(`/payrolls/${id}/audit-trail`),

  // Calculations
  calculatePayroll: (data) => apiClient.post('/calculate', data),
  calculateTax: (data) => apiClient.post('/calculate/tax', data),
  calculateInsurance: (data) => apiClient.post('/calculate/insurance', data),
};

export default apiClient;
