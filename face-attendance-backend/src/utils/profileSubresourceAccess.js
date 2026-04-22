import User from "../models/pg/User.js";

const STAFF_ROLES = new Set(["manager", "hr", "accountant", "supervisor"]);

export function isStaffProfileEditor(req) {
  return STAFF_ROLES.has(String(req.user?.role || "").toLowerCase());
}

/**
 * Employee chỉ thao tác trên chính userId; staff (manager/hr/accountant/supervisor) có quyền theo nghiệp vụ hồ sơ.
 * Supervisor: giới hạn cùng phòng ban với nhân viên (đồng bộ hướng xử lý work experience).
 */
export async function assertCanManageProfileSubresource(req, res, employeeUserId) {
  const eid = Number.parseInt(String(employeeUserId), 10);
  const self = Number.parseInt(String(req.user?.userId ?? req.user?.id ?? ""), 10);
  if (!Number.isFinite(eid) || eid < 1) {
    res.status(400).json({ status: "error", message: "Invalid user id" });
    return false;
  }

  const role = String(req.user?.role || "").toLowerCase();

  if (["manager", "hr", "accountant"].includes(role)) {
    return true;
  }

  if (role === "employee") {
    if (Number.isFinite(self) && self === eid) {
      return true;
    }
    res.status(403).json({ status: "error", message: "Forbidden" });
    return false;
  }

  if (role === "supervisor") {
    const emp = await User.findByPk(eid, { attributes: ["id", "departmentId", "role"] });
    if (!emp || String(emp.role || "").toLowerCase() !== "employee") {
      res.status(404).json({ status: "error", message: "Employee not found" });
      return false;
    }
    const sd = Number.parseInt(String(req.user?.departmentId ?? ""), 10);
    if (Number.isFinite(sd) && sd > 0 && emp.departmentId === sd) {
      return true;
    }
    res.status(403).json({ status: "error", message: "Forbidden" });
    return false;
  }

  res.status(403).json({ status: "error", message: "Forbidden" });
  return false;
}

export async function assertCanMutateExistingSubresource(req, res, recordUserId) {
  return assertCanManageProfileSubresource(req, res, recordUserId);
}
