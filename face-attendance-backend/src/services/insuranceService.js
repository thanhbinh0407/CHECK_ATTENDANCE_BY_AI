import InsuranceConfig from "../models/pg/InsuranceConfig.js";
import User from "../models/pg/User.js";
import { Op } from "sequelize";

// Get active insurance config
export const getActiveInsuranceConfig = async () => {
  try {
    const today = new Date();
    const config = await InsuranceConfig.findOne({
      where: {
        isActive: true,
        effectiveDate: { [Op.lte]: today },
        [Op.or]: [
          { expiryDate: null },
          { expiryDate: { [Op.gte]: today } }
        ]
      },
      order: [['effectiveDate', 'DESC']]
    });

    return config || {
      employeeSocialInsuranceRate: 10.5,
      employerSocialInsuranceRate: 21.5,
      employeeHealthInsuranceRate: 1.5,
      employerHealthInsuranceRate: 3.0,
      employeeUnemploymentInsuranceRate: 1.0,
      employerUnemploymentInsuranceRate: 1.0,
      maxInsuranceSalary: null,
      minInsuranceSalary: null
    };
  } catch (error) {
    console.error("[Insurance Service] Error getting active config:", error);
    // Return default rates
    return {
      employeeSocialInsuranceRate: 10.5,
      employerSocialInsuranceRate: 21.5,
      employeeHealthInsuranceRate: 1.5,
      employerHealthInsuranceRate: 3.0,
      employeeUnemploymentInsuranceRate: 1.0,
      employerUnemploymentInsuranceRate: 1.0,
      maxInsuranceSalary: null,
      minInsuranceSalary: null
    };
  }
};

// Calculate insurance contributions for an employee
export const calculateInsurance = async (userId, month, year) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const config = await getActiveInsuranceConfig();
    
    // Use insuranceBaseSalary if available, otherwise use baseSalary
    const insuranceBase = user.insuranceBaseSalary || user.baseSalary || 0;
    
    // Apply min/max limits if configured
    let adjustedBase = insuranceBase;
    if (config.minInsuranceSalary && adjustedBase < config.minInsuranceSalary) {
      adjustedBase = config.minInsuranceSalary;
    }
    if (config.maxInsuranceSalary && adjustedBase > config.maxInsuranceSalary) {
      adjustedBase = config.maxInsuranceSalary;
    }

    // Calculate employee contributions
    const employeeSocialInsurance = (adjustedBase * config.employeeSocialInsuranceRate) / 100;
    const employeeHealthInsurance = (adjustedBase * config.employeeHealthInsuranceRate) / 100;
    const employeeUnemploymentInsurance = (adjustedBase * config.employeeUnemploymentInsuranceRate) / 100;
    const totalEmployeeContribution = employeeSocialInsurance + employeeHealthInsurance + employeeUnemploymentInsurance;

    // Calculate employer contributions
    const employerSocialInsurance = (adjustedBase * config.employerSocialInsuranceRate) / 100;
    const employerHealthInsurance = (adjustedBase * config.employerHealthInsuranceRate) / 100;
    const employerUnemploymentInsurance = (adjustedBase * config.employerUnemploymentInsuranceRate) / 100;
    const totalEmployerContribution = employerSocialInsurance + employerHealthInsurance + employerUnemploymentInsurance;

    return {
      insuranceBase: adjustedBase,
      employee: {
        socialInsurance: parseFloat(employeeSocialInsurance.toFixed(2)),
        healthInsurance: parseFloat(employeeHealthInsurance.toFixed(2)),
        unemploymentInsurance: parseFloat(employeeUnemploymentInsurance.toFixed(2)),
        total: parseFloat(totalEmployeeContribution.toFixed(2))
      },
      employer: {
        socialInsurance: parseFloat(employerSocialInsurance.toFixed(2)),
        healthInsurance: parseFloat(employerHealthInsurance.toFixed(2)),
        unemploymentInsurance: parseFloat(employerUnemploymentInsurance.toFixed(2)),
        total: parseFloat(totalEmployerContribution.toFixed(2))
      },
      total: parseFloat((totalEmployeeContribution + totalEmployerContribution).toFixed(2))
    };
  } catch (error) {
    console.error("[Insurance Service] Error calculating insurance:", error);
    throw error;
  }
};

// Calculate insurance for all employees
export const calculateAllEmployeesInsurance = async (month, year) => {
  try {
    const employees = await User.findAll({
      where: {
        role: 'employee',
        isActive: true
      }
    });

    const results = [];
    for (const employee of employees) {
      try {
        const insurance = await calculateInsurance(employee.id, month, year);
        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          employeeCode: employee.employeeCode,
          ...insurance
        });
      } catch (error) {
        console.error(`[Insurance Service] Error calculating for employee ${employee.id}:`, error);
      }
    }

    return results;
  } catch (error) {
    console.error("[Insurance Service] Error calculating all employees insurance:", error);
    throw error;
  }
};



