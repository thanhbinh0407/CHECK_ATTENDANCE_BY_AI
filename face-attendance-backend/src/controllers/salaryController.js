import Salary from "../models/pg/Salary.js";
import SalaryRule from "../models/pg/SalaryRule.js";
import { calculateSeniority } from "../services/senioritySalaryService.js";
import User from "../models/pg/User.js";
import Department from "../models/pg/Department.js";
import JobTitle from "../models/pg/JobTitle.js";
import SalaryGrade from "../models/pg/SalaryGrade.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import ShiftSetting from "../models/pg/ShiftSetting.js";
import SalaryAdvance from "../models/pg/SalaryAdvance.js";
import { Op } from "sequelize";
import { sendNotification } from "./notificationController.js";
import { getSalaryTransitionError, SALARY_STATUS } from "../services/salaryStatusRBAC.js";
import { getSalaryBreakdownDetail } from "../services/salaryBreakdownDetailService.js";

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
    if (month !== undefined && month !== "") where.month = parseInt(month, 10);
    if (year !== undefined && year !== "") where.year = parseInt(year, 10);

    const salaries = await Salary.findAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'email', 'employeeCode'],
        include: [
          { model: Department, attributes: ['id', 'name'], required: false },
          { model: JobTitle, attributes: ['id', 'name'], required: false },
          { model: SalaryGrade, attributes: ['id', 'name', 'code', 'level', 'baseSalary'], required: false }
        ]
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

/** Một bản ghi lương + nhân viên (cho modal chi tiết / điều chỉnh theo đúng nhân viên) */
export const getSalaryById = async (req, res) => {
  try {
    const { id } = req.params;
    const salary = await Salary.findByPk(id, {
      include: [
        {
          model: User,
          attributes: { exclude: ["password"] },
          include: [
            { model: Department, attributes: ["id", "name"] },
            { model: JobTitle, attributes: ["id", "name"] },
            { model: SalaryGrade, attributes: ["id", "name", "code", "level", "baseSalary"] }
          ]
        }
      ]
    });

    if (!salary) {
      return res.status(404).json({
        status: "error",
        message: "Salary record not found"
      });
    }

    return res.json({
      status: "success",
      salary
    });
  } catch (err) {
    console.error("Error fetching salary by id:", err);
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

// Breakdown line items for a salary record (accountant / reports)
export const getSalaryBreakdownBySalaryId = async (req, res) => {
  try {
    const { id } = req.params;
    const salary = await Salary.findByPk(id);
    if (!salary) {
      return res.status(404).json({
        status: "error",
        message: "Salary record not found"
      });
    }
    const breakdown = await getSalaryBreakdownDetail(salary.userId, salary.month, salary.year);
    return res.json({
      status: "success",
      breakdown
    });
  } catch (err) {
    if (err.code === "SALARY_NOT_FOUND" || err.code === "USER_NOT_FOUND") {
      return res.status(404).json({ status: "error", message: err.message });
    }
    console.error("Error fetching salary breakdown:", err);
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

    const b = parseFloat(salary.baseSalary) || 0;
    const bon = parseFloat(salary.bonus) || 0;
    const ded = parseFloat(salary.deduction) || 0;
    const ba = parseFloat(baseAdjustment) || 0;
    const boa = parseFloat(bonusAdjustment) || 0;
    const da = parseFloat(deductionAdjustment) || 0;

    const adjustedBaseSalary = b + ba;
    const adjustedBonus = bon + boa;
    const adjustedDeduction = ded + da;
    const adjustedGrossSalary = adjustedBaseSalary + adjustedBonus;
    const adjustedFinalSalary = adjustedGrossSalary - adjustedDeduction;

    await salary.update({
      baseSalary: adjustedBaseSalary,
      bonus: adjustedBonus,
      grossSalary: adjustedGrossSalary,
      deduction: adjustedDeduction,
      finalSalary: adjustedFinalSalary,
      notes: notes || salary.notes,
      status: "pending",
      calculatedAt: new Date()
    });

    await salary.reload();

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
