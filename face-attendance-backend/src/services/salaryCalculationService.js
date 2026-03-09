import Salary from "../models/pg/Salary.js";
import SalaryRule from "../models/pg/SalaryRule.js";
import { calculateSeniority } from "./senioritySalaryService.js";
import User from "../models/pg/User.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import ShiftSetting from "../models/pg/ShiftSetting.js";
import { Op } from "sequelize";

// Calculate working days in a month (exclude weekends)
function getWorkingDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  return workingDays;
}

/**
 * Recalculate salary for a specific user/month/year.
 * Re-reads user.baseSalary (latest) and recomputes bonus, deduction, finalSalary,
 * then updates the existing Salary record.
 *
 * @param {number} userId
 * @param {number} month
 * @param {number} year
 * @returns {{ success: boolean, salary?: object, error?: string }}
 */
export async function recalculateSalaryRecord(userId, month, year) {
  try {
    // Reload user to get latest baseSalary
    const user = await User.findByPk(userId);
    if (!user) return { success: false, error: "User not found" };

    const shift = await ShiftSetting.findOne({ where: { active: true } });
    if (!shift) return { success: false, error: "No active shift setting" };

    // Get attendance logs for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const logs = await AttendanceLog.findAll({
      where: {
        userId,
        timestamp: { [Op.between]: [startDate, endDate] }
      },
      order: [["timestamp", "ASC"]]
    });

    // Get active salary rules
    const rules = await SalaryRule.findAll({
      where: { isActive: true },
      order: [["priority", "DESC"]]
    });

    // Latest baseSalary from user record
    let baseSalary = parseFloat(user.baseSalary) || 0;
    let bonus = 0;
    let deduction = 0;

    // Attendance stats
    const lateLogs = logs.filter(log => log.isLate === true);
    const lateCount = lateLogs.length;
    const earlyLeaveLogs = logs.filter(log => log.isEarlyLeave === true);
    const earlyLeaveCount = earlyLeaveLogs.length;

    let totalOvertimeHours = 0;
    const overtimeLogs = logs.filter(log => log.isOvertime === true);
    for (const log of overtimeLogs) {
      if (log.note && log.note.includes("Overtime")) {
        const match = log.note.match(/Overtime\s+(\d+)\s*min/);
        if (match && match[1]) {
          totalOvertimeHours += parseFloat(match[1]) / 60;
        } else {
          totalOvertimeHours += (shift.overtimeThresholdMinutes || 15) / 60;
        }
      } else {
        totalOvertimeHours += (shift.overtimeThresholdMinutes || 15) / 60;
      }
    }

    const totalWorkingDays = getWorkingDaysInMonth(parseInt(year), parseInt(month));
    const presentDaysSet = new Set();
    logs.forEach(log => {
      if (log.type === "IN") {
        const logDate = new Date(log.timestamp).getDate();
        presentDaysSet.add(logDate);
      }
    });
    const absentDays = Math.max(0, totalWorkingDays - presentDaysSet.size);

    // Add allowances from employee profile
    const allowanceFields = ["lunchAllowance", "transportAllowance", "phoneAllowance", "responsibilityAllowance"];
    for (const field of allowanceFields) {
      const val = parseFloat(user[field]) || 0;
      if (val > 0) bonus += val;
    }

    // Apply rules
    for (const rule of rules) {
      let ruleAmount = 0;
      let shouldApply = false;

      switch (rule.triggerType) {
        case "late":
          if (lateCount > 0 && (!rule.threshold || lateCount >= rule.threshold)) {
            shouldApply = true;
            if (rule.amountType === "percentage") {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100;
            } else {
              ruleAmount = parseFloat(rule.amount) * (rule.threshold ? Math.floor(lateCount / rule.threshold) : lateCount);
            }
          }
          break;
        case "early_leave":
          if (earlyLeaveCount > 0 && (!rule.threshold || earlyLeaveCount >= rule.threshold)) {
            shouldApply = true;
            if (rule.amountType === "percentage") {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100;
            } else {
              ruleAmount = parseFloat(rule.amount) * (rule.threshold ? Math.floor(earlyLeaveCount / rule.threshold) : earlyLeaveCount);
            }
          }
          break;
        case "overtime":
          if (totalOvertimeHours > 0 && (!rule.threshold || totalOvertimeHours >= rule.threshold)) {
            shouldApply = true;
            if (rule.amountType === "percentage") {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * totalOvertimeHours;
            } else {
              ruleAmount = parseFloat(rule.amount) * totalOvertimeHours;
            }
          }
          break;
        case "absent":
          if (absentDays > 0 && (!rule.threshold || absentDays >= rule.threshold)) {
            shouldApply = true;
            if (rule.amountType === "percentage") {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * absentDays;
            } else {
              ruleAmount = parseFloat(rule.amount) * absentDays;
            }
          }
          break;
        case "full_attendance": {
          const hasFullAttendance = presentDaysSet.size >= totalWorkingDays && lateCount === 0 && earlyLeaveCount === 0 && absentDays === 0;
          if (hasFullAttendance && (!rule.threshold || totalWorkingDays >= rule.threshold)) {
            shouldApply = true;
            ruleAmount = rule.amountType === "percentage"
              ? (baseSalary * parseFloat(rule.amount) / 100)
              : parseFloat(rule.amount);
          }
          break;
        }
        case "custom": {
          if (rule.name && rule.name.toLowerCase().includes("seniority")) {
            const seniority = calculateSeniority(user.startDate);
            let tier = 0;
            if (seniority >= 10) tier = 4;
            else if (seniority >= 5) tier = 3;
            else if (seniority >= 3) tier = 2;
            else if (seniority >= 1) tier = 1;
            if (tier > 0) {
              shouldApply = true;
              if (rule.amountType === "percentage") {
                ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * tier;
              } else {
                ruleAmount = parseFloat(rule.amount) * tier;
              }
            }
          }
          break;
        }
      }

      if (shouldApply) {
        if (rule.type === "bonus") {
          bonus += ruleAmount;
        } else {
          deduction += Math.abs(ruleAmount);
        }
      }
    }

    const finalSalary = baseSalary + bonus - deduction;

    // Update existing salary record
    const salary = await Salary.findOne({
      where: { userId, month, year }
    });

    if (salary) {
      await salary.update({
        baseSalary,
        bonus,
        deduction,
        finalSalary,
        calculatedAt: new Date()
      });
      return { success: true, salary };
    }

    return { success: false, error: "Salary record not found" };
  } catch (err) {
    console.error(`Error recalculating salary for user ${userId}, ${month}/${year}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Recalculate all non-paid salary records for a list of user IDs.
 * Called when salary grade baseSalary is updated to keep everything in sync.
 *
 * @param {number[]} userIds - Array of user IDs whose salary records need recalculation
 * @returns {{ recalculatedCount: number, errors: string[] }}
 */
export async function recalculatePendingSalariesForUsers(userIds) {
  if (!userIds || userIds.length === 0) return { recalculatedCount: 0, errors: [] };

  // Find all non-paid salary records for these users
  const pendingSalaries = await Salary.findAll({
    where: {
      userId: { [Op.in]: userIds },
      status: { [Op.in]: ["pending", "approved"] }
    }
  });

  let recalculatedCount = 0;
  const errors = [];

  for (const record of pendingSalaries) {
    const result = await recalculateSalaryRecord(record.userId, record.month, record.year);
    if (result.success) {
      recalculatedCount++;
    } else {
      errors.push(`User ${record.userId} (${record.month}/${record.year}): ${result.error}`);
    }
  }

  return { recalculatedCount, errors };
}
