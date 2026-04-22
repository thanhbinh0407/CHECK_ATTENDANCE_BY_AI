import User from "../models/pg/User.js";

/**
 * Role chains for `resolveApprovalChain` (overtime, business trip, salary advance).
 * Leave uses single-step approve/reject in leaveController — not routed through this file.
 */
const DEFAULT_POLICIES = {
  leave: ["supervisor"],
  overtime: ["supervisor"],
  business_trip: ["supervisor"],
  /** Single-step: Supervisor approve/reject is final (no accountant tier in chain). */
  salary_advance: ["supervisor"],
};

function dedupeRoles(roles = []) {
  return [...new Set(roles.filter(Boolean))];
}

async function resolveApproverIdForRole(role, requester) {
  if (!role) return null;

  if (role === "supervisor") {
    const manager = requester?.managerId ? await User.findByPk(requester.managerId) : null;
    if (manager?.isActive && manager.role === "supervisor") {
      return manager.id;
    }
  }

  if (role === "manager") {
    const manager = requester?.managerId ? await User.findByPk(requester.managerId) : null;
    if (manager?.isActive && manager.role === "manager") {
      return manager.id;
    }
  }

  const fallback = await User.findOne({
    where: { role, isActive: true },
    order: [["id", "ASC"]],
  });
  return fallback?.id || null;
}

export async function buildApprovalChain(requestType, requester, context = {}) {
  const rawRoles = DEFAULT_POLICIES[requestType] || ["supervisor", "manager"];
  const roles = [...rawRoles];
  return dedupeRoles(roles);
}

export async function resolveApprovalChain(requestType, requester, context = {}) {
  const roles = await buildApprovalChain(requestType, requester, context);
  const approverIds = [];
  for (const role of roles) {
    const approverId = await resolveApproverIdForRole(role, requester);
    if (approverId && !approverIds.includes(approverId)) {
      approverIds.push(approverId);
    }
  }
  return approverIds;
}
