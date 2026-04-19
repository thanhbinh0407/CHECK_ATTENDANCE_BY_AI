import express from "express";
import {
  getAllEmployees,
  getEmployeeById,
  getEmployeeWithPassword,
  updateEmployee,
  deleteEmployee,
  permanentlyDeleteEmployee,
  restoreEmployee,
  resetEmployeePassword,
  getEmployeeAttendanceStats,
  getEmployeeDetailedInfo,
  getEmployeeHistory,
  createEmployee,
  bulkCreateEmployees,
  updateUserRole,
  getRoleAuditLogs,
  getApprovalAuditLogs
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

// DELETE employee (soft delete) - HR or Manager (UC-07.3)
router.delete(
  "/employees/:id",
  hrOrManager,
  requirePermission(PERMISSIONS["user:delete"]),
  deleteEmployee
);

// PATCH restore employee (reactivate) - HR or Manager
router.patch(
  "/employees/:id/restore",
  hrOrManager,
  requirePermission(PERMISSIONS["user:update"]),
  restoreEmployee
);

// DELETE employee permanently - Manager only
router.delete(
  "/employees/:id/permanent",
  hrOrManager,
  requirePermission(PERMISSIONS["user:delete"]),
  permanentlyDeleteEmployee
);

// POST reset password - HR or Manager (UC-07.4)
router.post(
  "/employees/:id/reset-password",
  hrOrManager,
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

// GET approval workflow audit logs - Manager only
router.get(
  "/audits/approval-actions",
  managerOnly,
  requirePermission(PERMISSIONS["audit:view"]),
  getApprovalAuditLogs
);

export default router;
