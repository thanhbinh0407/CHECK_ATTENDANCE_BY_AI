import User from "../models/pg/User.js";

const DEFAULT_POLICIES = {
  leave: ["supervisor", "manager"],
  overtime: ["supervisor", "manager"],
  business_trip: ["supervisor", "manager"],
  salary_advance: ["supervisor", "accountant", "manager"],
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

  if (requestType === "salary_advance") {
    const amount = Number(context.amount || 0);
    if (amount > 0 && amount <= 5000000) {
      // Small amount: supervisor + accountant are enough
      return dedupeRoles(["supervisor", "accountant"]);
    }
  }

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
