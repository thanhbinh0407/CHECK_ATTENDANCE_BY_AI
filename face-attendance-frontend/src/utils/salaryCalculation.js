/**
 * Utility functions for salary calculation according to Vietnamese labor law
 * Based on SRS Document 2026 - Hệ thống Quản lý & Tính lương Doanh nghiệp Nhà nước
 * 
 * References:
 * - Bộ luật Lao động 2019
 * - Luật BHXH 2014
 * - Luật Việc làm 2013
 * - Luật Thuế TNCN sửa đổi 2025 (áp dụng 2026)
 * - Nghị quyết Quốc hội về mức giảm trừ gia cảnh mới
 */

// Constants according to Vietnamese law 2026
export const SALARY_CONSTANTS = {
  // Base salary (Lương cơ sở)
  BASE_SALARY: 1800000,  // 1,800,000 VND
  
  // Insurance rates (employee contribution)
  BHXH_RATE: 0.08,   // 8%
  BHYT_RATE: 0.015,  // 1.5%
  BHTN_RATE: 0.01,   // 1%
  TOTAL_INSURANCE_RATE: 0.105,  // 10.5% total
  
  // Personal deduction (2026 rates)
  PERSONAL_DEDUCTION: 15500000,  // 15,500,000 VND/month
  
  // Dependent deduction (2026 rates)
  DEPENDENT_DEDUCTION: 6200000,  // 6,200,000 VND per dependent/month
};

// Personal Income Tax brackets (2026 rates - Biểu thuế lũy tiến từng phần)
export const TAX_BRACKETS = [
  { min: 0, max: 10000000, rate: 0.05 },        // Bậc 1: ≤ 10 triệu - 5%
  { min: 10000000, max: 30000000, rate: 0.10 }, // Bậc 2: >10-30 triệu - 10%
  { min: 30000000, max: 60000000, rate: 0.20 }, // Bậc 3: >30-60 triệu - 20%
  { min: 60000000, max: 100000000, rate: 0.30 }, // Bậc 4: >60-100 triệu - 30%
  { min: 100000000, max: Infinity, rate: 0.35 }, // Bậc 5: >100 triệu - 35%
];

// Job title coefficients (Hệ số chức vụ) - Map job titles to coefficients
export const JOB_COEFFICIENTS = {
  "Nhân viên CNTT": 2.34,
  "Chuyên viên CNTT": 3.00,
  "Chuyên viên chính": 4.00,
  "Phó phòng CNTT": 5.00,
  "Trưởng phòng CNTT": 6.20,
  "Nhân viên": 2.34,
  "Chuyên viên": 3.00,
  "Phó phòng": 5.00,
  "Trưởng phòng": 6.20,
  "Phó giám đốc": 7.50,
  "Giám đốc": 8.80,
};

// Position coefficients (Hệ số chức vụ) - Legacy, use JOB_COEFFICIENTS instead
export const POSITION_COEFFICIENTS = {
  NHAN_VIEN: 2.34,
  CHUYEN_VIEN: 3.00,
  CHUYEN_VIEN_CHINH: 4.00,
  PHO_PHONG: 5.00,
  TRUONG_PHONG: 6.20,
  PHO_GIAM_DOC: 7.50,
  GIAM_DOC: 8.80,
};

// Education level coefficients (Hệ số bằng cấp)
export const EDUCATION_COEFFICIENTS = {
  "Trung cấp": 0.00,
  "Cao đẳng": 0.20,
  "Đại học": 0.40,
  "Sau đại học (ThS/TS)": 0.70,  // Thạc sĩ/Tiến sĩ
};

// Legacy education coefficients
export const EDUCATION_COEFFICIENTS_LEGACY = {
  TRUNG_CAP: 0.00,
  CAO_DANG: 0.20,
  DAI_HOC: 0.40,
  SAU_DAI_HOC: 0.70,
};

// Certificate coefficients (Hệ số chứng chỉ)
export const CERTIFICATE_COEFFICIENTS = {
  "CCASP": 0.50,  // Certified Cloud & Application Security Professional
};

/**
 * Calculate total coefficient from job title, education, and certificates
 * Tổng hệ số = Hệ số chức vụ + Hệ số bằng cấp + Hệ số chứng chỉ
 */
export function calculateTotalCoefficientFromJob(jobTitle, educationLevel, certificates = []) {
  const jobCoeff = JOB_COEFFICIENTS[jobTitle] || 0;
  const eduCoeff = EDUCATION_COEFFICIENTS[educationLevel] || 0;
  let certCoeff = 0;
  if (Array.isArray(certificates)) {
    certificates.forEach(cert => {
      certCoeff += CERTIFICATE_COEFFICIENTS[cert] || 0;
    });
  }
  return jobCoeff + eduCoeff + certCoeff;
}

/**
 * Calculate salary by coefficient
 * Lương theo hệ số = Lương cơ bản × Hệ số
 */
export function calculateSalaryByCoefficient(baseSalary, coefficient = 1) {
  return baseSalary * coefficient;
}

/**
 * Calculate social insurance (BHXH)
 * BHXH = 8% × Lương đóng BH
 */
export function calculateBHXH(insuranceSalary) {
  return insuranceSalary * SALARY_CONSTANTS.BHXH_RATE;
}

/**
 * Calculate health insurance (BHYT)
 * BHYT = 1.5% × Lương đóng BH
 */
export function calculateBHYT(insuranceSalary) {
  return insuranceSalary * SALARY_CONSTANTS.BHYT_RATE;
}

/**
 * Calculate unemployment insurance (BHTN)
 * BHTN = 1% × Lương đóng BH
 */
export function calculateBHTN(insuranceSalary) {
  return insuranceSalary * SALARY_CONSTANTS.BHTN_RATE;
}

/**
 * Calculate total insurance
 * Tổng BH = BHXH + BHYT + BHTN
 */
export function calculateTotalInsurance(insuranceSalary) {
  const bhxh = calculateBHXH(insuranceSalary);
  const bhyt = calculateBHYT(insuranceSalary);
  const bhtn = calculateBHTN(insuranceSalary);
  return bhxh + bhyt + bhtn;
}

/**
 * Calculate taxable income
 * Thu nhập chịu thuế = Lương theo hệ số − Tổng BH
 */
export function calculateTaxableIncome(salaryByCoefficient, totalInsurance) {
  return salaryByCoefficient - totalInsurance;
}

/**
 * Calculate personal deduction (2026 rates)
 * Giảm trừ = 15.500.000 + (Người phụ thuộc × 6.200.000)
 */
export function calculatePersonalDeduction(dependents = 0) {
  return SALARY_CONSTANTS.PERSONAL_DEDUCTION + (dependents * SALARY_CONSTANTS.DEPENDENT_DEDUCTION);
}

/**
 * Calculate total coefficient
 * Tổng hệ số = Hệ số chức vụ + Hệ số bằng cấp + Hệ số chứng chỉ (nếu có)
 */
export function calculateTotalCoefficient(positionCoeff, educationCoeff, certificateCoeff = 0) {
  return positionCoeff + educationCoeff + certificateCoeff;
}

/**
 * Calculate gross salary
 * Lương gộp = Lương cơ sở × Tổng hệ số
 */
export function calculateGrossSalary(baseSalary, totalCoefficient) {
  return baseSalary * totalCoefficient;
}

/**
 * Calculate income subject to tax
 * Thu nhập tính thuế = Thu nhập chịu thuế − Giảm trừ
 */
export function calculateIncomeSubjectToTax(taxableIncome, personalDeduction) {
  const income = taxableIncome - personalDeduction;
  return Math.max(0, income); // Cannot be negative
}

/**
 * Calculate Personal Income Tax (PIT) using progressive tax brackets
 * Thuế TNCN lũy tiến
 */
export function calculatePIT(incomeSubjectToTax) {
  if (incomeSubjectToTax <= 0) {
    return 0;
  }

  let totalTax = 0;
  let remainingIncome = incomeSubjectToTax;

  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    const bracket = TAX_BRACKETS[i];
    if (remainingIncome > bracket.min) {
      const taxableInBracket = Math.min(remainingIncome - bracket.min, bracket.max - bracket.min);
      totalTax += taxableInBracket * bracket.rate;
      remainingIncome = bracket.min;
    }
  }

  return Math.round(totalTax);
}

/**
 * Calculate net salary (final salary)
 * Lương thực lĩnh = Lương theo hệ số − Tổng BH − Thuế TNCN
 */
export function calculateNetSalary(salaryByCoefficient, totalInsurance, pit) {
  return salaryByCoefficient - totalInsurance - pit;
}

/**
 * Main function to calculate complete salary breakdown (2026 standard)
 * 
 * @param {number} baseSalary - Lương cơ sở (default: 1,800,000 VNĐ)
 * @param {number} totalCoefficient - Tổng hệ số (Hệ số chức vụ + bằng cấp + chứng chỉ)
 * @param {number} dependents - Số người phụ thuộc (default: 0)
 * @param {number} bonus - Thưởng (optional)
 * @param {number} deduction - Khấu trừ (optional)
 * @returns {Object} Complete salary breakdown
 * 
 * Formula 2026:
 * - Lương gộp = Lương cơ sở × Tổng hệ số
 * - Tổng BH = Lương gộp × 10.5%
 * - Thu nhập chịu thuế = Lương gộp – Tổng BH
 * - Thu nhập tính thuế = Thu nhập chịu thuế – Giảm trừ gia cảnh
 * - Thuế TNCN = Áp dụng biểu thuế lũy tiến (5 bậc)
 * - Lương thực lĩnh = Lương gộp – BH – Thuế TNCN
 */
export function calculateCompleteSalary({
  baseSalary = SALARY_CONSTANTS.BASE_SALARY,
  totalCoefficient = 1,
  dependents = 0,
  bonus = 0,
  deduction = 0,
}) {
  // Validate inputs
  if (!baseSalary || baseSalary < 0) {
    throw new Error('Lương cơ sở phải lớn hơn 0');
  }
  if (totalCoefficient <= 0) {
    throw new Error('Tổng hệ số phải lớn hơn 0');
  }
  if (dependents < 0) {
    throw new Error('Số người phụ thuộc không được âm');
  }

  // Step 1: Calculate gross salary (Lương gộp)
  // Lương gộp = Lương cơ sở × Tổng hệ số
  const grossSalary = calculateGrossSalary(baseSalary, totalCoefficient);
  
  // Step 2: Calculate insurance (Tổng BH)
  // Tổng BH = Lương gộp × 10.5%
  const totalInsurance = grossSalary * SALARY_CONSTANTS.TOTAL_INSURANCE_RATE;
  const bhxh = grossSalary * SALARY_CONSTANTS.BHXH_RATE;
  const bhyt = grossSalary * SALARY_CONSTANTS.BHYT_RATE;
  const bhtn = grossSalary * SALARY_CONSTANTS.BHTN_RATE;
  
  // Step 3: Calculate taxable income (Thu nhập chịu thuế)
  // Thu nhập chịu thuế = Lương gộp – Tổng BH
  const taxableIncome = grossSalary - totalInsurance;
  
  // Step 4: Calculate personal deduction (Giảm trừ gia cảnh)
  // Giảm trừ = 15.500.000 + (Người phụ thuộc × 6.200.000)
  const personalDeduction = calculatePersonalDeduction(dependents);
  
  // Step 5: Calculate income subject to tax (Thu nhập tính thuế)
  // Thu nhập tính thuế = Thu nhập chịu thuế – Giảm trừ
  const incomeSubjectToTax = calculateIncomeSubjectToTax(taxableIncome, personalDeduction);
  
  // Step 6: Calculate PIT (Thuế TNCN)
  const pit = calculatePIT(incomeSubjectToTax);
  
  // Step 7: Calculate net salary (Lương thực lĩnh)
  // Lương thực lĩnh = Lương gộp – BH – Thuế TNCN + Thưởng - Khấu trừ
  const netSalary = grossSalary - totalInsurance - pit + bonus - deduction;
  
  return {
    // Inputs
    baseSalary,
    totalCoefficient,
    dependents,
    bonus,
    deduction,
    
    // Calculations
    grossSalary: Math.round(grossSalary),
    
    // Insurance
    insurance: {
      bhxh: Math.round(bhxh),
      bhyt: Math.round(bhyt),
      bhtn: Math.round(bhtn),
      total: Math.round(totalInsurance),
    },
    
    // Tax
    tax: {
      taxableIncome: Math.round(taxableIncome),
      personalDeduction: Math.round(personalDeduction),
      incomeSubjectToTax: Math.round(incomeSubjectToTax),
      pit: Math.round(pit),
    },
    
    // Final
    netSalary: Math.round(Math.max(0, netSalary)), // Net salary cannot be negative
    
    // Breakdown for display
    breakdown: {
      gross: Math.round(grossSalary),
      insurance: Math.round(totalInsurance),
      tax: Math.round(pit),
      net: Math.round(Math.max(0, netSalary)),
    }
  };
}

/**
 * Format currency in Vietnamese format
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount || 0);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0);
}


