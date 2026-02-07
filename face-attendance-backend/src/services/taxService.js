import User from "../models/pg/User.js";
import Dependent from "../models/pg/Dependent.js";
import { Op } from "sequelize";

// Tax deduction rates (according to current Vietnam tax law)
const TAX_DEDUCTION_RATES = [
  { min: 0, max: 5000000, rate: 0.05 },
  { min: 5000000, max: 10000000, rate: 0.10 },
  { min: 10000000, max: 18000000, rate: 0.15 },
  { min: 18000000, max: 32000000, rate: 0.20 },
  { min: 32000000, max: 52000000, rate: 0.25 },
  { min: 52000000, max: 80000000, rate: 0.30 },
  { min: 80000000, max: Infinity, rate: 0.35 }
];

// Personal deduction (giảm trừ bản thân) - Update according to current law
const PERSONAL_DEDUCTION = 11000000; // 11 million VND/month (2024)

// Dependent deduction (giảm trừ người phụ thuộc) - Update according to current law
const DEPENDENT_DEDUCTION = 4400000; // 4.4 million VND/person/month (2024)

// Calculate tax for an employee
export const calculatePersonalIncomeTax = async (userId, taxableIncome, month, year) => {
  try {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Dependent,
          as: 'Dependents',
          where: {
            isDependent: true,
            approvalStatus: 'approved'
          },
          required: false
        }
      ]
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Calculate total deductions
    let totalDeduction = PERSONAL_DEDUCTION; // Personal deduction

    // Add dependent deductions
    const approvedDependents = user.Dependents?.filter(dep => dep.isDependent && dep.approvalStatus === 'approved') || [];
    totalDeduction += approvedDependents.length * DEPENDENT_DEDUCTION;

    // Calculate taxable income after deductions
    const incomeAfterDeduction = Math.max(0, taxableIncome - totalDeduction);

    if (incomeAfterDeduction <= 0) {
      return {
        taxableIncome,
        personalDeduction: PERSONAL_DEDUCTION,
        dependentDeduction: approvedDependents.length * DEPENDENT_DEDUCTION,
        totalDeduction,
        incomeAfterDeduction: 0,
        taxAmount: 0,
        dependentCount: approvedDependents.length
      };
    }

    // Calculate tax using progressive rates
    let taxAmount = 0;
    let remainingIncome = incomeAfterDeduction;

    for (let i = TAX_DEDUCTION_RATES.length - 1; i >= 0; i--) {
      const bracket = TAX_DEDUCTION_RATES[i];
      if (remainingIncome > bracket.min) {
        const taxableInBracket = Math.min(remainingIncome, bracket.max) - bracket.min;
        taxAmount += taxableInBracket * bracket.rate;
        remainingIncome = bracket.min;
      }
    }

    return {
      taxableIncome,
      personalDeduction: PERSONAL_DEDUCTION,
      dependentDeduction: approvedDependents.length * DEPENDENT_DEDUCTION,
      totalDeduction,
      incomeAfterDeduction: parseFloat(incomeAfterDeduction.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      dependentCount: approvedDependents.length,
      taxRate: taxAmount > 0 ? parseFloat((taxAmount / incomeAfterDeduction * 100).toFixed(2)) : 0
    };
  } catch (error) {
    console.error("[Tax Service] Error calculating tax:", error);
    throw error;
  }
};

// Calculate annual tax summary for an employee
export const calculateAnnualTaxSummary = async (userId, year) => {
  try {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Dependent,
          as: 'Dependents',
          where: {
            isDependent: true,
            approvalStatus: 'approved'
          },
          required: false
        }
      ]
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get all salaries for the year
    const Salary = (await import("../models/pg/Salary.js")).default;
    const salaries = await Salary.findAll({
      where: {
        userId,
        year: parseInt(year),
        status: { [Op.in]: ['approved', 'paid'] }
      },
      order: [['month', 'ASC']]
    });

    let totalTaxableIncome = 0;
    let totalTaxPaid = 0;
    const monthlyBreakdown = [];

    for (const salary of salaries) {
      const taxableIncome = parseFloat(salary.finalSalary || 0);
      totalTaxableIncome += taxableIncome;

      const taxCalculation = await calculatePersonalIncomeTax(userId, taxableIncome, salary.month, year);
      totalTaxPaid += taxCalculation.taxAmount;

      monthlyBreakdown.push({
        month: salary.month,
        taxableIncome,
        taxAmount: taxCalculation.taxAmount,
        ...taxCalculation
      });
    }

    // Calculate annual tax
    const annualTaxCalculation = await calculatePersonalIncomeTax(userId, totalTaxableIncome, 12, year);

    return {
      year: parseInt(year),
      employeeId: user.id,
      employeeName: user.name,
      employeeCode: user.employeeCode,
      taxCode: user.taxCode,
      totalTaxableIncome: parseFloat(totalTaxableIncome.toFixed(2)),
      totalTaxPaid: parseFloat(totalTaxPaid.toFixed(2)),
      annualTaxCalculation,
      monthlyBreakdown,
      dependentCount: user.Dependents?.length || 0
    };
  } catch (error) {
    console.error("[Tax Service] Error calculating annual tax summary:", error);
    throw error;
  }
};

// Get annual tax summary for all employees
export const getAllEmployeesAnnualTaxSummary = async (year) => {
  try {
    const employees = await User.findAll({
      where: {
        role: 'employee',
        isActive: true
      },
      attributes: ['id', 'name', 'employeeCode', 'taxCode']
    });

    const results = [];
    for (const employee of employees) {
      try {
        const summary = await calculateAnnualTaxSummary(employee.id, year);
        results.push(summary);
      } catch (error) {
        console.error(`[Tax Service] Error calculating for employee ${employee.id}:`, error);
        // Continue with other employees even if one fails
      }
    }

    return {
      year: parseInt(year),
      totalEmployees: employees.length,
      employeesWithTaxData: results.length,
      totalTaxableIncome: parseFloat(results.reduce((sum, r) => sum + r.totalTaxableIncome, 0).toFixed(2)),
      totalTaxPaid: parseFloat(results.reduce((sum, r) => sum + r.totalTaxPaid, 0).toFixed(2)),
      summaries: results.sort((a, b) => b.totalTaxableIncome - a.totalTaxableIncome)
    };
  } catch (error) {
    console.error("[Tax Service] Error calculating all employees annual tax summary:", error);
    throw error;
  }
};

