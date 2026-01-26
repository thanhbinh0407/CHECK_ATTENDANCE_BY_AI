import LeaveRequest from "../models/pg/LeaveRequest.js";
import User from "../models/pg/User.js";
import { Op } from "sequelize";
import { notifyLeaveStatusChange } from "./notificationController.js";

// Create leave request
export const createLeaveRequest = async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const userId = req.user.userId;

    if (!type || !startDate || !endDate) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: type, startDate, endDate"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      return res.status(400).json({
        status: "error",
        message: "End date must be after start date"
      });
    }

    // Check for overlapping leave requests
    const overlapping = await LeaveRequest.findOne({
      where: {
        userId,
        status: { [Op.in]: ['pending', 'approved'] },
        [Op.or]: [
          {
            startDate: { [Op.between]: [startDate, endDate] }
          },
          {
            endDate: { [Op.between]: [startDate, endDate] }
          },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      return res.status(400).json({
        status: "error",
        message: "You already have a leave request for this period"
      });
    }

    const leaveRequest = await LeaveRequest.create({
      userId,
      type,
      startDate,
      endDate,
      days,
      reason,
      status: 'pending'
    });

    return res.json({
      status: "success",
      message: "Leave request created successfully",
      leaveRequest
    });
  } catch (err) {
    console.error("Error creating leave request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get leave requests (for employee: own requests, for admin: all)
export const getLeaveRequests = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    const where = {};
    if (!isAdmin) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }
    if (startDate && endDate) {
      where[Op.or] = [
        {
          startDate: { [Op.between]: [startDate, endDate] }
        },
        {
          endDate: { [Op.between]: [startDate, endDate] }
        }
      ];
    }

    const leaveRequests = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email', 'employeeCode']
        },
        {
          model: User,
          as: 'Approver',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      status: "success",
      leaveRequests
    });
  } catch (err) {
    console.error("Error fetching leave requests:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get leave request by ID
export const getLeaveRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    const leaveRequest = await LeaveRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email', 'employeeCode']
        },
        {
          model: User,
          as: 'Approver',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!leaveRequest) {
      return res.status(404).json({
        status: "error",
        message: "Leave request not found"
      });
    }

    // Check permission
    if (!isAdmin && leaveRequest.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied"
      });
    }

    return res.json({
      status: "success",
      leaveRequest
    });
  } catch (err) {
    console.error("Error fetching leave request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Approve leave request (Admin only)
export const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user.userId;

    const leaveRequest = await LeaveRequest.findByPk(id);
    if (!leaveRequest) {
      return res.status(404).json({
        status: "error",
        message: "Leave request not found"
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        status: "error",
        message: `Leave request is already ${leaveRequest.status}`
      });
    }

    await leaveRequest.update({
      status: 'approved',
      approvedBy,
      approvedAt: new Date()
    });

    // Send notification
    await notifyLeaveStatusChange(leaveRequest.id, 'approved', approvedBy);

    return res.json({
      status: "success",
      message: "Leave request approved",
      leaveRequest
    });
  } catch (err) {
    console.error("Error approving leave request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Reject leave request (Admin only)
export const rejectLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const approvedBy = req.user.userId;

    const leaveRequest = await LeaveRequest.findByPk(id);
    if (!leaveRequest) {
      return res.status(404).json({
        status: "error",
        message: "Leave request not found"
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        status: "error",
        message: `Leave request is already ${leaveRequest.status}`
      });
    }

    await leaveRequest.update({
      status: 'rejected',
      approvedBy,
      approvedAt: new Date(),
      rejectionReason
    });

    // Send notification
    await notifyLeaveStatusChange(leaveRequest.id, 'rejected', approvedBy);

    return res.json({
      status: "success",
      message: "Leave request rejected",
      leaveRequest
    });
  } catch (err) {
    console.error("Error rejecting leave request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get leave balance for user
export const getLeaveBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Get all approved leave requests for the year
    const approvedLeaves = await LeaveRequest.findAll({
      where: {
        userId,
        status: 'approved',
        startDate: {
          [Op.gte]: `${currentYear}-01-01`,
          [Op.lte]: `${currentYear}-12-31`
        }
      }
    });

    const totalDaysUsed = approvedLeaves.reduce((sum, leave) => {
      if (leave.type === 'paid' || leave.type === 'sick' || leave.type === 'maternity') {
        return sum + leave.days;
      }
      return sum;
    }, 0);

    // Default leave balance (can be configured per user)
    const defaultLeaveDays = 12; // 12 days per year
    const remainingDays = Math.max(0, defaultLeaveDays - totalDaysUsed);

    return res.json({
      status: "success",
      balance: {
        total: defaultLeaveDays,
        used: totalDaysUsed,
        remaining: remainingDays,
        year: currentYear
      },
      leaves: approvedLeaves
    });
  } catch (err) {
    console.error("Error fetching leave balance:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete leave request (only if pending)
export const deleteLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    const leaveRequest = await LeaveRequest.findByPk(id);
    if (!leaveRequest) {
      return res.status(404).json({
        status: "error",
        message: "Leave request not found"
      });
    }

    // Check permission
    if (!isAdmin && leaveRequest.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied"
      });
    }

    // Only allow deletion if pending
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        status: "error",
        message: "Can only delete pending leave requests"
      });
    }

    await leaveRequest.destroy();

    return res.json({
      status: "success",
      message: "Leave request deleted"
    });
  } catch (err) {
    console.error("Error deleting leave request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

