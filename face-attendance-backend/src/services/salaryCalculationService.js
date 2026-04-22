import Salary from "../models/pg/Salary.js";
import SalaryRule from "../models/pg/SalaryRule.js";
import Department from "../models/pg/Department.js";
import JobTitle from "../models/pg/JobTitle.js";
import User from "../models/pg/User.js";
import { evaluateCustomSalaryRule } from "./salaryRuleCustomEval.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import ShiftSetting from "../models/pg/ShiftSetting.js";
import SalaryAdvance from "../models/pg/SalaryAdvance.js";
import LeaveRequest from "../models/pg/LeaveRequest.js";
import { Op } from "sequelize";
import { calculateInsurance } from "./insuranceService.js";
import { calculatePersonalIncomeTax } from "./taxService.js";

// Calculate working day numbers (exclude weekends)
export function getWorkingDayNumbersInMonth(year, month) {
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

export function getWorkingDaysInMonth(year, month) {
  return getWorkingDayNumbersInMonth(year, month).size;
}

/**
 * Approved leave rows → set of calendar day-of-month numbers (1–31) that are
 * working days in [year, month], matching calculateSalaryForUser semantics.
 */
export function getApprovedLeaveDayNumbersFromRequests(leaves, year, month) {
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const dayNumbers = new Set();
  for (const lr of leaves) {
    const rawStart = lr.startDate;
    const rawEnd = lr.endDate;
    const start = rawStart instanceof Date
      ? new Date(rawStart.getFullYear(), rawStart.getMonth(), rawStart.getDate())
      : new Date(String(rawStart).slice(0, 10) + "T00:00:00");
    const end = rawEnd instanceof Date
      ? new Date(rawEnd.getFullYear(), rawEnd.getMonth(), rawEnd.getDate())
      : new Date(String(rawEnd).slice(0, 10) + "T00:00:00");

    const clampStart = new Date(
      Math.max(start.getTime(), new Date(startOfMonth + "T00:00:00").getTime())
    );
    const clampEnd = new Date(
      Math.min(end.getTime(), new Date(endOfMonth + "T00:00:00").getTime())
    );

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

export async function getApprovedLeaveDayNumbersInMonth(userId, month, year) {
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

  return getApprovedLeaveDayNumbersFromRequests(leaves, year, month);
}

/**
 * Unified salary calculation + persistence.
 * - Incorporates approved leave days into absence computation.
 * - Enforces approval safety:
 *   - approved -> pending when recalculated (re-approval required)
 *   - paid -> blocked (requires explicit revert flow)
 * @param {{ requireExistingSalaryRecord?: boolean, persist?: boolean, previewSalaryAdvanceId?: number|null }} [options]
 * - persist: false — compute only; do not write Salary or SalaryAdvance (for approver preview).
 * - previewSalaryAdvanceId — when persist is false, use this advance row’s amount as the advance deduction (e.g. pending request).
 */
export async function calculateSalaryForUser(userId, month, year, options = {}) {
  const {
    requireExistingSalaryRecord = false,
    persist = true,
    previewSalaryAdvanceId = null,
  } = options;
  const user = await User.findByPk(userId, {
    include: [
      { model: Department, attributes: ["code", "name"] },
      { model: JobTitle, attributes: ["code", "name"] }
    ]
  });
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
  let absentDays = computeAbsentDays({
    totalWorkingDays,
    presentDayNumbers,
    approvedLeaveDayNumbers
  });
  // Không có bản ghi chấm công (IN) trong tháng → không coi là vắng cả tháng (tránh phạt cố định ~22×1M khi chưa có dữ liệu / tháng chưa đóng)
  if (!logs.some((l) => l.type === "IN")) {
    absentDays = 0;
  }

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
        const customOut = evaluateCustomSalaryRule(rule, user, baseSalary);
        if (customOut.shouldApply) {
          shouldApply = true;
          ruleAmount = customOut.ruleAmount;
        }
        break;
      }
    }

    if (shouldApply) {
      if (rule.type === "bonus") bonus += ruleAmount;
      else deduction += Math.abs(ruleAmount);
    }
  }

  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  const existingSalary = await Salary.findOne({ where: { userId, month: m, year: y } });
  if (requireExistingSalaryRecord && !existingSalary) {
    return { success: false, error: "Salary record not found" };
  }

  if (!persist) {
    if (existingSalary && existingSalary.status === "paid") {
      return { success: false, error: "Cannot preview: salary record is already paid." };
    }

    let advanceDeduction = 0;
    if (previewSalaryAdvanceId != null) {
      const adv = await SalaryAdvance.findByPk(previewSalaryAdvanceId);
      if (
        !adv ||
        Number(adv.userId) !== Number(userId) ||
        parseInt(adv.month, 10) !== m ||
        parseInt(adv.year, 10) !== y
      ) {
        return { success: false, error: "Invalid salary advance for preview" };
      }
      advanceDeduction = parseFloat(adv.amount) || 0;
    } else {
      const orConds = [{ isDeducted: false }];
      if (existingSalary?.id) orConds.push({ salaryId: existingSalary.id });
      const adv = await SalaryAdvance.findOne({
        where: {
          userId,
          month: m,
          year: y,
          approvalStatus: "approved",
          [Op.or]: orConds,
        },
      });
      if (adv) advanceDeduction = parseFloat(adv.amount) || 0;
    }

    const deductionFromRules = deduction;
    let totalDeduction = deductionFromRules + advanceDeduction;
    const grossSalary = baseSalary + bonus;

    try {
      const insurance = await calculateInsurance(userId, m, y);
      const tax = await calculatePersonalIncomeTax(userId, grossSalary, m, y);
      totalDeduction += insurance.employee.total + tax.taxAmount;
    } catch (err) {
      console.error("[salaryCalculation] BH/thuế:", err.message);
    }

    const finalSalary = parseFloat((grossSalary - totalDeduction).toFixed(2));

    return {
      success: true,
      salary: {
        id: existingSalary?.id ?? null,
        userId,
        month: m,
        year: y,
        baseSalary,
        bonus,
        grossSalary,
        deduction: totalDeduction,
        advanceDeduction,
        finalSalary,
        status: existingSalary?.status ?? "pending",
      },
      attendance: {
        totalLogs: logs.length,
        lateCount,
        earlyLeaveCount,
        overtimeHours: totalOvertimeHours,
        absentDays,
      },
      meta: { preview: true, persisted: false, deductionFromRules },
    };
  }

  const [salary, created] = existingSalary
    ? [existingSalary, false]
    : await Salary.findOrCreate({
        where: { userId, month: m, year: y },
        defaults: {
          userId,
          month: m,
          year: y,
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
      month: m,
      year: y,
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
    const insurance = await calculateInsurance(userId, m, y);
    const tax = await calculatePersonalIncomeTax(userId, grossSalary, m, y);
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
  return calculateSalaryForUser(userId, month, year, {
    requireExistingSalaryRecord: true,
    persist: true,
  });
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
