import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { auditMutation } from "../services/actionAuditService.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import Salary from "../models/pg/Salary.js";
import User from "../models/pg/User.js";
import JobHistory from "../models/pg/JobHistory.js";
import SalaryHistory from "../models/pg/SalaryHistory.js";
import Department from "../models/pg/Department.js";
import JobTitle from "../models/pg/JobTitle.js";
import { Op } from "sequelize";
import { getSalaryBreakdownDetail } from "../services/salaryBreakdownDetailService.js";
import { uploadAvatar, removeAvatarFileIfLocal } from "../utils/fileUpload.js";

const SELF_PROFILE_FIELDS = new Set([
  "name",
  "phoneNumber",
  "address",
  "permanentAddress",
  "temporaryAddress",
  "personalEmail",
  "companyEmail",
  "dateOfBirth",
  "gender",
  "emergencyContactName",
  "emergencyContactRelationship",
  "emergencyContactPhone",
  "educationLevel",
  "major",
  "idNumber",
  "idIssueDate",
  "idIssuePlace",
]);

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get current user's attendance logs (with shift information and lateness details)
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

    // Import ShiftSetting to determine shift labels and lateness details
    const ShiftSetting = (await import("../models/pg/index.js")).ShiftSetting;
    const OvertimeRequest = (await import("../models/pg/index.js")).OvertimeRequest;

    const activeShift = await ShiftSetting.findOne({ where: { active: true } });
    const gracePeriodMinutes = Number(activeShift?.gracePeriodMinutes ?? 5);

    // Parse shift plan to determine main shifts and overtime details
    const parseShiftPlan = (shift) => {
      const fallbackMainShifts = [{ startTime: shift?.startTime || "08:00", endTime: shift?.endTime || "17:00" }];
      const fallback = {
        mainShifts: fallbackMainShifts,
        overtimeStart: null,
        overtimeThresholdMinutes: Number(shift?.overtimeThresholdMinutes || 15),
      };

      if (!shift?.note) return fallback;
      try {
        const parsed = JSON.parse(shift.note);
        const mainShifts = Array.isArray(parsed?.mainShifts) && parsed.mainShifts.length > 0
          ? parsed.mainShifts
              .map((s) => ({ startTime: s?.startTime, endTime: s?.endTime }))
              .filter((s) => typeof s.startTime === "string" && typeof s.endTime === "string")
          : fallbackMainShifts;

        const overtimeStart = typeof parsed?.overtime?.startTime === "string" ? parsed.overtime.startTime : null;
        const overtimeThresholdMinutes = Number(parsed?.overtime?.thresholdMinutes ?? shift?.overtimeThresholdMinutes ?? 15);

        return {
          mainShifts,
          overtimeStart,
          overtimeThresholdMinutes: Number.isFinite(overtimeThresholdMinutes) ? overtimeThresholdMinutes : 15,
        };
      } catch {
        return fallback;
      }
    };

    const shiftPlan = parseShiftPlan(activeShift);

    // Load OT requests for the selected month/year and map by date
    const otWhere = { userId };
    if (month && year) {
      const otStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const otEnd = new Date(year, month, 0).toISOString().split('T')[0];
      otWhere.date = { [Op.between]: [otStart, otEnd] };
    }
    const overtimeRequests = await OvertimeRequest.findAll({
      where: otWhere,
      order: [['date', 'ASC']]
    });
    const overtimeRequestByDate = new Map();
    for (const req of overtimeRequests) {
      overtimeRequestByDate.set(req.date, req.toJSON());
    }

    // Group logs by date to identify which shift they belong to
    const timeZone = 'Asia/Ho_Chi_Minh';
    const dayKeyOf = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone });

    const dayMap = new Map();
    for (const log of logs) {
      const key = dayKeyOf(log.timestamp);
      if (!dayMap.has(key)) {
        dayMap.set(key, []);
      }
      dayMap.get(key).push(log);
    }

    // Enrich logs with shift information
    const enrichedLogs = logs.map((log) => {
      const dateKey = dayKeyOf(log.timestamp);
      const dayLogs = dayMap.get(dateKey) || [];
      const sortedDayLogs = [...dayLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const nonOvertimeDayLogs = sortedDayLogs.filter(l => !l.isOvertime);

      // Find index of this log in the day's logs
      const logIndex = sortedDayLogs.findIndex(l => l.id === log.id);
      const isInOutType = logIndex % 2 === 0 ? "IN" : "OUT";

      // Determine shift label using the actual OT flag when available
      let shiftLabel = "";
      let shiftNumber = 0;
      if (log.isOvertime) {
        shiftLabel = "Overtime Shift";
        shiftNumber = 0;
      } else {
        const nonOvertimeIndex = nonOvertimeDayLogs.findIndex(l => l.id === log.id);
        const sessionIndex = nonOvertimeIndex >= 0 ? Math.floor(nonOvertimeIndex / 2) : 0;
        const isOvertime = sessionIndex >= shiftPlan.mainShifts.length;
        shiftNumber = Math.min(sessionIndex + 1, shiftPlan.mainShifts.length);
        shiftLabel = isOvertime ? "Overtime Shift" : `Shift ${shiftNumber}`;
      }
      let latenessMinutes = null;
      let earlyLeaveMinutes = null;

      if (log.isLate && log.type === 'IN') {
        // Parse the note field which contains lateness info
        if (log.note && log.note.includes('Late by')) {
          const match = log.note.match(/Late by (\d+) min/);
          if (match) {
            latenessMinutes = parseInt(match[1], 10);
          }
        }
      }

      if (log.isEarlyLeave && log.type === 'OUT') {
        // Parse the note field which contains early leave info
        if (log.note && log.note.includes('Left early by')) {
          const match = log.note.match(/Left early by (\d+) min/);
          if (match) {
            earlyLeaveMinutes = parseInt(match[1], 10);
          }
        }
      }

      return {
        ...log.toJSON(),
        shiftLabel,
        shiftNumber,
        latenessMinutes,
        earlyLeaveMinutes,
        gracePeriodMinutes,
        inOutType: isInOutType,
        overtimeRequest: overtimeRequestByDate.get(dateKey) || null
      };
    });

    return res.json({
      status: "success",
      logs: enrichedLogs,
      shiftPlan,
      gracePeriodMinutes,
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

    // Employees only see finalized payroll rows (not draft pending recalculation/approval).
    if (String(req.user?.role || "").toLowerCase() === "employee") {
      where.status = { [Op.in]: ["approved", "paid"] };
    }

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

    if (String(req.user?.role || "").toLowerCase() === "employee") {
      const sal = await Salary.findOne({
        where: { userId, month: parseInt(month, 10), year: parseInt(year, 10) },
        attributes: ["id", "status"],
      });
      if (!sal || sal.status === "pending") {
        return res.status(404).json({
          status: "error",
          message: "Salary breakdown is available after payroll is approved.",
        });
      }
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

// Get current user profile (full HR fields; org fields read-only on client)
router.get("/profile", async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Department, attributes: ["id", "name"] },
        { model: JobTitle, attributes: ["id", "name"] },
      ],
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

// Self-service: cập nhật các trường cá nhân (không đổi email đăng nhập, role, lương, phòng ban…)
router.patch("/profile", auditMutation({
  action: "profile.update",
  category: "own_profile",
  entityType: "user",
  entityIdFrom: (req) => req.user?.userId ?? req.user?.id ?? null,
  summary: () => "Updated own profile",
  metadata: (req) => ({ changedFields: Object.keys(req.body || {}) }),
}), async (req, res) => {
  try {
    const userId = req.user.userId;
    const body = req.body || {};
    const payload = {};

    for (const key of Object.keys(body)) {
      if (!SELF_PROFILE_FIELDS.has(key)) continue;
      let val = body[key];
      if (key === "dateOfBirth" || key === "idIssueDate") {
        if (val === "" || val === null || val === undefined) {
          payload[key] = null;
        } else {
          const d = new Date(val);
          payload[key] = Number.isNaN(d.getTime()) ? null : d;
        }
        continue;
      }
      if (key === "gender" || key === "educationLevel") {
        payload[key] = val === "" || val == null ? null : val;
        continue;
      }
      if (key === "name" && (val === "" || val == null)) {
        return res.status(400).json({ status: "error", message: "Tên không được để trống" });
      }
      payload[key] = val;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ status: "error", message: "Không có trường hợp lệ để cập nhật" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    await user.update(payload);

    const fresh = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Department, attributes: ["id", "name"] },
        { model: JobTitle, attributes: ["id", "name"] },
      ],
    });

    return res.json({ status: "success", message: "Đã cập nhật hồ sơ", user: fresh });
  } catch (err) {
    console.error("Error updating employee profile:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// Ảnh đại diện (JPEG/PNG/WebP, tối đa 2MB)
router.post("/profile/avatar", auditMutation({
  action: "profile.avatar_update",
  category: "own_profile",
  entityType: "user",
  entityIdFrom: (req) => req.user?.userId ?? req.user?.id ?? null,
  summary: () => "Updated profile avatar",
}), (req, res) => {
  uploadAvatar.single("avatar")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ status: "error", message: err.message || "Tải ảnh thất bại" });
    }
    try {
      const userId = req.user.userId;
      if (!req.file) {
        return res.status(400).json({ status: "error", message: "Chưa chọn file ảnh" });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ status: "error", message: "User not found" });
      }

      const newUrl = `/uploads/avatars/${req.file.filename}`;
      const prev = user.avatarUrl;
      if (prev && prev !== newUrl) {
        removeAvatarFileIfLocal(prev);
      }

      await user.update({ avatarUrl: newUrl });

      const fresh = await User.findByPk(userId, {
        attributes: { exclude: ["password"] },
        include: [
          { model: Department, attributes: ["id", "name"] },
          { model: JobTitle, attributes: ["id", "name"] },
        ],
      });

      return res.json({ status: "success", message: "Đã cập nhật ảnh đại diện", user: fresh, avatarUrl: newUrl });
    } catch (e) {
      console.error("Avatar upload error:", e);
      return res.status(500).json({ status: "error", message: e.message });
    }
  });
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

