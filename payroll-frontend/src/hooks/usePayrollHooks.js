import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { payrollApi } from '../api/apiClient';

/**
 * Custom hook for managing payroll workflow
 * Handles: Draft → Pending → Approved → Paid transitions
 */
export const usePayrollWorkflow = (payrollId) => {
  const [workflowState, setWorkflowState] = useState('idle');
  const [error, setError] = useState(null);

  const submitPayroll = useCallback(async () => {
    if (workflowState === 'loading') return;
    setWorkflowState('loading');
    setError(null);
    try {
      await payrollApi.submitPayroll(payrollId);
      setWorkflowState('success');
      return true;
    } catch (err) {
      setError(err.message);
      setWorkflowState('error');
      return false;
    }
  }, [payrollId, workflowState]);

  const approvePayroll = useCallback(async () => {
    if (workflowState === 'loading') return;
    setWorkflowState('loading');
    setError(null);
    try {
      await payrollApi.approvePayroll(payrollId);
      setWorkflowState('success');
      return true;
    } catch (err) {
      setError(err.message);
      setWorkflowState('error');
      return false;
    }
  }, [payrollId, workflowState]);

  const rejectPayroll = useCallback(async (reason) => {
    if (workflowState === 'loading') return;
    setWorkflowState('loading');
    setError(null);
    try {
      await payrollApi.rejectPayroll(payrollId, { reason });
      setWorkflowState('success');
      return true;
    } catch (err) {
      setError(err.message);
      setWorkflowState('error');
      return false;
    }
  }, [payrollId, workflowState]);

  const markAsPaid = useCallback(async () => {
    if (workflowState === 'loading') return;
    setWorkflowState('loading');
    setError(null);
    try {
      await payrollApi.markAsPaid(payrollId);
      setWorkflowState('success');
      return true;
    } catch (err) {
      setError(err.message);
      setWorkflowState('error');
      return false;
    }
  }, [payrollId, workflowState]);

  return {
    workflowState,
    error,
    submitPayroll,
    approvePayroll,
    rejectPayroll,
    markAsPaid
  };
};

/**
 * Custom hook for form validation
 */
export const useFormValidation = (initialValues) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  }, []);

  const validate = useCallback((validationRules) => {
    const newErrors = {};
    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field];
      const value = values[field];

      if (rule.required && (!value || value.toString().trim() === '')) {
        newErrors[field] = `${field} là bắt buộc`;
      } else if (rule.min && Number(value) < rule.min) {
        newErrors[field] = `${field} phải >= ${rule.min}`;
      } else if (rule.max && Number(value) > rule.max) {
        newErrors[field] = `${field} phải <= ${rule.max}`;
      } else if (rule.pattern && !rule.pattern.test(value)) {
        newErrors[field] = rule.message || `${field} không hợp lệ`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    setValues
  };
};

/**
 * Custom hook for calculation logic
 */
export const usePayrollCalculation = (components) => {
  const calculate = useCallback(() => {
    const income = components
      .filter(c => c.componentType === 'income')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const deduction = components
      .filter(c => c.componentType === 'deduction')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const taxDeduction = deduction * 0.1; // 10% tax
    const insuranceDeduction = deduction * 0.05; // 5% insurance
    const totalDeduction = deduction + taxDeduction + insuranceDeduction;
    const netSalary = income - totalDeduction;

    return {
      totalIncome: income,
      totalDeduction,
      taxDeduction,
      insuranceDeduction,
      netSalary,
      isValid: income > 0 && netSalary > 0
    };
  }, [components]);

  return { calculate };
};

/**
 * Custom hook for data fetching with caching
 */
export const usePayrollData = (filters) => {
  const { data, isLoading, error, refetch } = useQuery(
    ['payrolls', filters],
    () => payrollApi.getAllPayrolls(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  return { payrolls: data, isLoading, error, refetch };
};

/**
 * Custom hook for approval logic
 */
export const useApprovalLogic = (payroll) => {
  const userRole = localStorage.getItem('userRole');
  
  const canEdit = payroll?.status === 'draft' && 
                  ['HR', 'Admin'].includes(userRole);
  
  const canSubmit = payroll?.status === 'draft' && 
                    ['HR'].includes(userRole);
  
  const canApprove = payroll?.status === 'pending' && 
                     ['Manager', 'HR'].includes(userRole);
  
  const canReject = payroll?.status === 'pending' && 
                    ['Manager', 'HR'].includes(userRole);
  
  const canMarkPaid = payroll?.status === 'approved' && 
                      ['Accountant', 'Admin'].includes(userRole);

  return {
    canEdit,
    canSubmit,
    canApprove,
    canReject,
    canMarkPaid
  };
};

/**
 * Custom hook for Excel export
 */
export const useExcelExport = () => {
  const exportToExcel = useCallback(async (month, year, filename) => {
    try {
      const response = await payrollApi.exportToExcel(month, year);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `Payroll_${month}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Excel export failed:', error);
      return false;
    }
  }, []);

  return { exportToExcel };
};

/**
 * Custom hook for PDF export
 */
export const usePdfExport = () => {
  const exportToPdf = useCallback(async (month, year, filename) => {
    try {
      const response = await payrollApi.exportPayslipToPDF(month, year);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `Payslips_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('PDF export failed:', error);
      return false;
    }
  }, []);

  return { exportToPdf };
};

/**
 * Custom hook for filter management
 */
export const useFilterState = (initialFilters) => {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = useCallback((field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return { filters, updateFilter, clearFilters };
};

/**
 * Custom hook for pagination
 */
export const usePagination = (items, itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil((items?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items?.slice(startIndex, endIndex) || [];

  const goToPage = useCallback((page) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    prevPage
  };
};
