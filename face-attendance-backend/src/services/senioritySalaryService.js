import User from "../models/pg/User.js";
import SalaryGrade from "../models/pg/SalaryGrade.js";
import Notification from "../models/pg/Notification.js";
import { Op } from "sequelize";

/**
 * Calculate years of service (seniority) for an employee
 * @param {Date} hireDate - Employee's hire date
 * @returns {number} - Years of service
 */
export const calculateSeniority = (hireDate) => {
  if (!hireDate) return 0;
  const today = new Date();
  const hire = new Date(hireDate);
  const years = today.getFullYear() - hire.getFullYear();
  const monthDiff = today.getMonth() - hire.getMonth();
  const dayDiff = today.getDate() - hire.getDate();
  
  // Adjust if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return years - 1;
  }
  return years;
};

/**
 * Get salary grade based on seniority
 * @param {number} seniority - Years of service
 * @param {number} currentLevel - Current salary grade level
 * @returns {Object|null} - Next salary grade or null if no upgrade available
 */
export const getNextSalaryGrade = async (seniority, currentLevel = 1) => {
  // Define seniority thresholds for salary increases
  // Example: Every 2 years, increase salary grade by 1 level
  const yearsPerLevel = 2; // Can be configured
  
  const targetLevel = Math.floor(seniority / yearsPerLevel) + 1;
  
  if (targetLevel <= currentLevel) {
    return null; // No upgrade needed
  }
  
  // Find the salary grade for the target level
  const grade = await SalaryGrade.findOne({
    where: {
      level: targetLevel,
      isActive: true
    },
    order: [["level", "ASC"]]
  });
  
  return grade;
};

/**
 * Apply automatic salary increase based on seniority
 * @param {number} userId - User ID
 * @param {Object} options - Options for salary increase
 * @returns {Object} - Result of the operation
 */
export const applySenioritySalaryIncrease = async (userId, options = {}) => {
  const { dryRun = false, notifyUser = true } = options;
  
  try {
    const user = await User.findByPk(userId, {
      include: [{ model: SalaryGrade }]
    });
    
    if (!user) {
      return {
        success: false,
        message: "User not found"
      };
    }
    
    if (!user.hireDate) {
      return {
        success: false,
        message: "User hire date not set"
      };
    }
    
    const seniority = calculateSeniority(user.hireDate);
    const currentLevel = user.salaryGradeId && user.SalaryGrade ? user.SalaryGrade.level : 1;
    
    const nextGrade = await getNextSalaryGrade(seniority, currentLevel);
    
    if (!nextGrade) {
      return {
        success: false,
        message: `No salary upgrade available. Current level: ${currentLevel}, Seniority: ${seniority} years`,
        seniority,
        currentLevel
      };
    }
    
    if (dryRun) {
      return {
        success: true,
        message: `Would upgrade from level ${currentLevel} to level ${nextGrade.level}`,
        seniority,
        currentLevel,
        newLevel: nextGrade.level,
        newBaseSalary: nextGrade.baseSalary,
        grade: nextGrade
      };
    }
    
    // Update user's salary grade and base salary
    const oldBaseSalary = user.baseSalary || 0;
    await user.update({
      salaryGradeId: nextGrade.id,
      baseSalary: nextGrade.baseSalary
    });
    
    // Notify user if requested
    if (notifyUser) {
      await Notification.create({
        userId: user.id,
        type: 'salary_increase',
        title: 'Salary Increase - Seniority',
        message: `Your salary has been increased to ${nextGrade.name} (Level ${nextGrade.level}) based on ${seniority} years of service. New base salary: ${nextGrade.baseSalary.toLocaleString('vi-VN')} VND`,
        isRead: false
      });
    }
    
    return {
      success: true,
      message: `Salary upgraded from level ${currentLevel} to level ${nextGrade.level}`,
      seniority,
      currentLevel,
      newLevel: nextGrade.level,
      oldBaseSalary,
      newBaseSalary: nextGrade.baseSalary,
      grade: nextGrade
    };
  } catch (error) {
    console.error("Error applying seniority salary increase:", error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Apply seniority salary increases for all eligible employees
 * @param {Object} options - Options for batch processing
 * @returns {Object} - Summary of results
 */
export const applySenioritySalaryIncreasesForAll = async (options = {}) => {
  const { dryRun = false, notifyUsers = true, minSeniority = 0 } = options;
  
  try {
    const users = await User.findAll({
      where: {
        hireDate: { [Op.not]: null },
        employmentStatus: 'active'
      },
      include: [{ model: SalaryGrade }]
    });
    
    const results = {
      total: users.length,
      processed: 0,
      upgraded: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    for (const user of users) {
      try {
        const seniority = calculateSeniority(user.hireDate);
        
        if (seniority < minSeniority) {
          results.skipped++;
          results.details.push({
            userId: user.id,
            name: user.name,
            seniority,
            status: 'skipped',
            reason: `Seniority (${seniority} years) below minimum (${minSeniority} years)`
          });
          continue;
        }
        
        const result = await applySenioritySalaryIncrease(user.id, {
          dryRun,
          notifyUser: notifyUsers
        });
        
        results.processed++;
        
        if (result.success) {
          results.upgraded++;
        } else {
          results.skipped++;
        }
        
        results.details.push({
          userId: user.id,
          name: user.name,
          seniority,
          ...result
        });
      } catch (error) {
        results.errors++;
        results.details.push({
          userId: user.id,
          name: user.name,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error applying seniority salary increases for all:", error);
    return {
      success: false,
      message: error.message
    };
  }
};

