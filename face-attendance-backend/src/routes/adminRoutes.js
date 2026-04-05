import express from "express";
import {
  getAllEmployees,
  getTodayPresenceSummary,
  getEmployeeById,
  getEmployeeWithPassword,
  updateEmployee,
  deleteEmployee,
  permanentlyDeleteEmployee,
  resetEmployeePassword,
  getEmployeeAttendanceStats,
  getEmployeeDetailedInfo,
  getEmployeeHistory,
  createEmployee,
  bulkCreateEmployees,
  updateUserRole,
  getRoleAuditLogs
} from "../controllers/adminController.js";
import {
  authMiddleware,
  hrOrManager,
  managerOnly,
  requirePermission,
  canAccessEmployeeData,
  isTeamMember,
  requireRoles
} from "../middleware/authMiddleware.js";
import { PERMISSIONS } from "../config/permissionMatrix.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import User from "../models/pg/User.js";

const router = express.Router();

// Public endpoints
router.get("/logs", async (req, res) => {
  try {
    const logs = await AttendanceLog.findAll({
      include: [{
        model: User,
        as: "User",
        attributes: ['id', 'name', 'email', 'employeeCode']
      }],
      order: [["timestamp", "DESC"]],
      limit: 1000
    });
    res.json({ status: "success", logs });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// All protected routes require authentication
router.use(authMiddleware);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EMPLOYEE MANAGEMENT ROUTES - Quản lý nhân viên
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// GET all employees - Manager, HR, Accountant, Supervisor
router.get(
  "/employees",
  requirePermission(PERMISSIONS["user:read"]),
  getAllEmployees
);

router.get(
  "/attendance/today-presence",
  requirePermission(PERMISSIONS["user:read"]),
  getTodayPresenceSummary
);

// GET employee by ID - Với kiểm tra quyền truy cập dữ liệu
router.get(
  "/employees/:id",
  requirePermission(PERMISSIONS["user:read"]),
  canAccessEmployeeData,
  getEmployeeById
);

// GET employee detailed info - Xem hồ sơ chi tiết
router.get(
  "/employees/:id/details",
  requirePermission(PERMISSIONS["user:read"]),
  canAccessEmployeeData,
  getEmployeeDetailedInfo
);

// GET employee history - Xem lịch sử thay đổi
router.get(
  "/employees/:id/history",
  requirePermission(PERMISSIONS["user:read"]),
  canAccessEmployeeData,
  getEmployeeHistory
);

// GET employee attendance statistics
router.get(
  "/employees/:id/attendance-stats",
  requirePermission(PERMISSIONS["attendance:stats:view"]),
  canAccessEmployeeData,
  getEmployeeAttendanceStats
);

// POST create new employee - Manager, HR only
router.post(
  "/employees",
  requirePermission(PERMISSIONS["user:create"]),
  createEmployee
);

// POST bulk create employees - Manager, HR only
router.post(
  "/employees/bulk",
  requirePermission(PERMISSIONS["user:create"]),
  bulkCreateEmployees
);

// PUT update employee - Manager, HR only
router.put(
  "/employees/:id",
  requirePermission(PERMISSIONS["user:update"]),
  updateEmployee
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SENSITIVE OPERATIONS - Chỉ Manager
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// GET employee with password - Manager only 
router.get(
  "/employees/:id/with-password",
  managerOnly,
  requirePermission(PERMISSIONS["user:role:update"]),
  getEmployeeWithPassword
);

// DELETE employee (hard delete) - Manager only
router.delete(
  "/employees/:id",
  managerOnly,
  requirePermission(PERMISSIONS["user:delete"]),
  deleteEmployee
);

// DELETE employee permanently - Manager only
router.delete(
  "/employees/:id/permanent",
  managerOnly,
  requirePermission(PERMISSIONS["user:delete"]),
  permanentlyDeleteEmployee
);

// POST reset password - Manager only
router.post(
  "/employees/:id/reset-password",
  managerOnly,
  requirePermission(PERMISSIONS["user:role:update"]),
  resetEmployeePassword
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ACCOUNT & ROLE MANAGEMENT - Chỉ Manager
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// PATCH update user role - Manager only
router.patch(
  "/users/:id/role",
  managerOnly,
  requirePermission(PERMISSIONS["user:role:update"]),
  updateUserRole
);

// GET role audit logs - Manager only
router.get(
  "/audits/role-changes",
  managerOnly,
  requirePermission(PERMISSIONS["audit:view"]),
  getRoleAuditLogs
);

export default router;
