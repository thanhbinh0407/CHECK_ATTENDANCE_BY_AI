/**
 * Utility functions for formatting and calculations
 */

export const formatCurrency = (value) => {
  if (!value) return '0 VNĐ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('vi-VN');
};

export const getStatusColor = (status) => {
  const colors = {
    draft: 'bg-yellow-100 text-yellow-800',
    pending_approval: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    paid: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getStatusLabel = (status) => {
  const labels = {
    draft: 'Nháp',
    pending_approval: 'Chờ duyệt',
    approved: 'Đã duyệt',
    paid: 'Đã thanh toán',
    rejected: 'Bị từ chối',
  };
  return labels[status] || status;
};

export const calculatePayroll = ({
  baseSalaryPerDay,
  workingDaysBase,
  workingDaysHoliday,
  workingDaysSunday,
  overtimeDaysBase,
  holidayRate = 2,
  sundayRate = 1.5,
  overtimeRate = 1.5,
}) => {
  const baseSalary = baseSalaryPerDay * workingDaysBase;
  const holidaySalary = baseSalaryPerDay * workingDaysHoliday * holidayRate;
  const sundaySalary = baseSalaryPerDay * workingDaysSunday * sundayRate;
  const overtimeIncome = baseSalaryPerDay * overtimeDaysBase * overtimeRate;

  const totalIncome = baseSalary + holidaySalary + sundaySalary + overtimeIncome;

  // Default insurance rates
  const socialInsurance = totalIncome * 0.08;
  const healthInsurance = totalIncome * 0.015;
  const workInjuryInsurance = totalIncome * 0.01;
  const unionFee = totalIncome * 0.01;

  const totalDeduction = socialInsurance + healthInsurance + workInjuryInsurance + unionFee;
  const netSalary = totalIncome - totalDeduction;

  return {
    baseSalary,
    holidaySalary,
    sundaySalary,
    overtimeIncome,
    totalIncome,
    socialInsurance,
    healthInsurance,
    workInjuryInsurance,
    unionFee,
    totalDeduction,
    netSalary,
  };
};

export const downloadFile = (data, filename, type = 'text/plain') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^(0|\+84)[0-9]{9,10}$/;
  return re.test(phone);
};
