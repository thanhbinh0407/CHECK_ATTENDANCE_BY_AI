# Role Management System - Implementation Guide

## Overview
This document describes the updated role management system that allows:
- Creating and managing users with different roles (manager, hr, accountant, supervisor, employee)
- Changing user roles dynamically
- Viewing role-based statistics in the dashboard
- Proper permissions and access control

## Test Account Credentials

### Role-Based Accounts
These accounts are automatically created by `seed-data.js` or can be ensured via `ensure-test-users.js`:

```
Manager:
  Email:    manager@company.com
  Password: Manager@12345
  Role:     manager (Giám đốc/Quản trị)

HR Staff:
  Email:    hr@company.com
  Password: HR@12345
  Role:     hr (Nhân sự)

Accountant:
  Email:    accountant@company.com
  Password: Accountant@12345
  Role:     accountant (Kế toán)

Supervisor:
  Email:    supervisor@company.com
  Password: Supervisor@12345
  Role:     supervisor (Quản lý)

Employees:
  Email Range:  emp001@company.com to emp050@company.com
  Password:     Password123!
  Role:         employee (Nhân viên)
```

## Scripts

### seed-data.js
Main seeding script that creates:
- All 50 employees (emp001-emp050)
- 4 role-based accounts (manager, hr, accountant, supervisor)
- Departments, job titles, salary grades
- Sample data (dependents, attendance, leave, etc.)

**Usage:**
```bash
node seed-data.js
```

### ensure-test-users.js
Standaloneacript to create or update test user accounts. Useful for:
- Resetting test account passwords
- Recreating test accounts if deleted
- Ensuring all required test accounts exist

**Usage:**
```bash
node ensure-test-users.js
```

## Key Changes Made

### 1. Backend (adminController.js)
**Problem:** Only users with `role: "employee"` were returned by the API, so role-based accounts (manager, hr, accountant, supervisor) couldn't be viewed or managed.

**Solution:** Removed the `role: "employee"` filter from all functions:
- `getAllEmployees` - Returns ALL users, not just employees
- `getEmployeeById` - Works with all user types
- `getEmployeeWithPassword` - Works with all user types  
- `updateEmployee` - Can update any user type
- `deleteEmployee` - Can delete any user type
- `getEmployeeDetailedInfo` - Works with all user types
- `getEmployeeHistory` - Works with all user types

**Impact:** Now manager, hr, accountant, and supervisor accounts are visible and can be managed through the User Management interface.

### 2. Role Change Functionality
The role change functionality was already in place via `updateUserRole` endpoint:
- **Endpoint:** `PATCH /api/admin/users/:id/role`
- **Permissions:** Only manager can change roles
- **Auditing:** All role changes are logged in `RoleChangeAudit` table
- **Frontend:** "Change Role" button in User Management updates user role

### 3. Dashboard Display
The Manager Overview dashboard shows:
- Total employees count
- Active/inactive employee count
- Total payroll base
- **System Distribution:** Shows count of users by role (manager, hr, accountant, supervisor, employee)

## How to Change a User's Role

### Via Manager Portal
1. Log in as Manager (manager@company.com / Manager@12345)
2. Go to "User Management" page
3. Find the user to change
4. Click "Change Role" button
5. Select new role from dropdown
6. (Optional) Add reason for change
7. Click "Update Role"
8. View audit log to confirm change

### Endpoint Usage (API)
```bash
curl -X PATCH http://localhost:5000/api/admin/users/{userId}/role \
  -H "Authorization: Bearer {managerToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "supervisor",
    "reason": "Promoted to supervisor role"
  }'
```

## Role Permissions Matrix

| Permission | Manager | HR | Accountant | Supervisor | Employee |
|-----------|---------|----|-----------|-----------| |
| user:read | ✅ | ✅ | ✅ | ✅ | ❌ |
| user:create | ✅ | ✅ | ❌ | ❌ | ❌ |
| user:update | ✅ | ✅ | ❌ | ❌ | ❌ |
| user:delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| user:role:update | ✅ | ❌ | ❌ | ❌ | ❌ |
| user:password:reset | ✅ | ❌ | ❌ | ❌ | ❌ |
| employee:profile:update | ✅ | ✅ | ❌ | ❌ | ❌ |
| payroll:manage | ✅ | ❌ | ✅ | ❌ | ❌ |
| salary:approve | ✅ | ❌ | ✅ | ✅ | ❌ |
| request:approve | ✅ | ❌ | ❌ | ✅ | ❌ |
| report:view | ✅ | ❌ | ✅ | ✅ | ❌ |
| audit:view | ✅ | ❌ | ❌ | ❌ | ❌ |

## Testing the System

### 1. Create Test Data
```bash
# Run in backend directory
node seed-data.js
```

### 2. Test Login with Different Roles
- Manager: manager@company.com / Manager@12345
- HR: hr@company.com / HR@12345
- Accountant: accountant@company.com / Accountant@12345
- Supervisor: supervisor@company.com / Supervisor@12345
- Employee: emp001@company.com / Password123!

### 3. Test Role Change
1. Log in as Manager
2. Go to User Management
3. Select any user (e.g., emp001)
4. Click "Change Role"
5. Change role to "supervisor"
6. Verify in audit log

### 4. Verify Dashboard Update
- Check "System Distribution" section
- Should show updated role counts
- Refresh page to see latest changes

## Troubleshooting

### Issue: Role-based accounts not showing in User Management
**Solution:** Ensure backend changes are deployed and `getAllEmployees` returns all users.

### Issue: Can't change role of an account
**Possible causes:**
1. Only managers can change roles
2. You can't change your own role
3. Invalid role selection
**Solution:** Log in as manager and ensure you're not trying to change the manager's own role.

### Issue: Password doesn't work after reset
**Solution:** Run `ensure-test-users.js` to reset all test account passwords.

## Branch
Implementation completed on: **ThanhBinh-Leader**

## Next Steps
1. Deploy changes to production
2. Run seed-data.js to create test accounts
3. Test role change functionality
4. Monitor role change audit logs
