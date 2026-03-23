export const PERMISSIONS = {
  user_read: "user:read",
  user_create: "user:create",
  user_update: "user:update",
  user_delete: "user:delete",
  user_role_update: "user:role:update",
  user_password_reset: "user:password:reset",
  employee_profile_update: "employee:profile:update",
  payroll_manage: "payroll:manage",
  salary_approve: "salary:approve",
  request_approve: "request:approve",
  report_view: "report:view",
  audit_view: "audit:view",
};

export const ROLE_PERMISSIONS = {
  manager: [
    PERMISSIONS.user_read,
    PERMISSIONS.user_create,
    PERMISSIONS.user_update,
    PERMISSIONS.user_delete,
    PERMISSIONS.user_role_update,
    PERMISSIONS.user_password_reset,
    PERMISSIONS.employee_profile_update,
    PERMISSIONS.payroll_manage,
    PERMISSIONS.salary_approve,
    PERMISSIONS.request_approve,
    PERMISSIONS.report_view,
    PERMISSIONS.audit_view,
  ],
  hr: [
    PERMISSIONS.user_read,
    PERMISSIONS.user_create,
    PERMISSIONS.user_update,
    PERMISSIONS.employee_profile_update,
  ],
  accountant: [
    PERMISSIONS.user_read,
    PERMISSIONS.payroll_manage,
    PERMISSIONS.salary_approve,
    PERMISSIONS.report_view,
  ],
  supervisor: [
    PERMISSIONS.user_read,
    PERMISSIONS.request_approve,
    PERMISSIONS.salary_approve,
    PERMISSIONS.report_view,
  ],
  employee: [],
};

export function getPermissionsByRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role, permission) {
  return getPermissionsByRole(role).includes(permission);
}
