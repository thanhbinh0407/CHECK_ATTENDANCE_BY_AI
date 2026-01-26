import Salary from "../models/pg/Salary.js";
import SalaryRule from "../models/pg/SalaryRule.js";
import User from "../models/pg/User.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import ShiftSetting from "../models/pg/ShiftSetting.js";
import { Op } from "sequelize";

// Get all salary rules
export const getAllSalaryRules = async (req, res) => {
  try {
    const rules = await SalaryRule.findAll({
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.json({
      status: "success",
      rules
    });
  } catch (err) {
    console.error("Error fetching salary rules:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get salary rule by ID
export const getSalaryRuleById = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await SalaryRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        status: "error",
        message: "Salary rule not found"
      });
    }

    return res.json({
      status: "success",
      rule
    });
  } catch (err) {
    console.error("Error fetching salary rule:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create salary rule
export const createSalaryRule = async (req, res) => {
  try {
    const {
      name,
      type,
      triggerType,
      amount,
      amountType,
      threshold,
      description,
      priority,
      isActive
    } = req.body;

    if (!name || !type || !triggerType || amount === undefined) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: name, type, triggerType, amount"
      });
    }

    const rule = await SalaryRule.create({
      name,
      type,
      triggerType,
      amount,
      amountType: amountType || 'fixed',
      threshold,
      description,
      priority: priority || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    return res.json({
      status: "success",
      message: "Salary rule created successfully",
      rule
    });
  } catch (err) {
    console.error("Error creating salary rule:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update salary rule
export const updateSalaryRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rule = await SalaryRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        status: "error",
        message: "Salary rule not found"
      });
    }

    await rule.update(updateData);

    return res.json({
      status: "success",
      message: "Salary rule updated successfully",
      rule
    });
  } catch (err) {
    console.error("Error updating salary rule:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete salary rule
export const deleteSalaryRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await SalaryRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        status: "error",
        message: "Salary rule not found"
      });
    }

    await rule.destroy();

    return res.json({
      status: "success",
      message: "Salary rule deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting salary rule:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Calculate salary for employee for a specific month/year
export const calculateSalary = async (req, res) => {
  try {
    const { userId, month, year } = req.body;

    if (!userId || !month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: userId, month, year"
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    // Get shift settings

    const shift = await ShiftSetting.findOne({ where: { active: true } });
    if (!shift) {
      return res.status(400).json({
        status: "error",
        message: "No active shift setting found"
      });
    }

    // Get attendance logs for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const logs = await AttendanceLog.findAll({
      where: {
        userId,
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['timestamp', 'ASC']]
    });

    // Get active salary rules
    const rules = await SalaryRule.findAll({
      where: { isActive: true },
      order: [['priority', 'DESC']]
    });

    // Initialize salary calculation
    // Get baseSalary from user model (may be null/undefined, default to 0)
    let baseSalary = parseFloat(user.baseSalary) || 0;
    let bonus = 0;
    let deduction = 0;

    // Calculate based on attendance
    const lateLogs = logs.filter(log => log.isLate === true);
    const lateCount = lateLogs.length;
    const earlyLeaveLogs = logs.filter(log => log.isEarlyLeave === true);
    const earlyLeaveCount = earlyLeaveLogs.length;
    
    // Calculate total overtime hours from logs
    let totalOvertimeHours = 0;
    const overtimeLogs = logs.filter(log => log.isOvertime === true);
    for (const log of overtimeLogs) {
      // Parse overtime minutes from note (e.g., "Overtime 30 min" => 30)
      if (log.note && log.note.includes('Overtime')) {
        const match = log.note.match(/Overtime\s+(\d+)\s*min/);
        if (match && match[1]) {
          totalOvertimeHours += parseFloat(match[1]) / 60;
        } else {
          // Fallback: use default overtime threshold
          totalOvertimeHours += (shift.overtimeThresholdMinutes || 15) / 60;
        }
      } else {
        // Fallback: use default overtime threshold
        totalOvertimeHours += (shift.overtimeThresholdMinutes || 15) / 60;
      }
    }

    // Calculate absent days (working days without IN log)
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const workingDays = new Set();
    logs.forEach(log => {
      if (log.type === 'IN') {
        const logDate = new Date(log.timestamp).getDate();
        workingDays.add(logDate);
      }
    });
    const absentDays = totalDaysInMonth - workingDays.size;

    // Apply rules
    for (const rule of rules) {
      let ruleAmount = 0;
      let shouldApply = false;

      switch (rule.triggerType) {
        case 'late':
          // Rule applies if lateCount >= threshold (if threshold exists)
          if (lateCount > 0 && (!rule.threshold || lateCount >= rule.threshold)) {
            shouldApply = true;
            if (rule.amountType === 'percentage') {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100;
              // If threshold exists, could multiply by (lateCount / threshold) but for simplicity, use once
            } else {
              // Fixed amount per occurrence if threshold is 1, or total if threshold is higher
              ruleAmount = parseFloat(rule.amount) * (rule.threshold ? Math.floor(lateCount / rule.threshold) : lateCount);
            }
          }
          break;
        case 'early_leave':
          // Rule applies if earlyLeaveCount >= threshold
          if (earlyLeaveCount > 0 && (!rule.threshold || earlyLeaveCount >= rule.threshold)) {
            shouldApply = true;
            if (rule.amountType === 'percentage') {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100;
            } else {
              ruleAmount = parseFloat(rule.amount) * (rule.threshold ? Math.floor(earlyLeaveCount / rule.threshold) : earlyLeaveCount);
            }
          }
          break;
        case 'overtime':
          // Rule applies if totalOvertimeHours > 0
          if (totalOvertimeHours > 0 && (!rule.threshold || totalOvertimeHours >= rule.threshold)) {
            shouldApply = true;
            if (rule.amountType === 'percentage') {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * totalOvertimeHours;
            } else {
              // Fixed amount per hour
              ruleAmount = parseFloat(rule.amount) * totalOvertimeHours;
            }
          }
          break;
        case 'absent':
          // Rule applies if absentDays >= threshold
          if (absentDays > 0 && (!rule.threshold || absentDays >= rule.threshold)) {
            shouldApply = true;
            if (rule.amountType === 'percentage') {
              ruleAmount = baseSalary * parseFloat(rule.amount) / 100 * absentDays;
            } else {
              ruleAmount = parseFloat(rule.amount) * absentDays;
            }
          }
          break;
        case 'full_attendance':
          // Calculate full attendance (no late, no early leave, all days present with both IN and OUT)
          const hasFullAttendance = logs.length >= totalDaysInMonth * 2 && lateCount === 0 && earlyLeaveCount === 0 && absentDays === 0;
          if (hasFullAttendance && (!rule.threshold || totalDaysInMonth >= rule.threshold)) {
            shouldApply = true;
            ruleAmount = rule.amountType === 'percentage' 
              ? (baseSalary * parseFloat(rule.amount) / 100) 
              : parseFloat(rule.amount);
          }
          break;
        case 'custom':
          // Custom rules need manual configuration, skip for now
          break;
      }

      if (shouldApply) {
        if (rule.type === 'bonus') {
          bonus += ruleAmount;
        } else {
          deduction += Math.abs(ruleAmount);
        }
      }
    }

    const finalSalary = baseSalary + bonus - deduction;

    // Create or update salary record
    const [salary, created] = await Salary.findOrCreate({
      where: { userId, month, year },
      defaults: {
        userId,
        baseSalary,
        bonus,
        deduction,
        finalSalary,
        month,
        year,
        status: 'pending',
        calculatedAt: new Date()
      }
    });

    if (!created) {
      await salary.update({
        baseSalary,
        bonus,
        deduction,
        finalSalary,
        calculatedAt: new Date()
      });
    }

    return res.json({
      status: "success",
      message: "Salary calculated successfully",
      salary: {
        ...salary.toJSON(),
        attendance: {
          totalLogs: logs.length,
          lateCount,
          earlyLeaveCount,
          overtimeHours: totalOvertimeHours.toFixed(2),
          absentDays
        }
      }
    });
  } catch (err) {
    console.error("Error calculating salary:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Get salaries for all employees or specific employee
export const getSalaries = async (req, res) => {
  try {
    const { userId, month, year } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (month) where.month = month;
    if (year) where.year = year;

    const salaries = await Salary.findAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'email', 'employeeCode']
      }],
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    return res.json({
      status: "success",
      salaries
    });
  } catch (err) {
    console.error("Error fetching salaries:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update salary status
export const updateSalaryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const salary = await Salary.findByPk(id);
    if (!salary) {
      return res.status(404).json({
        status: "error",
        message: "Salary record not found"
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (status === 'paid') updateData.paidAt = new Date();

    await salary.update(updateData);

    return res.json({
      status: "success",
      message: "Salary status updated successfully",
      salary
    });
  } catch (err) {
    console.error("Error updating salary status:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get pending salaries for admin approval
export const getPendingSalaries = async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = { status: 'pending' };
    
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    console.log("Fetching pending salaries with where:", where);

    const pendingSalaries = await Salary.findAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'email', 'employeeCode'],
        required: false // Allow salaries without users
      }],
      order: [['year', 'DESC'], ['month', 'DESC'], ['createdAt', 'ASC']]
    });

    console.log(`Found ${pendingSalaries.length} pending salaries`);

    return res.json({
      status: "success",
      count: pendingSalaries.length,
      salaries: pendingSalaries
    });
  } catch (err) {
    console.error("Error fetching pending salaries:", err.message);
    console.error("Stack:", err.stack);
    return res.status(500).json({
      status: "error",
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Approve salary
export const approveSalary = async (req, res) => {
  try {
    const { id } = req.params;

    const salary = await Salary.findByPk(id);
    if (!salary) {
      return res.status(404).json({
        status: "error",
        message: "Salary record not found"
      });
    }

    await salary.update({
      status: 'approved',
      calculatedAt: new Date()
    });

    return res.json({
      status: "success",
      message: "Salary approved successfully",
      salary
    });
  } catch (err) {
    console.error("Error approving salary:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Reject salary (revert to pending or delete for recalculation)
export const rejectSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const salary = await Salary.findByPk(id);
    if (!salary) {
      return res.status(404).json({
        status: "error",
        message: "Salary record not found"
      });
    }

    // Update status to pending with rejection notes
    await salary.update({
      status: 'pending',
      notes: reason ? `[REJECTED] ${reason}` : '[REJECTED] No reason provided',
      calculatedAt: new Date()
    });

    return res.json({
      status: "success",
      message: "Salary rejected and reset for recalculation",
      salary
    });
  } catch (err) {
    console.error("Error rejecting salary:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Adjust salary (admin override/adjustment)
export const adjustSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const { baseAdjustment, bonusAdjustment, deductionAdjustment, notes } = req.body;

    const salary = await Salary.findByPk(id);
    if (!salary) {
      return res.status(404).json({
        status: "error",
        message: "Salary record not found"
      });
    }

    // Calculate adjusted values
    const adjustedBaseSalary = salary.baseSalary + (baseAdjustment || 0);
    const adjustedBonus = salary.bonus + (bonusAdjustment || 0);
    const adjustedDeduction = salary.deduction + (deductionAdjustment || 0);
    const adjustedFinalSalary = adjustedBaseSalary + adjustedBonus - adjustedDeduction;

    await salary.update({
      baseSalary: adjustedBaseSalary,
      bonus: adjustedBonus,
      deduction: adjustedDeduction,
      finalSalary: adjustedFinalSalary,
      notes: notes || salary.notes,
      status: 'pending',
      calculatedAt: new Date()
    });

    return res.json({
      status: "success",
      message: "Salary adjusted successfully",
      salary
    });
  } catch (err) {
    console.error("Error adjusting salary:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};
