import jwt from "jsonwebtoken";
import { getPermissionsByRole } from "../config/permissionMatrix.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Roles:
 *  manager    - Giám đốc / Quản trị hệ thống (trước đây là admin)
 *  hr         - Nhân sự  (quản lý thông tin nhân viên)
 *  accountant - Kế toán  (lương, bảng lương, thuế, BHXH)
 *  supervisor - Quản lý  (duyệt đơn, duyệt lương, xem báo cáo)
 *  employee   - Nhân viên (tự phục vụ)
 */

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "No token provided"
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    decoded.permissions = getPermissionsByRole(decoded.role);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: "error",
      message: "Invalid token"
    });
  }
};

/** Chỉ Giám đốc / Manager */
export const managerOnly = (req, res, next) => {
  if (req.user?.role !== "manager") {
    return res.status(403).json({ status: "error", message: "Requires manager role" });
  }
  next();
};

/** Chỉ Nhân sự / HR Staff */
export const hrOnly = (req, res, next) => {
  if (req.user?.role !== "hr") {
    return res.status(403).json({ status: "error", message: "Requires hr role" });
  }
  next();
};

/** Chỉ Kế toán */
export const accountantOnly = (req, res, next) => {
  if (req.user?.role !== "accountant") {
    return res.status(403).json({ status: "error", message: "Requires accountant role" });
  }
  next();
};

/** Chỉ Quản lý / Supervisor */
export const supervisorOnly = (req, res, next) => {
  if (req.user?.role !== "supervisor") {
    return res.status(403).json({ status: "error", message: "Requires supervisor role" });
  }
  next();
};

/** HR hoặc Manager (quản lý thông tin nhân viên) */
export const hrOrManager = (req, res, next) => {
  const allowed = ["hr", "manager"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "Requires hr or manager role" });
  }
  next();
};

/** Kế toán hoặc Manager */
export const accountantOrManager = (req, res, next) => {
  const allowed = ["accountant", "manager"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "Requires accountant or manager role" });
  }
  next();
};

/** Supervisor hoặc Manager (phê duyệt đơn từ, lương) */
export const supervisorOrManager = (req, res, next) => {
  const allowed = ["supervisor", "manager"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "Requires supervisor or manager role" });
  }
  next();
};

/** Kế toán, Supervisor hoặc Manager (xem báo cáo, lương) */
export const canViewReports = (req, res, next) => {
  const allowed = ["accountant", "supervisor", "manager"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "Requires accountant, supervisor or manager role" });
  }
  next();
};

/** Kế toán hoặc Supervisor (duyệt tạm ứng lương) */
export const accountantOrSupervisor = (req, res, next) => {
  const allowed = ["accountant", "supervisor", "manager"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "Requires accountant, supervisor or manager role" });
  }
  next();
};

/** Tất cả vai trò nội bộ (không phải employee) */
export const staffRoles = (req, res, next) => {
  const allowed = ["manager", "hr", "accountant", "supervisor"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "Staff access required" });
  }
  next();
};

/** Action-based permission guard */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    const permissions = req.user?.permissions || getPermissionsByRole(req.user?.role);
    if (!permissions.includes(permission)) {
      return res.status(403).json({
        status: "error",
        message: `Missing permission: ${permission}`,
      });
    }
    return next();
  };
};

// ─── Backward-compat aliases (tránh lỗi nếu còn file chưa cập nhật) ──────────
/** @deprecated dùng managerOnly */
export const adminOnly = managerOnly;
/** @deprecated dùng accountantOrManager */
export const adminOrAccountant = canViewReports;