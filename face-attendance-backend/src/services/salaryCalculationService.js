import Salary from "../models/pg/Salary.js";
import SalaryRule from "../models/pg/SalaryRule.js";
import { calculateSeniority } from "./senioritySalaryService.js";
import User from "../models/pg/User.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import ShiftSetting from "../models/pg/ShiftSetting.js";
import SalaryAdvance from "../models/pg/SalaryAdvance.js";
import LeaveRequest from "../models/pg/LeaveRequest.js";
import { Op } from "sequelize";
import { calculateInsurance } from "./insuranceService.js";
import { calculatePersonalIncomeTax } from "./taxService.js";

// Calculate working day numbers (exclude weekends)
function getWorkingDayNumbersInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const workingDayNumbers = new Set();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDayNumbers.add(day);
    }
  }
  return workingDayNumbers;
}

function getWorkingDaysInMonth(year, month) {
  return getWorkingDayNumbersInMonth(year, month).size;
}

export function computeAbsentDays({ totalWorkingDays, presentDayNumbers, approvedLeaveDayNumbers }) {
  const present = new Set(presentDayNumbers || []);
  const approvedLeave = new Set(approvedLeaveDayNumbers || []);
  const presentOrLeave = new Set([...present, ...approvedLeave]);
  return Math.max(0, totalWorkingDays - presentOrLeave.size);
}

export function getSalaryStatusAfterRecalc({ currentStatus }) {
  if (currentStatus === "paid") {
    return { ok: false, error: "Cannot recalculate a paid salary record." };
  }
  if (currentStatus === "approved") {
    return { ok: true, nextStatus: "pending" };
  }
  return { ok: true, nextStatus: "pending" };
}

async function getApprovedLeaveDayNumbersInMonth(userId, month, year) {
  // Get the overlap between [startOfMonth, endOfMonth] and each leave [startDate, endDate]
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const leaves = await LeaveRequest.findAll({
    where: {
      userId,
      status: "approved",
      startDate: { [Op.lte]: endOfMonth },
      endDate: { [Op.gte]: startOfMonth }
    },
    attributes: ["startDate", "endDate"]
  });

  const dayNumbers = new Set();
  for (const lr of leaves) {
    const start = new Date(lr.startDate + "T00:00:00");
    const end = new Date(lr.endDate + "T00:00:00");

    // Clamp to the requested month
    const clampStart = new Date(Math.max(start.getTime(), new Date(startOfMonth + "T00:00:00").getTime()));
    const clampEnd = new Date(Math.min(end.getTime(), new Date(endOfMonth + "T00:00:00").getTime()));

    const dayMillis = 24 * 60 * 60 * 1000;
    for (let t = clampStart.getTime(); t <= clampEnd.getTime(); t += dayMillis) {
      const d = new Date(t);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        dayNumbers.add(d.getDate());
      }
    }
  }

  return dayNumbers;
}

/**
 * Unified salary calculation + persistence.
 * - Incorporates approved leave days into absence computation.
 * - Enforces approval safety:
 *   - approved -> pending when recalculated (re-approval required)
 *   - paid -> blocked (requires explicit revert flow)
 */
export async function calculateSalaryForUser(userId, month, year, { requireExistingSalaryRecord = false } = {}) {
  const user = await User.findByPk(userId);
  if (!user) return { success: false, error: "User not found" };

  const shift = await ShiftSetting.findOne({ where: { active: true } });
  if (!shift) return { success: false, error: "No active shift setting" };

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const logs = await AttendanceLog.findAll({
    where: {
      userId,
      timestamp: { [Op.between]: [startDate, endDate] }
    },
    order: [["timestamp", "ASC"]]
  });

  const rules = await SalaryRule.findAll({
    where: { isActive: true },
    order: [["priority", "DESC"]]
  });

  const baseSalary = parseFloat(user.baseSalary) || 0;
  let bonus = 0;
  let deduction = 0;

  const lateLogs = logs.filter(log => log.isLate === true);
  const lateCount = lateLogs.length;
  const earlyLeaveLogs = logs.filter(log => log.isEarlyLeave === true);
  const earlyLeaveCount = earlyLeaveLogs.length;

  // Overtime hours
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

  // Working days + present days (IN logs)
  const workingDayNumbers = getWorkingDayNumbersInMonth(parseInt(year), parseInt(month));
  const presentDayNumbers = new Set();
  logs.forEach(log => {
    if (log.type === "IN") {
      const dayNum = new Date(log.timestamp).getDate();
      if (workingDayNumbers.has(dayNum)) {
        presentDayNumbers.add(dayNum);
      }
    }
  });

  // Approved leave days are treated as present (not absent).
  const approvedLeaveDayNumbers = await getApprovedLeaveDayNumbersInMonth(userId, parseInt(month), parseInt(year));
  const totalWorkingDays = workingDayNumbers.size;
  const absentDays = computeAbsentDays({
    totalWorkingDays,
    presentDayNumbers,
    approvedLeaveDayNumbers
  });

  // Allowances
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
        const coveredWorkingDays = new Set([...presentDayNumbers, ...approvedLeaveDayNumbers]).size;
        const hasFullAttendance = coveredWorkingDays >= totalWorkingDays && lateCount === 0 && earlyLeaveCount === 0 && absentDays === 0;
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
      if (rule.type === "bonus") bonus += ruleAmount;
      else deduction += Math.abs(ruleAmount);
    }
  }

  // Find/create salary record
  const existingSalary = await Salary.findOne({ where: { userId, month, year } });
  if (requireExistingSalaryRecord && !existingSalary) {
    return { success: false, error: "Salary record not found" };
  }

  const [salary, created] = existingSalary
    ? [existingSalary, false]
    : await Salary.findOrCreate({
        where: { userId, month, year },
        defaults: {
          userId,
          month,
          year,
          status: "pending",
          calculatedAt: new Date(),
          baseSalary: 0,
          bonus: 0,
          grossSalary: 0,
          deduction: 0,
          advanceDeduction: 0,
          finalSalary: 0
        }
      });

  // Approval safety
  const statusDecision = getSalaryStatusAfterRecalc({ currentStatus: salary.status });
  if (!statusDecision.ok) {
    return { success: false, error: statusDecision.error };
  }

  // Salary advance deduction
  const salaryAdvance = await SalaryAdvance.findOne({
    where: {
      userId,
      month: parseInt(month),
      year: parseInt(year),
      approvalStatus: "approved",
      [Op.or]: [{ isDeducted: false }, { salaryId: salary.id }]
    }
  });

  let advanceDeduction = 0;
  if (salaryAdvance && parseFloat(salaryAdvance.amount) > 0) {
    advanceDeduction = parseFloat(salaryAdvance.amount);
    deduction += advanceDeduction;
  }

  const grossSalary = baseSalary + bonus;

  /** BHXH + BHYT + BHTN (NLĐ) + thuế TNCN — cộng vào tổng khấu trừ như kế toán thực tế */
  try {
    const insurance = await calculateInsurance(userId, parseInt(month, 10), parseInt(year, 10));
    const tax = await calculatePersonalIncomeTax(userId, grossSalary, parseInt(month, 10), parseInt(year, 10));
    deduction += insurance.employee.total + tax.taxAmount;
  } catch (err) {
    console.error("[salaryCalculation] BH/thuế:", err.message);
  }

  const finalSalary = parseFloat((grossSalary - deduction).toFixed(2));

  const statusToSet = statusDecision.nextStatus;
  await salary.update({
    baseSalary,
    bonus,
    grossSalary,
    deduction,
    advanceDeduction,
    finalSalary,
    calculatedAt: new Date(),
    status: statusToSet,
    paidAt: statusToSet === "pending" ? null : salary.paidAt
  });

  // Bind/deduct salary advance after salary calculation
  if (salaryAdvance && salaryAdvance.isDeducted === false && advanceDeduction > 0) {
    await salaryAdvance.update({
      isDeducted: true,
      deductedAt: new Date(),
      salaryId: salary.id
    });
  }

  return {
    success: true,
    salary,
    attendance: {
      totalLogs: logs.length,
      lateCount,
      earlyLeaveCount,
      overtimeHours: totalOvertimeHours,
      absentDays
    },
    meta: { created }
  };
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
  return calculateSalaryForUser(userId, month, year, { requireExistingSalaryRecord: true });
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
