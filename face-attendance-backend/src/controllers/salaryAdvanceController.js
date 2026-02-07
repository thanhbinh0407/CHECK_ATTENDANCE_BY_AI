import SalaryAdvance from "../models/pg/SalaryAdvance.js";
import User from "../models/pg/User.js";
import Notification from "../models/pg/Notification.js";
import { Op } from "sequelize";

// Get all salary advances
export const getSalaryAdvances = async (req, res) => {
  try {
    const { userId, month, year, status } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.approvalStatus = status;

    const advances = await SalaryAdvance.findAll({
      where,
      include: [
        { model: User, attributes: ['id', 'name', 'employeeCode', 'email'] },
        { model: User, as: 'Approver', attributes: ['id', 'name', 'email'] }
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
    const userId = req.user.id;

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

    const advance = await SalaryAdvance.create({
      userId,
      month: parseInt(month),
      year: parseInt(year),
      amount: parseFloat(amount),
      reason: reason || null
    });

    // Notify manager (if exists) or admin
    const approverId = user?.managerId || (await User.findOne({ where: { role: 'admin' } }))?.id;
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
    const approverId = req.user.id;

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

    // Only admin/accountant can approve
    const approver = await User.findByPk(approverId);
    if (approver.role !== 'admin' && approver.role !== 'accountant') {
      return res.status(403).json({
        status: "error",
        message: "Only admin or accountant can approve salary advances"
      });
    }

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
      await advance.update({
        approvalStatus: 'approved',
        approvedBy: approverId,
        approvedAt: new Date()
      });

      await Notification.create({
        userId: advance.userId,
        type: 'salary_advance',
        title: 'Salary Advance Approved',
        message: `Your salary advance request for ${advance.month}/${advance.year} has been approved`,
        isRead: false
      });
    }

    return res.json({
      status: "success",
      message: `Salary advance ${action}d successfully`,
      advance: await SalaryAdvance.findByPk(id, {
        include: [
          { model: User, attributes: ['id', 'name', 'employeeCode'] },
          { model: User, as: 'Approver', attributes: ['id', 'name'] }
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



