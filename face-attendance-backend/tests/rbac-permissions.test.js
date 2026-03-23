import test from "node:test";
import assert from "node:assert/strict";
import { PERMISSIONS, getPermissionsByRole, hasPermission } from "../src/config/permissionMatrix.js";
import { requirePermission } from "../src/middleware/authMiddleware.js";

test("manager has critical governance permissions", () => {
  const managerPermissions = getPermissionsByRole("manager");
  assert.ok(managerPermissions.includes(PERMISSIONS.user_role_update));
  assert.ok(managerPermissions.includes(PERMISSIONS.audit_view));
  assert.equal(hasPermission("manager", PERMISSIONS.user_delete), true);
});

test("employee has no privileged permissions", () => {
  const employeePermissions = getPermissionsByRole("employee");
  assert.equal(employeePermissions.length, 0);
  assert.equal(hasPermission("employee", PERMISSIONS.report_view), false);
});

test("requirePermission allows matching permission", () => {
  const middleware = requirePermission(PERMISSIONS.user_read);
  const req = { user: { role: "hr", permissions: [PERMISSIONS.user_read] } };
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
  const middleware = requirePermission(PERMISSIONS.user_delete);
  const req = { user: { role: "hr", permissions: [PERMISSIONS.user_read] } };
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
