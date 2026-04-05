import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import Salary from "../models/pg/Salary.js";
import User from "../models/pg/User.js";
import SalaryRule from "../models/pg/SalaryRule.js";
import JobHistory from "../models/pg/JobHistory.js";
import SalaryHistory from "../models/pg/SalaryHistory.js";
import Department from "../models/pg/Department.js";
import JobTitle from "../models/pg/JobTitle.js";
import { ShiftSetting } from "../models/pg/index.js";
import { Op } from "sequelize";
import { calculateSeniority } from "../services/senioritySalaryService.js";

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

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get current user's attendance logs
router.get("/attendance", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year, startDate, endDate } = req.query;

    const where = { userId };

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.timestamp = { [Op.between]: [start, end] };
    } else if (startDate && endDate) {
      where.timestamp = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const logs = await AttendanceLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: 1000
    });

    return res.json({
      status: "success",
      logs
    });
  } catch (err) {
    console.error("Error fetching employee attendance:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

// Get current user's salary records
router.get("/salary", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    const where = { userId };
    if (month) where.month = month;
    if (year) where.year = year;

    const salaries = await Salary.findAll({
      where,
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    return res.json({
      status: "success",
      salaries
    });
  } catch (err) {
    console.error("Error fetching employee salary:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

// Get salary breakdown details
router.get("/salary/breakdown", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }

    const salary = await Salary.findOne({
      where: { userId, month: parseInt(month), year: parseInt(year) }
    });

    if (!salary) {
      return res.status(404).json({
        status: "error",
        message: "Salary record not found"
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    // Get attendance logs
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const logs = await AttendanceLog.findAll({
      where: {
        userId,
        timestamp: { [Op.between]: [startDate, endDate] }
      },
      order: [['timestamp', 'ASC']]
    });

    // Get salary rules
    const rules = await SalaryRule.findAll({
      where: { isActive: true },
      order: [['priority', 'DESC']]
    });

    // Get shift settings
    const shift = await ShiftSetting.findOne({ where: { active: true } });

    // Calculate statistics
    const lateLogs = logs.filter(log => log.isLate === true);
    const lateCount = lateLogs.length;
    const earlyLeaveLogs = logs.filter(log => log.isEarlyLeave === true);
    const earlyLeaveCount = earlyLeaveLogs.length;
    
    let totalOvertimeHours = 0;
    const overtimeLogs = logs.filter(log => log.isOvertime === true);
    for (const log of overtimeLogs) {
      if (log.note && log.note.includes('Overtime')) {
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

    const totalWorkingDays = getWorkingDaysInMonth(parseInt(year), parseInt(month));
    const presentDaysSet = new Set();
    logs.forEach(log => {
      if (log.type === 'IN') {
        const logDate = new Date(log.timestamp).getDate();
        presentDaysSet.add(logDate);
      }
    });
    const absentDays = Math.max(0, totalWorkingDays - presentDaysSet.size);

    const baseSalary = parseFloat(user.baseSalary) || 0;
    const bonusBreakdown = [];
    const deductionBreakdown = [];

    // Add allowances from employee profile
    const allowances = [
      { field: 'lunchAllowance', name: 'Lunch allowance', reason: 'Monthly lunch allowance' },
      { field: 'transportAllowance', name: 'Transport allowance', reason: 'Monthly transport allowance' },
      { field: 'phoneAllowance', name: 'Phone allowance', reason: 'Monthly phone allowance' },
      { field: 'responsibilityAllowance', name: 'Responsibility allowance', reason: 'Responsibility allowance' }
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
          amountType: 'fixed',
          triggerType: 'allowance'
        });
      }
    }

    // Apply rules and build breakdown
    for (const rule of rules) {
      let ruleAmount = 0;
      let shouldApply = false;
      let reason = "";
      let quantity = 0;

      switch (rule.triggerType) {
        case 'late':
          if (lateCount > 0 && (!rule.threshold || lateCount >= rule.threshold)) {
            shouldApply = true;
            quantity = lateCount;
            if (rule.amountType === 'percentage') {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100;
            } else {
              ruleAmount = parseFloat(rule.amount) * (rule.threshold ? Math.floor(lateCount / rule.threshold) : lateCount);
            }
            reason = `Late ${lateCount} time(s)${rule.threshold ? ` (applied when >= ${rule.threshold} times)` : ''}`;
          }
          break;
        case 'early_leave':
          if (earlyLeaveCount > 0 && (!rule.threshold || earlyLeaveCount >= rule.threshold)) {
            shouldApply = true;
            quantity = earlyLeaveCount;
            if (rule.amountType === 'percentage') {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100;
            } else {
              ruleAmount = parseFloat(rule.amount) * (rule.threshold ? Math.floor(earlyLeaveCount / rule.threshold) : earlyLeaveCount);
            }
            reason = `Early leave ${earlyLeaveCount} time(s)${rule.threshold ? ` (applied when >= ${rule.threshold} times)` : ''}`;
          }
          break;
        case 'overtime':
          if (totalOvertimeHours > 0 && (!rule.threshold || totalOvertimeHours >= rule.threshold)) {
            shouldApply = true;
            quantity = totalOvertimeHours;
            if (rule.amountType === 'percentage') {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * totalOvertimeHours;
            } else {
              ruleAmount = parseFloat(rule.amount) * totalOvertimeHours;
            }
            reason = `Overtime ${totalOvertimeHours.toFixed(2)} hours${rule.threshold ? ` (applied when >= ${rule.threshold} hours)` : ''}`;
          }
          break;
        case 'absent':
          if (absentDays > 0 && (!rule.threshold || absentDays >= rule.threshold)) {
            shouldApply = true;
            quantity = absentDays;
            if (rule.amountType === 'percentage') {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * absentDays;
            } else {
              ruleAmount = parseFloat(rule.amount) * absentDays;
            }
            reason = `Absent ${absentDays} day(s)${rule.threshold ? ` (applied when >= ${rule.threshold} days)` : ''}`;
          }
          break;
        case 'full_attendance': {
          const hasFullAttendance = presentDaysSet.size >= totalWorkingDays && lateCount === 0 && earlyLeaveCount === 0 && absentDays === 0;
          if (hasFullAttendance && (!rule.threshold || totalWorkingDays >= rule.threshold)) {
            shouldApply = true;
            quantity = totalWorkingDays;
            ruleAmount = rule.amountType === 'percentage' 
              ? (baseSalary * parseFloat(rule.amount) / 100) 
              : parseFloat(rule.amount);
            reason = `Full attendance ${totalWorkingDays} days (no late, no early leave, no absence)`;
          }
          break;
        }
        case 'custom': {
          // Seniority bonus
          if (rule.name && rule.name.toLowerCase().includes('seniority')) {
            const seniority = calculateSeniority(user.startDate);
            let tier = 0;
            if (seniority >= 10) tier = 4;
            else if (seniority >= 5) tier = 3;
            else if (seniority >= 3) tier = 2;
            else if (seniority >= 1) tier = 1;
            if (tier > 0) {
              shouldApply = true;
              quantity = seniority;
              if (rule.amountType === 'percentage') {
                ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * tier;
              } else {
                ruleAmount = parseFloat(rule.amount) * tier;
              }
              reason = `Seniority ${seniority} years (tier ${tier})`;
            }
          }
          break;
        }
      }

      if (shouldApply) {
        const item = {
          ruleName: rule.name,
          ruleDescription: rule.description || reason,
          reason: reason,
          amount: parseFloat(ruleAmount.toFixed(2)),
          quantity: quantity,
          amountType: rule.amountType,
          triggerType: rule.triggerType
        };

        if (rule.type === 'bonus') {
          bonusBreakdown.push(item);
        } else {
          deductionBreakdown.push(item);
        }
      }
    }

    // Include salary advance deduction (stored on Salary record)
    const advanceDeduction = parseFloat(salary.advanceDeduction) || 0;
    if (advanceDeduction > 0) {
      deductionBreakdown.push({
        ruleName: "Salary advance deduction",
        ruleDescription: "Deduct approved salary advance from net salary",
        reason: `Salary advance ${month}/${year}`,
        amount: parseFloat(advanceDeduction.toFixed(2)),
        quantity: 1,
        amountType: "fixed",
        triggerType: "salary_advance"
      });
    }

    return res.json({
      status: "success",
      breakdown: {
        baseSalary: parseFloat(baseSalary),
        bonusBreakdown,
        deductionBreakdown,
        totalBonus: bonusBreakdown.reduce((sum, item) => sum + item.amount, 0),
        totalDeduction: deductionBreakdown.reduce((sum, item) => sum + item.amount, 0),
        attendance: {
          totalDays: totalWorkingDays,
          presentDays: presentDaysSet.size,
          absentDays,
          lateCount,
          earlyLeaveCount,
          overtimeHours: parseFloat(totalOvertimeHours.toFixed(2))
        }
      }
    });
  } catch (err) {
    console.error("Error fetching salary breakdown:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

// Get current user profile
router.get("/profile", async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    return res.json({
      status: "success",
      user
    });
  } catch (err) {
    console.error("Error fetching employee profile:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

// Get current user's job/salary change history
router.get("/profile/history", async (req, res) => {
  try {
    const userId = req.user.userId;
    const historyType = (req.query.historyType || "both").toLowerCase();
    const fromDate = req.query.fromDate || null;
    const toDate = req.query.toDate || null;
    const changeType = req.query.changeType || null;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || "10", 10), 1), 100);
    const offset = (page - 1) * pageSize;

    const baseWhere = { userId };
    if (changeType) baseWhere.changeType = changeType;
    if (fromDate || toDate) {
      baseWhere.effectiveDate = {};
      if (fromDate) baseWhere.effectiveDate[Op.gte] = fromDate;
      if (toDate) baseWhere.effectiveDate[Op.lte] = toDate;
    }

    const response = {
      status: "success",
      historyType,
      pagination: { page, pageSize }
    };

    if (historyType === "job" || historyType === "both") {
      const { rows, count } = await JobHistory.findAndCountAll({
        where: baseWhere,
        include: [
          { model: Department, as: "FromDepartment", attributes: ["id", "name"] },
          { model: Department, as: "ToDepartment", attributes: ["id", "name"] },
          { model: JobTitle, as: "FromJobTitle", attributes: ["id", "name"] },
          { model: JobTitle, as: "ToJobTitle", attributes: ["id", "name"] },
          { model: User, as: "ChangedByUser", attributes: ["id", "name", "employeeCode", "role"] },
        ],
        order: [["effectiveDate", "DESC"], ["createdAt", "DESC"]],
        offset,
        limit: pageSize,
      });

      response.jobHistory = rows.map((history) => {
        let fromDepartmentName = history.FromDepartment?.name || null;
        let toDepartmentName = history.ToDepartment?.name || null;
        let fromJobTitleName = history.FromJobTitle?.name || null;
        let toJobTitleName = history.ToJobTitle?.name || null;

        // promotion/demotion: department is unchanged, normalize both sides if one side is missing.
        if (history.changeType === "promotion" || history.changeType === "demotion") {
          const stableDept = fromDepartmentName || toDepartmentName;
          if (stableDept) {
            fromDepartmentName = stableDept;
            toDepartmentName = stableDept;
          }
        }

        // transfer: job title is unchanged, normalize both sides if one side is missing.
        if (history.changeType === "transfer") {
          const stableTitle = fromJobTitleName || toJobTitleName;
          if (stableTitle) {
            fromJobTitleName = stableTitle;
            toJobTitleName = stableTitle;
          }
        }

        // If IDs are equal, treat as unchanged and normalize names similarly.
        if (history.fromDepartmentId != null && history.fromDepartmentId === history.toDepartmentId) {
          const stableDept = fromDepartmentName || toDepartmentName;
          if (stableDept) {
            fromDepartmentName = stableDept;
            toDepartmentName = stableDept;
          }
        }
        if (history.fromJobTitleId != null && history.fromJobTitleId === history.toJobTitleId) {
          const stableTitle = fromJobTitleName || toJobTitleName;
          if (stableTitle) {
            fromJobTitleName = stableTitle;
            toJobTitleName = stableTitle;
          }
        }

        return {
          id: history.id,
          fromDepartmentId: history.fromDepartmentId,
          toDepartmentId: history.toDepartmentId,
          fromDepartmentName,
          toDepartmentName,
          fromJobTitleId: history.fromJobTitleId,
          toJobTitleId: history.toJobTitleId,
          fromJobTitleName,
          toJobTitleName,
          changeType: history.changeType,
          effectiveDate: history.effectiveDate,
          notes: history.notes,
          changedBy: history.ChangedByUser
            ? {
                id: history.ChangedByUser.id,
                name: history.ChangedByUser.name,
                employeeCode: history.ChangedByUser.employeeCode,
                role: history.ChangedByUser.role,
              }
            : null,
        };
      });
      response.jobPagination = { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
    }

    if (historyType === "salary" || historyType === "both") {
      const { rows, count } = await SalaryHistory.findAndCountAll({
        where: baseWhere,
        include: [
          { model: User, as: "ChangedByUser", attributes: ["id", "name", "employeeCode", "role"] },
        ],
        order: [["effectiveDate", "DESC"], ["createdAt", "DESC"]],
        offset,
        limit: pageSize,
      });

      response.salaryChangeHistory = rows.map((history) => ({
        id: history.id,
        previousBaseSalary: history.previousBaseSalary,
        newBaseSalary: history.newBaseSalary,
        previousTotalAllowance: history.previousTotalAllowance,
        newTotalAllowance: history.newTotalAllowance,
        changeType: history.changeType,
        effectiveDate: history.effectiveDate,
        reason: history.reason,
        changedBy: history.ChangedByUser
          ? {
              id: history.ChangedByUser.id,
              name: history.ChangedByUser.name,
              employeeCode: history.ChangedByUser.employeeCode,
              role: history.ChangedByUser.role,
            }
          : null,
      }));
      response.salaryPagination = { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
    }

    return res.json(response);
  } catch (err) {
    console.error("Error fetching employee profile history:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

export default router;

