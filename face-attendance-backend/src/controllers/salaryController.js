import Salary from "../models/pg/Salary.js";
import SalaryRule from "../models/pg/SalaryRule.js";
import { calculateSeniority } from "../services/senioritySalaryService.js";
import User from "../models/pg/User.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import ShiftSetting from "../models/pg/ShiftSetting.js";
import SalaryAdvance from "../models/pg/SalaryAdvance.js";
import { Op } from "sequelize";
import { sendNotification } from "./notificationController.js";
import { getSalaryTransitionError, SALARY_STATUS } from "../services/salaryStatusRBAC.js";

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

    const { calculateSalaryForUser } = await import("../services/salaryCalculationService.js");
    const result = await calculateSalaryForUser(userId, month, year, { requireExistingSalaryRecord: false });
    if (!result.success) {
      return res.status(403).json({ status: "error", message: result.error });
    }

    return res.json({
      status: "success",
      message: "Salary calculated successfully",
      salary: {
        ...result.salary.toJSON(),
        attendance: {
          totalLogs: result.attendance.totalLogs,
          lateCount: result.attendance.lateCount,
          earlyLeaveCount: result.attendance.earlyLeaveCount,
          overtimeHours: result.attendance.overtimeHours.toFixed(2),
          absentDays: result.attendance.absentDays
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

    if (!status) {
      return res.status(400).json({
        status: "error",
        message: "Missing required field: status"
      });
    }

    const salary = await Salary.findByPk(id);
    if (!salary) {
      return res.status(404).json({
        status: "error",
        message: "Salary record not found"
      });
    }

    const role = req.user?.role;
    const fromStatus = salary.status;
    const toStatus = status;

    // Validate transition + role.
    const errMsg = getSalaryTransitionError({ fromStatus, toStatus, role });
    if (errMsg) {
      return res.status(403).json({
        status: "error",
        message: errMsg
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (status === SALARY_STATUS.APPROVED) updateData.calculatedAt = new Date();
    if (status === SALARY_STATUS.PAID) updateData.paidAt = new Date();
    if (status === SALARY_STATUS.PENDING) updateData.paidAt = null;

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

// Accountant-only: mark approved salary as paid
export const markPaidSalary = async (req, res) => {
  // Accept both { notes } and { reason } for audit context.
  if (req.body?.reason !== undefined && req.body?.notes === undefined) {
    req.body.notes = req.body.reason;
  }
  req.body = { ...(req.body || {}), status: SALARY_STATUS.PAID };
  return updateSalaryStatus(req, res);
};

// Manager-only: revert paid salary back to pending for re-check/rework
export const revertSalaryToPending = async (req, res) => {
  if (req.body?.reason !== undefined && req.body?.notes === undefined) {
    req.body.notes = req.body.reason;
  }
  req.body = { ...(req.body || {}), status: SALARY_STATUS.PENDING };
  return updateSalaryStatus(req, res);
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

    // Bản ghi bị từ chối (chờ kế toán tính lại) — tách khỏi hàng chờ duyệt chính
    const awaitingRecalc = [];
    const awaitingApproval = [];
    for (const row of pendingSalaries) {
      const n = row.notes;
      if (typeof n === "string" && n.trim().startsWith("[REJECTED]")) {
        awaitingRecalc.push(row);
      } else {
        awaitingApproval.push(row);
      }
    }

    console.log(
      `Found ${pendingSalaries.length} pending salaries (${awaitingApproval.length} chờ duyệt, ${awaitingRecalc.length} bị trả về tính lại)`
    );

    return res.json({
      status: "success",
      count: awaitingApproval.length,
      salaries: awaitingApproval,
      awaitingRecalc,
      awaitingRecalcCount: awaitingRecalc.length,
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

    // Enforce workflow: only pending -> approved.
    if (salary.status !== SALARY_STATUS.PENDING) {
      return res.status(403).json({
        status: "error",
        message: `Cannot approve salary from status '${salary.status}'. Only '${SALARY_STATUS.PENDING}' -> '${SALARY_STATUS.APPROVED}' is allowed.`
      });
    }

    await salary.update({
      status: 'approved',
      calculatedAt: new Date()
    });

    // Send broadcast notification
    const employee = await User.findByPk(salary.userId, { attributes: ['name', 'employeeCode'] });
    await sendNotification(null, 'system', 'Salary Approved', 
      `Salary for ${employee?.name || 'employee'} (${employee?.employeeCode || salary.userId}) for ${salary.month}/${salary.year} has been approved.`, 
      { salaryId: salary.id, action: 'approved' });

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

    // Enforce workflow: only pending -> pending (reject notes) for audit trail.
    // Rejecting an already-approved/paid salary should be done via `/revert`.
    if (salary.status !== SALARY_STATUS.PENDING) {
      return res.status(403).json({
        status: "error",
        message: `Cannot reject salary from status '${salary.status}'. Only '${SALARY_STATUS.PENDING}' is rejectable.`
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

    // Disallow adjustments after paid.
    if (salary.status === SALARY_STATUS.PAID) {
      return res.status(403).json({
        status: "error",
        message: "Cannot adjust a salary that is already paid."
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
