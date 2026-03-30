import test from "node:test";
import assert from "node:assert/strict";
import { PERMISSIONS, getPermissionsByRole, hasPermission } from "../src/config/permissionMatrix.js";
import { requirePermission } from "../src/middleware/authMiddleware.js";
import { canTransitionSalaryStatus, getSalaryTransitionError } from "../src/services/salaryStatusRBAC.js";
import { computeAbsentDays, getSalaryStatusAfterRecalc } from "../src/services/salaryCalculationService.js";

test("manager has critical governance permissions", () => {
  const managerPermissions = getPermissionsByRole("manager");
  assert.ok(managerPermissions.includes(PERMISSIONS["user:role:update"]));
  assert.ok(managerPermissions.includes(PERMISSIONS["audit:view"]));
  assert.equal(hasPermission("manager", PERMISSIONS["user:delete"]), true);
});

test("employee has no privileged permissions", () => {
  const employeePermissions = getPermissionsByRole("employee");
  assert.equal(hasPermission("employee", PERMISSIONS["user:role:update"]), false);
  assert.equal(hasPermission("employee", PERMISSIONS["report:view"]), false);
});

test("hr maps to HR permission set", () => {
  const hrPerms = getPermissionsByRole("hr");
  assert.ok(hrPerms.includes(PERMISSIONS["user:read"]));
  assert.ok(hrPerms.includes(PERMISSIONS["user:update"]));
});

test("requirePermission allows matching permission", () => {
  const middleware = requirePermission(PERMISSIONS["user:read"]);
  const req = { user: { role: "hr", permissions: [PERMISSIONS["user:read"]] } };
  const res = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };

  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test("requirePermission blocks missing permission", () => {
  const middleware = requirePermission(PERMISSIONS["user:delete"]);
  const req = { user: { role: "hr", permissions: [PERMISSIONS["user:read"]] } };
  const res = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };

  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.status, "error");
});

test("salary workflow RBAC: pending -> approved (Supervisor/Manager)", () => {
  assert.equal(
    canTransitionSalaryStatus({ fromStatus: "pending", toStatus: "approved", role: "supervisor" }),
    true
  );
  assert.equal(
    canTransitionSalaryStatus({ fromStatus: "pending", toStatus: "approved", role: "manager" }),
    true
  );
});

test("salary workflow RBAC: accountant cannot approve", () => {
  assert.equal(
    canTransitionSalaryStatus({ fromStatus: "pending", toStatus: "approved", role: "accountant" }),
    false
  );
  const err = getSalaryTransitionError({ fromStatus: "pending", toStatus: "approved", role: "accountant" });
  assert.ok(err && err.includes("approve"));
});

test("salary workflow RBAC: approved -> paid (Accountant-only)", () => {
  assert.equal(
    canTransitionSalaryStatus({ fromStatus: "approved", toStatus: "paid", role: "accountant" }),
    true
  );
  assert.equal(
    canTransitionSalaryStatus({ fromStatus: "approved", toStatus: "paid", role: "manager" }),
    false
  );
});

test("salary workflow RBAC: paid -> pending (Manager-only revert)", () => {
  assert.equal(
    canTransitionSalaryStatus({ fromStatus: "paid", toStatus: "pending", role: "manager" }),
    true
  );
  assert.equal(
    canTransitionSalaryStatus({ fromStatus: "paid", toStatus: "pending", role: "supervisor" }),
    false
  );
});

test("salary: approved leave days are not counted as absentDays", () => {
  const absentDays = computeAbsentDays({
    totalWorkingDays: 10,
    presentDayNumbers: new Set([1, 2, 3, 4, 5, 6, 7]),
    approvedLeaveDayNumbers: new Set([8, 9, 10]),
  });
  assert.equal(absentDays, 0);
});

test("salary: recalc approved -> pending (re-approval required)", () => {
  const decision = getSalaryStatusAfterRecalc({ currentStatus: "approved" });
  assert.equal(decision.ok, true);
  assert.equal(decision.nextStatus, "pending");
});
