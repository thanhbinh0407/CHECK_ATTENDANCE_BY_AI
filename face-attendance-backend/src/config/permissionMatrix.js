/**
 * PERMISSION MATRIX - Quyền hạn tối ưu hóa cho hệ thống HRMS
 * Được tổ chức theo module với permissions được gộp và đơn giản hóa
 */

export const PERMISSIONS = {
  // ============ USER MANAGEMENT ============
  'user:read': 'user:read',                      // Xem danh sách nhân viên (all/team/own)
  'user:create': 'user:create',                  // Tạo nhân viên mới (bao gồm import)
  'user:update': 'user:update',                  // Cập nhật thông tin nhân viên (all/own)
  'user:delete': 'user:delete',                  // Xóa nhân viên
  'user:role:update': 'user:role:update',        // Thay đổi role và reset password
  'profile:view:own': 'profile:view:own',        // Xem hồ sơ cá nhân
  'profile:update:own': 'profile:update:own',    // Cập nhật hồ sơ cá nhân

  // ============ PAYROLL MANAGEMENT ============
  'payroll:read': 'payroll:read',                // Xem bảng lương (all/team/own)
  'payroll:create': 'payroll:create',            // Tạo bảng lương
  'payroll:update': 'payroll:update',            // Cập nhật bảng lương
  'payroll:approve': 'payroll:approve',          // Phê duyệt bảng lương
  'payroll:export': 'payroll:export',            // Xuất bảng lương
  'salary:advance:manage': 'salary:advance:manage', // Quản lý tạm ứng lương

  // ============ LEAVE MANAGEMENT ============
  'leave:read': 'leave:read',                    // Xem đơn nghỉ (all/team/own)
  'leave:create': 'leave:create',                // Tạo đơn nghỉ
  'leave:approve': 'leave:approve',              // Phê duyệt đơn nghỉ
  'leave:balance:view': 'leave:balance:view',    // Xem số ngày phép

  // ============ ATTENDANCE MANAGEMENT ============
  'attendance:read': 'attendance:read',          // Xem chấm công (all/team/own)
  'attendance:stats:view': 'attendance:stats:view', // Xem thống kê chấm công

  // ============ REQUEST MANAGEMENT ============
  'request:read': 'request:read',                // Xem yêu cầu (all/own)
  'request:create': 'request:create',            // Tạo yêu cầu (overtime, business trip)
  'request:approve': 'request:approve',          // Phê duyệt yêu cầu

  // ============ REPORTS ============
  'report:view': 'report:view',                  // Xem báo cáo (all types)
  'report:d02lt:view': 'report:d02lt:view',      // Xem báo cáo D02-LT (insurance)
  'report:export': 'report:export',              // Xuất báo cáo

  // ============ ORGANIZATION MANAGEMENT ============
  'org:department:manage': 'org:department:manage',   // Quản lý phòng ban
  'org:jobtitle:manage': 'org:jobtitle:manage',       // Quản lý chức vụ
  'org:shift:manage': 'org:shift:manage',             // Quản lý ca làm việc
  'org:salary:grade:manage': 'org:salary:grade:manage', // Quản lý cấp bậc lương

  // ============ INSURANCE MANAGEMENT ============
  'insurance:config': 'insurance:config',        // Cấu hình bảo hiểm
  'insurance:forms:manage': 'insurance:forms:manage', // Quản lý form bảo hiểm

  // ============ APPROVAL WORKFLOW ============
  'approval:manage': 'approval:manage',          // Quản lý các approval workflow

  // ============ DOCUMENT MANAGEMENT ============
  'document:view': 'document:view',              // Xem tài liệu (all/own)
  'document:manage': 'document:manage',          // Quản lý tài liệu

  // ============ SYSTEM ADMINISTRATION ============
  'system:config': 'system:config',              // Cấu hình hệ thống
  'audit:view': 'audit:view',                    // Xem audit logs
};

export const ROLE_PERMISSIONS = {
  /**
   * MANAGER - Toàn quyền quản lý hệ thống
   */
  Manager: [
    // User Management - Full access
    PERMISSIONS['user:read'],
    PERMISSIONS['user:create'],
    PERMISSIONS['user:update'],
    PERMISSIONS['user:delete'],
    PERMISSIONS['user:role:update'],

    // Payroll - Full access
    PERMISSIONS['payroll:read'],
    PERMISSIONS['payroll:create'],
    PERMISSIONS['payroll:update'],
    PERMISSIONS['payroll:approve'],
    PERMISSIONS['payroll:export'],
    PERMISSIONS['salary:advance:manage'],

    // Leave - Full access
    PERMISSIONS['leave:read'],
    PERMISSIONS['leave:approve'],

    // Attendance - Full access
    PERMISSIONS['attendance:read'],
    PERMISSIONS['attendance:stats:view'],

    // Requests - Full access
    PERMISSIONS['request:read'],
    PERMISSIONS['request:approve'],

    // Reports - Full access
    PERMISSIONS['report:view'],
    PERMISSIONS['report:d02lt:view'],
    PERMISSIONS['report:export'],

    // Organization - Full access
    PERMISSIONS['org:department:manage'],
    PERMISSIONS['org:jobtitle:manage'],
    PERMISSIONS['org:shift:manage'],
    PERMISSIONS['org:salary:grade:manage'],

    // Insurance - Full access
    PERMISSIONS['insurance:config'],
    PERMISSIONS['insurance:forms:manage'],

    // Approvals - Full access
    PERMISSIONS['approval:manage'],

    // Documents - Full access
    PERMISSIONS['document:view'],
    PERMISSIONS['document:manage'],

    // System - Full access
    PERMISSIONS['system:config'],
    PERMISSIONS['audit:view'],
  ],

  /**
   * HR - Tập trung quản lý nhân sự
   */
  HR: [
    // User Management — per UC-07.x: view list, edit info, delete, reset password (no create)
    PERMISSIONS['user:read'],
    PERMISSIONS['user:update'],
    PERMISSIONS['user:delete'],
    PERMISSIONS['user:role:update'],

    // Payroll - Read only
    PERMISSIONS['payroll:read'],

    // Leave - Full access
    PERMISSIONS['leave:read'],
    PERMISSIONS['leave:approve'],

    // Attendance - Full access
    PERMISSIONS['attendance:read'],
    PERMISSIONS['attendance:stats:view'],

    // Organization - Full access
    PERMISSIONS['org:department:manage'],
    PERMISSIONS['org:jobtitle:manage'],
    PERMISSIONS['org:shift:manage'],

    // Reports - HR focused
    PERMISSIONS['report:view'],
    PERMISSIONS['report:export'],

    // Documents - Read access
    PERMISSIONS['document:view'],
  ],

  /**
   * ACCOUNTANT - Tập trung quản lý tài chính
   */
  Accountant: [
    // User Management — read list + update employee records (salary/contact for payroll)
    PERMISSIONS['user:read'],
    PERMISSIONS['user:update'],

    // Payroll - Full access
    PERMISSIONS['payroll:read'],
    PERMISSIONS['payroll:create'],
    PERMISSIONS['payroll:update'],
    PERMISSIONS['payroll:approve'],
    PERMISSIONS['payroll:export'],
    PERMISSIONS['salary:advance:manage'],

    // Attendance - Read only
    PERMISSIONS['attendance:read'],

    // Organization - Salary grades only
    PERMISSIONS['org:salary:grade:manage'],

    // Insurance - Full access
    PERMISSIONS['insurance:config'],
    PERMISSIONS['insurance:forms:manage'],

    // Reports - Finance focused
    PERMISSIONS['report:view'],
    PERMISSIONS['report:d02lt:view'],
    PERMISSIONS['report:export'],
  ],

  /**
   * SUPERVISOR - Quản lý đội nhóm
   */
  Supervisor: [
    // User Management - Team read only
    PERMISSIONS['user:read'],

    // Payroll - Team read only
    PERMISSIONS['payroll:read'],

    // Leave - Team management
    PERMISSIONS['leave:read'],
    PERMISSIONS['leave:approve'],

    // Attendance - Team access
    PERMISSIONS['attendance:read'],
    PERMISSIONS['attendance:stats:view'],

    // Requests - Team approval
    PERMISSIONS['request:read'],
    PERMISSIONS['request:approve'],

    // Reports - Team focused
    PERMISSIONS['report:view'],

    // Approvals - Team level
    PERMISSIONS['approval:manage'],
  ],

  /**
   * EMPLOYEE - Quyền hạn tối thiểu
   */
  Employee: [
    // Personal Profile
    PERMISSIONS['profile:view:own'],
    PERMISSIONS['profile:update:own'],

    // Personal Payroll - Read only
    PERMISSIONS['payroll:read'],

    // Personal Leave
    PERMISSIONS['leave:read'],
    PERMISSIONS['leave:create'],
    PERMISSIONS['leave:balance:view'],

    // Personal Attendance
    PERMISSIONS['attendance:read'],

    // Personal Requests
    PERMISSIONS['request:read'],
    PERMISSIONS['request:create'],

    // Personal Documents
    PERMISSIONS['document:view'],
  ],
};

/** DB/API dùng role chữ thường; matrix dùng key như Manager, HR */
const ROLE_KEY_BY_API_ROLE = {
  manager: "Manager",
  hr: "HR",
  accountant: "Accountant",
  supervisor: "Supervisor",
  employee: "Employee",
};

export function getPermissionsByRole(role) {
  if (!role) return [];
  const trimmed = String(role).trim();
  const lower = trimmed.toLowerCase();
  const mapped = ROLE_KEY_BY_API_ROLE[lower];
  if (mapped && ROLE_PERMISSIONS[mapped]) {
    return ROLE_PERMISSIONS[mapped];
  }
  if (ROLE_PERMISSIONS[trimmed]) {
    return ROLE_PERMISSIONS[trimmed];
  }
  const normalizedCapitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return ROLE_PERMISSIONS[normalizedCapitalized] || [];
}

export function hasPermission(role, permission) {
  return getPermissionsByRole(role).includes(permission);
}

/**
 * Check if user has permission with scope consideration
 * @param {string} userRole - User's role
 * @param {string} permission - Permission to check
 * @param {string} scope - Scope (own/team/all) - optional
 * @returns {boolean}
 */
export function hasPermissionWithScope(userRole, permission, scope = null) {
  const userPermissions = getPermissionsByRole(userRole);

  // If no scope specified, check exact permission
  if (!scope) {
    return userPermissions.includes(permission);
  }

  // For scoped permissions, check if user has the base permission
  // The actual scope filtering is handled in the API layer
  return userPermissions.includes(permission);
}

/**
 * Get all available permissions
 * @returns {string[]} Array of all permission strings
 */
export function getAllPermissions() {
  return Object.values(PERMISSIONS);
}

/**
 * Get permissions grouped by module
 * @returns {Object} Permissions grouped by module
 */
export function getPermissionsByModule() {
  const grouped = {};

  Object.values(PERMISSIONS).forEach(permission => {
    const module = permission.split(':')[0];
    if (!grouped[module]) {
      grouped[module] = [];
    }
    grouped[module].push(permission);
  });

  return grouped;
}
