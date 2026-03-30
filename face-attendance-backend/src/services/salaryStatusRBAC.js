/**
 * Pure RBAC + workflow validation for salary status transitions.
 * Keep this module free of DB/model imports so it can be unit-tested easily.
 */

export const SALARY_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  PAID: "paid",
});

/**
 * @param {object} params
 * @param {"pending"|"approved"|"paid"} params.fromStatus
 * @param {"pending"|"approved"|"paid"} params.toStatus
 * @param {string} params.role - req.user.role
 */
export function canTransitionSalaryStatus({ fromStatus, toStatus, role }) {
  // Normalize role to avoid surprises.
  const r = String(role || "").toLowerCase();
  const from = fromStatus;
  const to = toStatus;

  // pending -> approved (Supervisor + Manager)
  if (from === SALARY_STATUS.PENDING && to === SALARY_STATUS.APPROVED) {
    return r === "supervisor" || r === "manager";
  }

  // approved -> paid (Accountant-only)
  if (from === SALARY_STATUS.APPROVED && to === SALARY_STATUS.PAID) {
    return r === "accountant";
  }

  // paid -> pending (Manager audit revert only)
  if (from === SALARY_STATUS.PAID && to === SALARY_STATUS.PENDING) {
    return r === "manager";
  }

  // Reject all other transitions by default.
  return false;
}

/**
 * Validate a transition and return a friendly error message.
 * @param {object} params
 * @param {"pending"|"approved"|"paid"} params.fromStatus
 * @param {"pending"|"approved"|"paid"} params.toStatus
 * @param {string} params.role
 */
export function getSalaryTransitionError({ fromStatus, toStatus, role }) {
  if (canTransitionSalaryStatus({ fromStatus, toStatus, role })) return null;

  // Provide specific messages for easier debugging/UI.
  const r = String(role || "").toLowerCase();
  if (fromStatus === "pending" && toStatus === "approved") {
    return `Only Supervisor/Manager can approve salary (role=${r}).`;
  }
  if (fromStatus === "approved" && toStatus === "paid") {
    return `Only Accountant can mark salary as paid (role=${r}).`;
  }
  if (fromStatus === "paid" && toStatus === "pending") {
    return `Only Manager can revert paid salary (role=${r}).`;
  }
  return `Invalid salary status transition: ${fromStatus} -> ${toStatus} (role=${r}).`;
}

