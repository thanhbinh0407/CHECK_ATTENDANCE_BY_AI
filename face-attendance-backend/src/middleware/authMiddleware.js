import jwt from "jsonwebtoken";
import { getPermissionsByRole } from "../config/permissionMatrix.js";
import User from "../models/pg/User.js";

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
    // Attach permissions from token role first (fast path).
    decoded.permissions = getPermissionsByRole(decoded.role);

    // Validate session against current DB state (force-logout on role changes, deactivation, etc.)
    Promise.resolve()
      .then(async () => {
        const dbUser = await User.findByPk(decoded.userId, {
          attributes: ["id", "role", "isActive", "tokenVersion"],
        });

        if (!dbUser) {
          return res.status(401).json({ status: "error", message: "Invalid session" });
        }

        if (!dbUser.isActive) {
          return res.status(403).json({ status: "error", message: "User account is inactive" });
        }

        const tokenVer = Number(decoded.tokenVersion || 0);
        const dbVer = Number(dbUser.tokenVersion || 0);
        if (tokenVer !== dbVer) {
          return res.status(401).json({ status: "error", message: "Session has been invalidated. Please login again." });
        }

        if (decoded.role !== dbUser.role) {
          return res.status(401).json({ status: "error", message: "Role changed. Please login again." });
        }

        // Use authoritative role/permissions from DB (optional safety).
        decoded.role = dbUser.role;
        decoded.permissions = getPermissionsByRole(dbUser.role);
        req.user = decoded;
        return next();
      })
      .catch(() => {
        return res.status(401).json({ status: "error", message: "Invalid token" });
      });
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

/** HR, Manager hoặc Supervisor (quản lý thông tin nhân viên / duyệt hồ sơ) */
export const hrOrManager = (req, res, next) => {
  const allowed = ["hr", "manager", "supervisor"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "Requires hr, manager or supervisor role" });
  }
  next();
};

/** Kế toán, Manager hoặc Supervisor */
export const accountantOrManager = (req, res, next) => {
  const allowed = ["accountant", "manager", "supervisor"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "Requires accountant, manager or supervisor role" });
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

/** Kế toán, Supervisor, HR hoặc Manager (xem báo cáo / analytics theo ma trận nghiệp vụ) */
export const canViewReports = (req, res, next) => {
  const allowed = ["accountant", "supervisor", "manager", "hr"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "Requires accountant, supervisor, manager or hr role" });
  }
  next();
};

/** Duyệt đơn nghỉ: Supervisor, Manager hoặc HR */
export const supervisorManagerOrHr = (req, res, next) => {
  const allowed = ["supervisor", "manager", "hr"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "Requires supervisor, manager or hr role" });
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

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DATA-LEVEL ACCESS CONTROL (Kiểm soát quyền truy cập dữ liệu)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Kiểm tra xem user có quyền xem dữ liệu của một nhân viên khác không
 * Manager & HR: Xem tất cả
 * Supervisor: Xem đội nhóm (dựa trên departmentId)
 * Employee: Chỉ xem cá nhân
 */
export const canAccessEmployeeData = (req, res, next) => {
  const { role, id: userId, departmentId: userDepartmentId } = req.user || {};
  const targetUserId = parseInt(req.params.id);
  const roleLower = role ? String(role).toLowerCase() : "";

  // Manager, HR & Kế toán: xem toàn bộ hồ sơ (lương / BHXH / đối soát)
  if (["manager", "hr", "accountant"].includes(roleLower)) {
    next();
    return;
  }

  // Supervisor chỉ xem đội nhóm (cần kiểm tra departmentId)
  if (roleLower === "supervisor") {
    // Lưu targetUserId vào req.targetUserId để controller kiểm tra sau
    req.targetUserId = targetUserId;
    next();
    return;
  }

  // Employee chỉ xem cá nhân
  if (roleLower === "employee" && userId === targetUserId) {
    next();
    return;
  }

  return res.status(403).json({
    status: "error",
    message: "You don't have permission to access this employee's data"
  });
};

/**
 * Kiểm tra xem user là quản lý của nhân viên hay không
 * Dùng để supervisor xem dữ liệu đội
 */
export const isTeamMember = async (req, res, next) => {
  const { role, departmentId: userDepartmentId } = req.user || {};
  const targetUserId = parseInt(req.params.id);
  const roleLower = role ? String(role).toLowerCase() : "";

  if (roleLower === "manager") {
    return next();
  }

  // Supervisor, accountant chỉ xem đội nhóm
  if (["supervisor", "accountant"].includes(roleLower)) {
    // Note: Controller sẽ kiểm tra departmentId sau khi load employee
    req.ensureTeamCheck = true;
    return next();
  }

  return res.status(403).json({
    status: "error",
    message: "You don't have team access"
  });
};

/**
 * Flexible role checker - cho phép 1 hay nhiều role
 * @example requireRoles(['manager', 'hr'])(req, res, next)
 */
export const requireRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({
        status: "error",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`
      });
    }
    next();
  };
};

// Legacy aliases for older route modules.
// `authorize` normalizes old uppercase role inputs (e.g., "HR")
// to current lowercase role values used in JWT payloads.
export const authenticate = authMiddleware;
export const authorize = (allowedRoles = []) =>
  requireRoles((allowedRoles || []).map((role) => String(role).toLowerCase()));

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HELPER FUNCTIONS - Kiểm tra quyền mà không cần middleware
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Kiểm tra user có toàn quyền quản lý không (manager)
 */
export const isManager = (user) => user?.role === "manager";

/**
 * Kiểm tra user là staff (không phải employee)
 */
export const isStaff = (user) => ["manager", "hr", "accountant", "supervisor"].includes(user?.role);

/**
 * Kiểm tra user có quyền xem lương của nhân viên khác không
 */
export const canViewSalary = (user, targetUserId) => {
  if (!user) return false;
  
  // Manager, HR, Accountant xem tất cả
  if (["manager", "hr", "accountant"].includes(user.role)) return true;
  
  // Supervisor xem đội (sẽ kiểm tra departmentId sau)
  if (user.role === "supervisor") return true;
  
  // Employee chỉ xem cá nhân
  if (user.role === "employee" && user.id === targetUserId) return true;
  
  return false;
};

/**
 * Kiểm tra user có quyền phê duyệt lương không
 */
export const canApproveSalary = (user) => {
  // Policy: only Supervisor + Manager can approve (pending -> approved).
  return ["manager", "supervisor"].includes(user?.role);
};

/**
 * Kiểm tra user có quyền phê duyệt nghỉ phép không
 */
export const canApproveLeave = (user) => {
  return ["manager", "supervisor"].includes(user?.role);
};

/**
 * Kiểm tra user có quyền xem báo cáo không
 */
export const canViewReports_Helper = (user) => {
  return ["manager", "hr", "accountant", "supervisor"].includes(user?.role);
};

/**
 * Kiểm tra user có quyền cập nhật profile của nhân viên không
 */
export const canUpdateEmployeeProfile = (user, targetUserId) => {
  if (!user) return false;
  
  // Manager, HR cập nhật tất cả
  if (["manager", "hr"].includes(user.role)) return true;
  
  // Employee chỉ cập nhật cá nhân
  if (user.role === "employee" && user.id === targetUserId) return true;
  
  return false;
};