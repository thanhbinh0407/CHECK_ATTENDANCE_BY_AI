import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import Salary from "../models/pg/Salary.js";
import User from "../models/pg/User.js";
import SalaryRule from "../models/pg/SalaryRule.js";
import { ShiftSetting } from "../models/pg/index.js";
import { Op } from "sequelize";

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
      order: [['year', 'DESC'], ['month', 'DESC']],
      limit: 12 // Last 12 months
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

    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const workingDays = new Set();
    logs.forEach(log => {
      if (log.type === 'IN') {
        const logDate = new Date(log.timestamp).getDate();
        workingDays.add(logDate);
      }
    });
    const absentDays = totalDaysInMonth - workingDays.size;

    const baseSalary = parseFloat(user.baseSalary) || 0;
    const bonusBreakdown = [];
    const deductionBreakdown = [];

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
            reason = `Đi muộn ${lateCount} lần${rule.threshold ? ` (áp dụng khi >= ${rule.threshold} lần)` : ''}`;
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
            reason = `Về sớm ${earlyLeaveCount} lần${rule.threshold ? ` (áp dụng khi >= ${rule.threshold} lần)` : ''}`;
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
            reason = `Làm thêm ${totalOvertimeHours.toFixed(2)} giờ${rule.threshold ? ` (áp dụng khi >= ${rule.threshold} giờ)` : ''}`;
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
            reason = `Vắng mặt ${absentDays} ngày${rule.threshold ? ` (áp dụng khi >= ${rule.threshold} ngày)` : ''}`;
          }
          break;
        case 'full_attendance':
          const hasFullAttendance = logs.length >= totalDaysInMonth * 2 && lateCount === 0 && earlyLeaveCount === 0 && absentDays === 0;
          if (hasFullAttendance && (!rule.threshold || totalDaysInMonth >= rule.threshold)) {
            shouldApply = true;
            quantity = totalDaysInMonth;
            ruleAmount = rule.amountType === 'percentage' 
              ? (baseSalary * parseFloat(rule.amount) / 100) 
              : parseFloat(rule.amount);
            reason = `Chấm công đầy đủ ${totalDaysInMonth} ngày (không đi muộn, không về sớm, không vắng mặt)`;
          }
          break;
        case 'custom':
          break;
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

    return res.json({
      status: "success",
      breakdown: {
        baseSalary: parseFloat(baseSalary),
        bonusBreakdown,
        deductionBreakdown,
        totalBonus: bonusBreakdown.reduce((sum, item) => sum + item.amount, 0),
        totalDeduction: deductionBreakdown.reduce((sum, item) => sum + item.amount, 0),
        attendance: {
          totalDays: totalDaysInMonth,
          presentDays: workingDays.size,
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

export default router;

