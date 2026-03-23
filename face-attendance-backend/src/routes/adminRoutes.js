import express from "express";
import {
  getAllEmployees,
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
import { authMiddleware, hrOrManager, managerOnly, requirePermission } from "../middleware/authMiddleware.js";
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

// HR có thể đọc thông tin nhân viên, Manager có toàn quyền
router.get("/employees", hrOrManager, requirePermission(PERMISSIONS.user_read), getAllEmployees);
router.get("/employees/:id", hrOrManager, requirePermission(PERMISSIONS.user_read), getEmployeeById);
router.get("/employees/:id/details", hrOrManager, requirePermission(PERMISSIONS.user_read), getEmployeeDetailedInfo);
router.get("/employees/:id/history", hrOrManager, requirePermission(PERMISSIONS.user_read), getEmployeeHistory);
router.get("/employees/:id/attendance-stats", hrOrManager, requirePermission(PERMISSIONS.user_read), getEmployeeAttendanceStats);

// HR có thể tạo và cập nhật hồ sơ nhân viên
router.post("/employees", hrOrManager, requirePermission(PERMISSIONS.user_create), createEmployee);
router.post("/employees/bulk", hrOrManager, requirePermission(PERMISSIONS.user_create), bulkCreateEmployees);
router.put("/employees/:id", hrOrManager, requirePermission(PERMISSIONS.user_update), updateEmployee);

// Chỉ Manager (giám đốc) mới được xem mật khẩu, xóa tài khoản, reset mật khẩu
router.get("/employees/:id/with-password", managerOnly, requirePermission(PERMISSIONS.user_read), getEmployeeWithPassword);
router.delete("/employees/:id", managerOnly, requirePermission(PERMISSIONS.user_delete), deleteEmployee);
router.delete("/employees/:id/permanent", managerOnly, requirePermission(PERMISSIONS.user_delete), permanentlyDeleteEmployee);
router.post("/employees/:id/reset-password", managerOnly, requirePermission(PERMISSIONS.user_password_reset), resetEmployeePassword);

// Account role governance + security audit
router.patch("/users/:id/role", managerOnly, requirePermission(PERMISSIONS.user_role_update), updateUserRole);
router.get("/audits/role-changes", managerOnly, requirePermission(PERMISSIONS.audit_view), getRoleAuditLogs);

export default router;
