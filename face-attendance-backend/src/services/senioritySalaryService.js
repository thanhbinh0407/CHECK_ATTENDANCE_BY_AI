import User from "../models/pg/User.js";
import SalaryGrade from "../models/pg/SalaryGrade.js";
import Notification from "../models/pg/Notification.js";
import { Op } from "sequelize";

/**
 * Calculate years of service (seniority) for an employee.
 * Uses user.startDate (the actual DB field).
 */
export const calculateSeniority = (startDate) => {
  if (!startDate) return 0;
  const today = new Date();
  const hire = new Date(startDate);
  let years = today.getFullYear() - hire.getFullYear();
  const monthDiff = today.getMonth() - hire.getMonth();
  const dayDiff   = today.getDate()  - hire.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
  return Math.max(0, years);
};

/**
 * Find the best salary grade the employee qualifies for based on seniority.
 * Returns the active grade with the highest baseSalary whose minYearsOfService <= years.
 */
export const getQualifiedGrade = async (years) => {
  const grades = await SalaryGrade.findAll({
    where: {
      isActive: true,
      minYearsOfService: { [Op.lte]: years }
    },
    order: [['baseSalary', 'DESC']]
  });
  return grades.length > 0 ? grades[0] : null;
};

/**
 * Apply seniority-based grade promotion for a specific user.
 * Finds the best active grade the employee qualifies for (minYearsOfService <= seniority years)
 * and promotes them if that grade has a higher baseSalary than their current salary.
 * Salary is never reduced.
 */
export const applySenioritySalaryIncrease = async (userId, options = {}) => {
  const { dryRun = false, notifyUser = true } = options;

  try {
    const user = await User.findByPk(userId, {
      include: [{ model: SalaryGrade }]
    });

    if (!user) return { success: false, message: "User not found" };
    if (!user.startDate) return { success: false, message: "Employee start date not set" };

    const seniority    = calculateSeniority(user.startDate);
    const oldBaseSalary = parseFloat(user.baseSalary) || 0;

    const bestGrade = await getQualifiedGrade(seniority);

    if (!bestGrade) {
      return {
        success: false,
        message: `No active salary grade found for ${seniority} year(s) of service`,
        seniority
      };
    }

    const newBaseSalary = parseFloat(bestGrade.baseSalary);

    // Never reduce salary
    if (newBaseSalary <= oldBaseSalary) {
      return {
        success: false,
        message: `Already at or above qualified grade "${bestGrade.name}" (${newBaseSalary.toLocaleString('vi-VN')} VND)`,
        seniority,
        qualifiedGrade: bestGrade.name,
        oldBaseSalary,
        newBaseSalary
      };
    }

    if (dryRun) {
      return {
        success: true,
        message: `Would promote to grade "${bestGrade.name}" (${newBaseSalary.toLocaleString('vi-VN')} VND) for ${seniority} year(s) of service`,
        seniority,
        qualifiedGrade: bestGrade.name,
        oldBaseSalary,
        newBaseSalary
      };
    }

    await user.update({ salaryGradeId: bestGrade.id, baseSalary: newBaseSalary });

    if (notifyUser) {
      await Notification.create({
        userId: user.id,
        type:    'salary_increase',
        title:   'Salary Grade Promotion — Seniority',
        message: `Your salary grade has been updated to "${bestGrade.name}" with base salary ${newBaseSalary.toLocaleString('vi-VN')} VND based on ${seniority} year(s) of service.`,
        isRead:  false
      });
    }

    return {
      success:        true,
      message:        `Promoted to grade "${bestGrade.name}" for ${seniority} year(s) of service`,
      seniority,
      qualifiedGrade: bestGrade.name,
      oldBaseSalary,
      newBaseSalary
    };
  } catch (error) {
    console.error("Error applying seniority salary increase:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Apply seniority salary increases for all eligible active employees.
 */
export const applySenioritySalaryIncreasesForAll = async (options = {}) => {
  const { dryRun = false, notifyUsers = true, minSeniority = 0 } = options;

  try {
    const users = await User.findAll({
      where: {
        startDate:        { [Op.not]: null },
        employmentStatus: 'active'
      },
      include: [{ model: SalaryGrade }]
    });

    const results = { total: users.length, processed: 0, upgraded: 0, skipped: 0, errors: 0, details: [] };

    for (const user of users) {
      try {
        const seniority = calculateSeniority(user.startDate);

        if (seniority < minSeniority) {
          results.skipped++;
          results.details.push({
            userId: user.id, name: user.name, seniority,
            status: 'skipped',
            reason: `Seniority (${seniority} yrs) below minimum (${minSeniority} yrs)`
          });
          continue;
        }

        const result = await applySenioritySalaryIncrease(user.id, { dryRun, notifyUser: notifyUsers });
        results.processed++;
        result.success ? results.upgraded++ : results.skipped++;
        results.details.push({ userId: user.id, name: user.name, seniority, ...result });
      } catch (error) {
        results.errors++;
        results.details.push({ userId: user.id, name: user.name, status: 'error', message: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error("Error applying seniority salary increases for all:", error);
    return { success: false, message: error.message };
  }
};
