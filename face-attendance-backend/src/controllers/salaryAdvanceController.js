import SalaryAdvance from "../models/pg/SalaryAdvance.js";
import User from "../models/pg/User.js";
import { calculateSalaryForUser } from "../services/salaryCalculationService.js";
import { resolveApprovalChain } from "../services/approvalPolicyService.js";
import { createNotification } from "./notificationController.js";
import { emitApprovalEvent } from "../services/actionAuditService.js";
import {
  formatSalaryAdvancePayoutDateISO,
  getConfiguredSalaryAdvancePayoutDay,
  isSalaryAdvanceDisburseAllowedToday,
} from "../utils/salaryAdvancePayout.js";

function enrichAdvanceRow(a) {
  const plain = a && typeof a.toJSON === "function" ? a.toJSON() : { ...a };
  return {
    ...plain,
    payoutDueDate: formatSalaryAdvancePayoutDateISO(plain.year, plain.month),
    configuredPayoutDay: getConfiguredSalaryAdvancePayoutDay(),
  };
}

// Get all salary advances
export const getSalaryAdvances = async (req, res) => {
  try {
    const { userId, month, year, status } = req.query;

    const where = {};
    const queryUserId = userId != null && userId !== "" && userId !== "undefined" ? userId : null;
    const canViewAll = ["manager", "supervisor", "accountant"].includes(req.user?.role);
    const tokenUserId = req.user?.id ?? req.user?.userId;
    const role = req.user?.role;

    // Employees always see only their own advances (same as POST); ignore ?userId= for staff-style filters.
    if (role === "employee") {
      if (tokenUserId != null) where.userId = tokenUserId;
    } else if (queryUserId != null) {
      const parsed = parseInt(queryUserId, 10);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({
          status: "error",
          message: "userId must be a valid number"
        });
      }
      where.userId = parsed;
    } else if (!canViewAll) {
      if (tokenUserId != null) where.userId = tokenUserId;
    }
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.approvalStatus = status;

    const advances = await SalaryAdvance.findAll({
      where,
      include: [
        { model: User, attributes: ['id', 'name', 'employeeCode', 'email'] },
        { model: User, as: 'Approver', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'CurrentApprover', attributes: ['id', 'name', 'email'] }
      ],
      order: [
        ['updatedAt', 'DESC'],
        ['id', 'DESC']
      ]
    });

    const enriched = advances.map(enrichAdvanceRow);

    return res.json({
      status: "success",
      advances: enriched,
      salaryAdvances: enriched,
    });
  } catch (err) {
    console.error("Error fetching salary advances:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create salary advance request
export const createSalaryAdvance = async (req, res) => {
  try {
    const { month, year, amount, reason } = req.body;
    const userId = req.user?.id ?? req.user?.userId;
    if (userId == null) {
      return res.status(401).json({
        status: "error",
        message: "User not identified"
      });
    }

    if (!month || !year || !amount) {
      return res.status(400).json({
        status: "error",
        message: "Month, year, and amount are required"
      });
    }

    // Check if advance already exists for this month/year
    const existing = await SalaryAdvance.findOne({
      where: { userId, month: parseInt(month), year: parseInt(year) }
    });

    if (existing) {
      return res.status(400).json({
        status: "error",
        message: "Salary advance already exists for this month/year"
      });
    }

    // Get user's manager for approval
    const user = await User.findByPk(userId, {
      include: [{ model: User, as: 'Manager' }]
    });

    // Resolve first approver from policy chain
    const approvalChain = await resolveApprovalChain('salary_advance', user, { amount: parseFloat(amount) });
    const approverId = approvalChain[0] || null;

    const advance = await SalaryAdvance.create({
      userId,
      month: parseInt(month),
      year: parseInt(year),
      amount: parseFloat(amount),
      reason: reason || null,
      approvalLevel: 1,
      currentApproverId: approverId || null,
    });

    // Notify first approver from policy chain
    if (approverId) {
      await createNotification(
        approverId,
        "salary_advance",
        "New Salary Advance Request",
        `${user.name} has requested a salary advance of ${parseFloat(amount).toLocaleString("en-US")} VND for ${month}/${year}`,
        { salaryAdvanceId: advance.id }
      );
    }

    return res.json({
      status: "success",
      message: "Salary advance request created successfully",
      advance: enrichAdvanceRow(advance),
    });
  } catch (err) {
    console.error("Error creating salary advance:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Approve/Reject salary advance
export const approveSalaryAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body;
    const approverId = req.user?.id ?? req.user?.userId;

    const advance = await SalaryAdvance.findByPk(id, {
      include: [{ model: User }]
    });

    if (!advance) {
      return res.status(404).json({
        status: "error",
        message: "Salary advance not found"
      });
    }

    if (advance.approvalStatus !== 'pending') {
      return res.status(400).json({
        status: "error",
        message: "Request has already been processed"
      });
    }

    // Only manager/supervisor/accountant can approve
    const approver = await User.findByPk(approverId);
    if (!['manager', 'supervisor', 'accountant'].includes(approver.role)) {
          if (advance.currentApproverId && Number(advance.currentApproverId) !== Number(approverId)) {
            return res.status(403).json({
              status: "error",
              message: "You are not the current approver for this request",
            });
          }

      return res.status(403).json({
        status: "error",
        message: "Only manager, supervisor or accountant can approve salary advances"
      });
    }

    const requester = await User.findByPk(advance.userId);
    const approvalChain = await resolveApprovalChain('salary_advance', requester, { amount: advance.amount });

    const decisionLevel = Number(advance.approvalLevel || 1);
    let emittedStatus = null;

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({
        status: 'error',
        message: 'Request body must include action: "approve" or "reject"'
      });
    }

    if (action === 'reject') {
      await advance.update({
        approvalStatus: 'rejected',
        approvedBy: approverId,
        approvedAt: null,
        rejectionReason: comments != null && String(comments).trim() !== '' ? String(comments).trim() : null
      });

      await createNotification(
        advance.userId,
        "salary_advance",
        "Salary Advance Rejected",
        `Your salary advance request for ${advance.month}/${advance.year} has been rejected`,
        { salaryAdvanceId: advance.id }
      );

      emittedStatus = 'rejected';
    } else if (action === 'approve') {
      const approvalLevel = Number(advance.approvalLevel || 1);
      const currentIndex = Math.max(approvalLevel - 1, 0);
      const nextApproverId = approvalChain[currentIndex + 1] || null;

      if (!nextApproverId) {
        await advance.update({
          approvalStatus: 'approved',
          approvedBy: approverId,
          approvedAt: new Date(),
          approvalLevel,
          currentApproverId: null,
        });

        await createNotification(
          advance.userId,
          "salary_advance",
          "Salary Advance Approved",
          `Your salary advance request for ${advance.month}/${advance.year} has been approved`,
          { salaryAdvanceId: advance.id, action: "approved_employee" }
        );

        await createNotification(
          null,
          'system',
          'Salary Advance Approved',
          `Salary advance request #${advance.id} has been approved.`,
          { advanceId: advance.id, action: 'approved' }
        );

        const recalc = await calculateSalaryForUser(advance.userId, advance.month, advance.year, {
          requireExistingSalaryRecord: false,
        });
        if (!recalc.success) {
          return res.status(403).json({
            status: "error",
            message: recalc.error || "Cannot recalculate salary after approving advance",
          });
        }

        emittedStatus = 'approved';
      } else {
        await advance.update({
          approvalStatus: 'pending',
          approvalLevel: approvalLevel + 1,
          currentApproverId: nextApproverId,
        });

        await createNotification(
          nextApproverId,
          "salary_advance",
          "Salary Advance Pending Approval",
          `${advance.User?.name || "An employee"} salary advance request needs your approval`,
          { salaryAdvanceId: advance.id }
        );

        // Intermediate approval: surfaces this approver's decision
        // even though the request is still pending at the next level.
        emittedStatus = 'approved';
      }
    }

    if (emittedStatus) {
      try {
        const owner = advance.User
          ? {
              id: advance.User.id,
              name: advance.User.name,
              email: advance.User.email,
              employeeCode: advance.User.employeeCode,
            }
          : null;
        emitApprovalEvent({
          actor: req.user,
          requestType: 'salary_advance',
          requestId: advance.id,
          status: emittedStatus,
          level: decisionLevel,
          targetUser: owner,
          comments: comments || null,
        });
      } catch (emitErr) {
        console.warn('[salary_advance.approve] realtime emit failed:', emitErr.message);
      }
    }

    const updated = await SalaryAdvance.findByPk(id, {
      include: [
        { model: User, attributes: ["id", "name", "employeeCode"] },
        { model: User, as: "Approver", attributes: ["id", "name"] },
        { model: User, as: "CurrentApprover", attributes: ["id", "name"] },
        { model: User, as: "Disburser", attributes: ["id", "name"], required: false },
      ],
    });

    return res.json({
      status: "success",
      message: `Salary advance ${action}d successfully`,
      advance: enrichAdvanceRow(updated),
    });
  } catch (err) {
    console.error("Error approving salary advance:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

/** Approver or employee (own) — salary snapshot for this advance amount; does not persist. */
export const getSalaryAdvanceSalaryPreview = async (req, res) => {
  try {
    const { id } = req.params;
    const advance = await SalaryAdvance.findByPk(id, {
      include: [{ model: User, attributes: ["id", "name", "employeeCode"] }],
    });

    if (!advance) {
      return res.status(404).json({
        status: "error",
        message: "Salary advance not found",
      });
    }

    const role = req.user?.role;
    const tokenUserId = req.user?.id ?? req.user?.userId;
    if (role === "employee") {
      if (tokenUserId == null || Number(advance.userId) !== Number(tokenUserId)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else if (!["manager", "supervisor", "accountant"].includes(role)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const result = await calculateSalaryForUser(advance.userId, advance.month, advance.year, {
      persist: false,
      previewSalaryAdvanceId: advance.id,
      requireExistingSalaryRecord: false,
    });

    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: result.error || "Cannot compute salary preview",
      });
    }

    return res.json({
      status: "success",
      preview: result.salary,
      attendance: result.attendance,
      meta: result.meta,
      advance: {
        id: advance.id,
        amount: advance.amount,
        approvalStatus: advance.approvalStatus,
        month: advance.month,
        year: advance.year,
      },
      payoutDueDate: formatSalaryAdvancePayoutDateISO(advance.year, advance.month),
      configuredPayoutDay: getConfiguredSalaryAdvancePayoutDay(),
    });
  } catch (err) {
    console.error("Error building salary advance preview:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

/** Accountant: mark funds transferred (only on or after configured payout day). */
export const disburseSalaryAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const approverId = req.user?.id ?? req.user?.userId;

    const advance = await SalaryAdvance.findByPk(id);
    if (!advance) {
      return res.status(404).json({
        status: "error",
        message: "Salary advance not found",
      });
    }

    if (advance.approvalStatus !== "approved") {
      return res.status(400).json({
        status: "error",
        message: "Only approved advances can be disbursed",
      });
    }

    if (advance.disbursedAt) {
      return res.status(400).json({
        status: "error",
        message: "This advance has already been marked as disbursed",
      });
    }

    if (!isSalaryAdvanceDisburseAllowedToday(advance.year, advance.month)) {
      const iso = formatSalaryAdvancePayoutDateISO(advance.year, advance.month);
      return res.status(400).json({
        status: "error",
        message: `Disbursement is only allowed on or after the configured payout date (${iso}).`,
        payoutDueDate: iso,
        configuredPayoutDay: getConfiguredSalaryAdvancePayoutDay(),
      });
    }

    await advance.update({
      disbursedAt: new Date(),
      disbursedBy: approverId,
    });

    const fresh = await SalaryAdvance.findByPk(id, {
      include: [
        { model: User, attributes: ["id", "name", "employeeCode"] },
        { model: User, as: "Disburser", attributes: ["id", "name"], required: false },
      ],
    });

    return res.json({
      status: "success",
      message: "Salary advance marked as disbursed",
      advance: enrichAdvanceRow(fresh),
    });
  } catch (err) {
    console.error("Error disbursing salary advance:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

// Mark salary advance as deducted
export const markDeducted = async (req, res) => {
  try {
    const { id } = req.params;
    const { salaryId } = req.body;

    const advance = await SalaryAdvance.findByPk(id);
    if (!advance) {
      return res.status(404).json({
        status: "error",
        message: "Salary advance not found"
      });
    }

    if (advance.approvalStatus !== 'approved') {
      return res.status(400).json({
        status: "error",
        message: "Can only deduct approved advances"
      });
    }

    await advance.update({
      isDeducted: true,
      deductedAt: new Date(),
      salaryId: salaryId || null
    });

    return res.json({
      status: "success",
      message: "Salary advance marked as deducted",
      advance
    });
  } catch (err) {
    console.error("Error marking salary advance as deducted:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};



