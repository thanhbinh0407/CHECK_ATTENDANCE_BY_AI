import AttendanceLog from "../models/pg/AttendanceLog.js";
import Salary from "../models/pg/Salary.js";
import User from "../models/pg/User.js";
import SalaryRule from "../models/pg/SalaryRule.js";
import { ShiftSetting } from "../models/pg/index.js";
import { Op } from "sequelize";
import { calculateSeniority } from "./senioritySalaryService.js";
import { calculateInsurance } from "./insuranceService.js";
import { calculatePersonalIncomeTax } from "./taxService.js";

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
 * Recomputes bonus/deduction line items for a user/month (same logic as employee portal).
 * @returns {Promise<object>}
 */
export async function getSalaryBreakdownDetail(userId, month, year) {
  const salary = await Salary.findOne({
    where: { userId, month: parseInt(month, 10), year: parseInt(year, 10) }
  });

  if (!salary) {
    const err = new Error("Salary record not found");
    err.code = "SALARY_NOT_FOUND";
    throw err;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

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

  const shift = await ShiftSetting.findOne({ where: { active: true } });

  const lateLogs = logs.filter((log) => log.isLate === true);
  const lateCount = lateLogs.length;
  const earlyLeaveLogs = logs.filter((log) => log.isEarlyLeave === true);
  const earlyLeaveCount = earlyLeaveLogs.length;

  let totalOvertimeHours = 0;
  const overtimeLogs = logs.filter((log) => log.isOvertime === true);
  for (const log of overtimeLogs) {
    if (log.note && log.note.includes("Overtime")) {
      const match = log.note.match(/Overtime\s+(\d+)\s*min/);
      if (match && match[1]) {
        totalOvertimeHours += parseFloat(match[1]) / 60;
      } else {
        totalOvertimeHours += (shift?.overtimeThresholdMinutes || 15) / 60;
      }
    } else {
      totalOvertimeHours += (shift?.overtimeThresholdMinutes || 15) / 60;
    }
  }

  const totalWorkingDays = getWorkingDaysInMonth(parseInt(year, 10), parseInt(month, 10));
  const presentDaysSet = new Set();
  logs.forEach((log) => {
    if (log.type === "IN") {
      const logDate = new Date(log.timestamp).getDate();
      presentDaysSet.add(logDate);
    }
  });
  const absentDays = Math.max(0, totalWorkingDays - presentDaysSet.size);

  const baseSalary = parseFloat(user.baseSalary) || 0;
  const bonusBreakdown = [];
  const deductionBreakdown = [];

  const allowances = [
    { field: "lunchAllowance", name: "Lunch allowance", reason: "Monthly lunch allowance" },
    { field: "transportAllowance", name: "Transport allowance", reason: "Monthly transport allowance" },
    { field: "phoneAllowance", name: "Phone allowance", reason: "Monthly phone allowance" },
    { field: "responsibilityAllowance", name: "Responsibility allowance", reason: "Job responsibility allowance" }
  ];
  for (const al of allowances) {
    const val = parseFloat(user[al.field]) || 0;
    if (val > 0) {
      bonusBreakdown.push({
        ruleName: al.name,
        ruleDescription: al.reason,
        reason: al.reason,
        amount: val,
        quantity: 1,
        amountType: "fixed",
        triggerType: "allowance"
      });
    }
  }

  for (const rule of rules) {
    let ruleAmount = 0;
    let shouldApply = false;
    let reason = "";
    let quantity = 0;

    switch (rule.triggerType) {
      case "late":
        if (lateCount > 0 && (!rule.threshold || lateCount >= rule.threshold)) {
          shouldApply = true;
          quantity = lateCount;
          if (rule.amountType === "percentage") {
            ruleAmount = baseSalary * parseFloat(rule.amount) / 100;
          } else {
            ruleAmount = parseFloat(rule.amount) * (rule.threshold ? Math.floor(lateCount / rule.threshold) : lateCount);
          }
          reason = `Late ${lateCount} time(s)${rule.threshold ? ` (applies when >= ${rule.threshold})` : ""}`;
        }
        break;
      case "early_leave":
        if (earlyLeaveCount > 0 && (!rule.threshold || earlyLeaveCount >= rule.threshold)) {
          shouldApply = true;
          quantity = earlyLeaveCount;
          if (rule.amountType === "percentage") {
            ruleAmount = baseSalary * parseFloat(rule.amount) / 100;
          } else {
            ruleAmount = parseFloat(rule.amount) * (rule.threshold ? Math.floor(earlyLeaveCount / rule.threshold) : earlyLeaveCount);
          }
          reason = `Early leave ${earlyLeaveCount} time(s)${rule.threshold ? ` (applies when >= ${rule.threshold})` : ""}`;
        }
        break;
      case "overtime":
        if (totalOvertimeHours > 0 && (!rule.threshold || totalOvertimeHours >= rule.threshold)) {
          shouldApply = true;
          quantity = totalOvertimeHours;
          if (rule.amountType === "percentage") {
            ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * totalOvertimeHours;
          } else {
            ruleAmount = parseFloat(rule.amount) * totalOvertimeHours;
          }
          reason = `Overtime ${totalOvertimeHours.toFixed(2)} h${rule.threshold ? ` (applies when >= ${rule.threshold} h)` : ""}`;
        }
        break;
      case "absent":
        if (absentDays > 0 && (!rule.threshold || absentDays >= rule.threshold)) {
          shouldApply = true;
          quantity = absentDays;
          if (rule.amountType === "percentage") {
            ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * absentDays;
          } else {
            ruleAmount = parseFloat(rule.amount) * absentDays;
          }
          reason = `Absent ${absentDays} day(s)${rule.threshold ? ` (applies when >= ${rule.threshold} day(s))` : ""}`;
        }
        break;
      case "full_attendance": {
        const hasFullAttendance =
          presentDaysSet.size >= totalWorkingDays && lateCount === 0 && earlyLeaveCount === 0 && absentDays === 0;
        if (hasFullAttendance && (!rule.threshold || totalWorkingDays >= rule.threshold)) {
          shouldApply = true;
          quantity = totalWorkingDays;
          ruleAmount =
            rule.amountType === "percentage"
              ? baseSalary * parseFloat(rule.amount) / 100
              : parseFloat(rule.amount);
          reason = `Full attendance ${totalWorkingDays} working day(s) (no late, no early leave, no absence)`;
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
            quantity = seniority;
            if (rule.amountType === "percentage") {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * tier;
            } else {
              ruleAmount = parseFloat(rule.amount) * tier;
            }
            reason = `Seniority ${seniority} year(s) (tier ${tier})`;
          }
        }
        break;
      }
      default:
        break;
    }

    if (shouldApply) {
      const item = {
        ruleName: rule.name,
        ruleDescription: rule.description || reason,
        reason,
        amount: parseFloat(ruleAmount.toFixed(2)),
        quantity,
        amountType: rule.amountType,
        triggerType: rule.triggerType
      };

      if (rule.type === "bonus") {
        bonusBreakdown.push(item);
      } else {
        deductionBreakdown.push(item);
      }
    }
  }

  const advanceDeduction = parseFloat(salary.advanceDeduction) || 0;
  if (advanceDeduction > 0) {
    deductionBreakdown.push({
      ruleName: "Salary advance deduction",
      ruleDescription: "Deduct approved salary advance",
      reason: `Salary advance ${month}/${year}`,
      amount: parseFloat(advanceDeduction.toFixed(2)),
      quantity: 1,
      amountType: "fixed",
      triggerType: "salary_advance"
    });
  }

  /** BHXH / BHYT / BHTN / TNCN — cùng logic với bước tính lương (đã cộng vào salaries.deduction) */
  try {
    const insurance = await calculateInsurance(userId, parseInt(month, 10), parseInt(year, 10));
    const grossForTax = parseFloat(salary.grossSalary) || 0;
    const tax = await calculatePersonalIncomeTax(
      userId,
      grossForTax,
      parseInt(month, 10),
      parseInt(year, 10)
    );
    const baseStr = Number(insurance.insuranceBase || 0).toLocaleString("en-US");
    deductionBreakdown.push(
      {
        ruleName: "Social insurance (employee)",
        ruleDescription: "Social insurance — employee share",
        reason: `Insurance salary base: ${baseStr} ₫`,
        amount: parseFloat(insurance.employee.socialInsurance.toFixed(2)),
        quantity: 1,
        amountType: "percentage",
        triggerType: "insurance_social"
      },
      {
        ruleName: "Health insurance (employee)",
        ruleDescription: "Health insurance — employee share",
        reason: `Insurance salary base: ${baseStr} ₫`,
        amount: parseFloat(insurance.employee.healthInsurance.toFixed(2)),
        quantity: 1,
        amountType: "percentage",
        triggerType: "insurance_health"
      },
      {
        ruleName: "Unemployment insurance (employee)",
        ruleDescription: "Unemployment insurance — employee share",
        reason: `Insurance salary base: ${baseStr} ₫`,
        amount: parseFloat(insurance.employee.unemploymentInsurance.toFixed(2)),
        quantity: 1,
        amountType: "percentage",
        triggerType: "insurance_unemployment"
      },
      {
        ruleName: "Personal income tax (PIT)",
        ruleDescription: "Progressive tax (monthly estimate)",
        reason:
          tax.dependentCount > 0
            ? `Family deductions: ${tax.dependentCount} dependent(s)`
            : "Personal deduction (statutory)",
        amount: parseFloat(tax.taxAmount.toFixed(2)),
        quantity: 1,
        amountType: "fixed",
        triggerType: "personal_income_tax"
      }
    );
  } catch (err) {
    console.error("[salaryBreakdownDetail] BH/thuế:", err.message);
  }

  const totalBonus = bonusBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const totalDeduction = deductionBreakdown.reduce((sum, item) => sum + item.amount, 0);

  return {
    baseSalary: parseFloat(baseSalary),
    bonusBreakdown,
    deductionBreakdown,
    totalBonus,
    totalDeduction,
    attendance: {
      totalDays: totalWorkingDays,
      presentDays: presentDaysSet.size,
      absentDays,
      lateCount,
      earlyLeaveCount,
      overtimeHours: parseFloat(totalOvertimeHours.toFixed(2))
    }
  };
}
