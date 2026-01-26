import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Global Payroll Context for managing application state
 */
const PayrollContext = createContext();

export const PayrollProvider = ({ children }) => {
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'HR');
  const [filters, setFilters] = useState({
    status: null,
    employeeCode: '',
    month: selectedMonth,
    year: selectedYear
  });
  const [notifications, setNotifications] = useState([]);

  // Select payroll
  const selectPayroll = useCallback((payroll) => {
    setSelectedPayroll(payroll);
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedPayroll(null);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      status: null,
      employeeCode: '',
      month: selectedMonth,
      year: selectedYear
    });
  }, [selectedMonth, selectedYear]);

  // Add notification
  const addNotification = useCallback((type, message, duration = 3000) => {
    const id = Date.now();
    const notification = { id, type, message };
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
    
    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const value = {
    // State
    selectedPayroll,
    selectedMonth,
    selectedYear,
    userRole,
    filters,
    notifications,

    // Actions
    selectPayroll,
    clearSelection,
    setSelectedMonth,
    setSelectedYear,
    updateFilters,
    clearFilters,
    addNotification,
    removeNotification
  };

  return (
    <PayrollContext.Provider value={value}>
      {children}
    </PayrollContext.Provider>
  );
};

/**
 * Hook to use Payroll Context
 */
export const usePayrollContext = () => {
  const context = useContext(PayrollContext);
  if (!context) {
    throw new Error('usePayrollContext must be used within PayrollProvider');
  }
  return context;
};
