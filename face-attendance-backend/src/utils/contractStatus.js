const CONTRACT_DURATION_MONTHS = {
  probation_1_month: 1,
  probation_2_month: 2,
  probation_3_month: 3,
  formal_1_year: 12,
  formal_2_year: 24,
  formal_3_year: 36,
};

const TERMINAL_EMPLOYMENT_STATUSES = new Set(["suspended", "terminated", "resigned"]);

export const getContractEndDate = (contractType, startDate) => {
  if (!contractType || !startDate) return null;

  const months = CONTRACT_DURATION_MONTHS[contractType];
  if (!months) return null;

  const normalizedStartDate = new Date(startDate);
  if (Number.isNaN(normalizedStartDate.getTime())) return null;

  const endDate = new Date(normalizedStartDate);
  endDate.setMonth(endDate.getMonth() + months);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
};

export const isEmployeeLoginAllowed = (employee) => {
  if (!employee) return false;

  if (!employee.isActive) return false;

  const employmentStatus = String(employee.employmentStatus || "").toLowerCase();
  if (TERMINAL_EMPLOYMENT_STATUSES.has(employmentStatus)) {
    return false;
  }

  const endDate = getContractEndDate(employee.contractType, employee.startDate);
  if (endDate && endDate < new Date()) {
    return false;
  }

  return true;
};
