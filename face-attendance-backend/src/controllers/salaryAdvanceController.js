import SalaryAdvance from "../models/pg/SalaryAdvance.js";
import User from "../models/pg/User.js";
import Notification from "../models/pg/Notification.js";
import { recalculateSalaryRecord } from "../services/salaryCalculationService.js";
import { Op } from "sequelize";
import { resolveApprovalChain } from "../services/approvalPolicyService.js";
import { createNotification } from "./notificationController.js";

// Get all salary advances
export const getSalaryAdvances = async (req, res) => {
  try {
    const { userId, month, year, status } = req.query;

    const where = {};
    const queryUserId = userId != null && userId !== "" && userId !== "undefined" ? userId : null;
    const canViewAll = ["manager", "supervisor", "accountant"].includes(req.user?.role);

    if (queryUserId != null) {
      const parsed = parseInt(queryUserId, 10);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({
          status: "error",
          message: "userId must be a valid number"
        });
      }
      where.userId = parsed;
    } else if (!canViewAll) {
      // Employee: only list own advances (from token). Staff roles above can see all when no userId filter.
      const tokenUserId = req.user?.id ?? req.user?.userId;
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
      order: [['year', 'DESC'], ['month', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.json({
      status: "success",
      advances
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
      await Notification.create({
        userId: approverId,
        type: 'salary_advance',
        title: 'New Salary Advance Request',
        message: `${user.name} has requested a salary advance of ${parseFloat(amount).toLocaleString('en-US')} VND for ${month}/${year}`,
        isRead: false
      });
    }

    return res.json({
      status: "success",
      message: "Salary advance request created successfully",
      advance
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

    if (action === 'reject') {
      await advance.update({
        approvalStatus: 'rejected',
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: comments || null
      });

      await Notification.create({
        userId: advance.userId,
        type: 'salary_advance',
        title: 'Salary Advance Rejected',
        message: `Your salary advance request for ${advance.month}/${advance.year} has been rejected`,
        isRead: false
      });
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

        await Notification.create({
          userId: advance.userId,
          type: 'salary_advance',
          title: 'Salary Advance Approved',
          message: `Your salary advance request for ${advance.month}/${advance.year} has been approved`,
          isRead: false
        });

        await createNotification(
          null,
          'system',
          'Salary Advance Approved',
          `Salary advance request #${advance.id} has been approved.`,
          { advanceId: advance.id, action: 'approved' }
        );

        // Recalculate salary to include the advance deduction
        const recalc = await recalculateSalaryRecord(advance.userId, advance.month, advance.year);
        if (!recalc.success) {
          return res.status(403).json({
            status: "error",
            message: recalc.error || "Cannot recalculate salary after approving advance"
          });
        }
      } else {
        await advance.update({
          approvalStatus: 'pending',
          approvalLevel: approvalLevel + 1,
          currentApproverId: nextApproverId,
        });

        await Notification.create({
          userId: nextApproverId,
          type: 'salary_advance',
          title: 'Salary Advance Pending Approval',
          message: `${advance.User?.name || 'An employee'} salary advance request needs your approval`,
          isRead: false,
        });
      }
    }

    return res.json({
      status: "success",
      message: `Salary advance ${action}d successfully`,
      advance: await SalaryAdvance.findByPk(id, {
        include: [
          { model: User, attributes: ['id', 'name', 'employeeCode'] },
          { model: User, as: 'Approver', attributes: ['id', 'name'] },
          { model: User, as: 'CurrentApprover', attributes: ['id', 'name'] }
        ]
      })
    });
  } catch (err) {
    console.error("Error approving salary advance:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
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



