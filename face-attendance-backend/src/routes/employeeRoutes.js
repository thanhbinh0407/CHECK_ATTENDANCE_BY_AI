import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import Salary from "../models/pg/Salary.js";
import User from "../models/pg/User.js";
import JobHistory from "../models/pg/JobHistory.js";
import SalaryHistory from "../models/pg/SalaryHistory.js";
import Department from "../models/pg/Department.js";
import JobTitle from "../models/pg/JobTitle.js";
import { Op } from "sequelize";
import { getSalaryBreakdownDetail } from "../services/salaryBreakdownDetailService.js";

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

    const breakdown = await getSalaryBreakdownDetail(userId, parseInt(month, 10), parseInt(year, 10));
    return res.json({
      status: "success",
      breakdown
    });
  } catch (err) {
    if (err.code === "SALARY_NOT_FOUND" || err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: "error",
        message: err.message
      });
    }
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

