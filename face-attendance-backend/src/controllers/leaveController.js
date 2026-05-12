import LeaveRequest from "../models/pg/LeaveRequest.js";
import User from "../models/pg/User.js";
import { Op } from "sequelize";
import { notifyLeaveStatusChange, createNotification } from "./notificationController.js";
import { emitApprovalEvent } from "../services/actionAuditService.js";

const DEFAULT_ANNUAL_LEAVE_DAYS = 12;
const ADDITIONAL_ANNUAL_DAY_EVERY_5_YEARS = 1;
const ANNUAL_LEAVE_SUBTYPES = new Set(['annual_leave']);
const LEAVE_SUBTYPE_TO_DB_TYPE = {
  annual_leave: 'paid',
  paid_marriage: 'paid',
  paid_child_marriage: 'paid',
  paid_family_death: 'paid',
  unpaid_family_death: 'unpaid',
  unpaid_other: 'unpaid',
  unpaid_negotiated: 'unpaid',
  sick: 'sick',
  maternity_female: 'maternity',
  maternity_male: 'maternity',
  personal: 'personal',
  accident_leave: 'other',
  civic_duty: 'other',
  study_training: 'other',
  suspended_work: 'other',
  special_leave: 'other',
  other: 'other'
};

const COMPANY_HOLIDAY_CONFIG = [
  { key: 'new_year', label: 'Tết Dương lịch', days: 1 },
  { key: 'lunar_new_year', label: 'Tết Âm lịch', days: 5 },
  { key: 'hung_kings', label: 'Giỗ Tổ Hùng Vương', days: 1 },
  { key: 'reunification', label: '30/4', days: 1 },
  { key: 'labor_day', label: '1/5', days: 1 },
  { key: 'national_day', label: '2/9', days: 2 }
];

const LEAVE_TYPE_DISPLAY = {
  paid: 'Paid Leave',
  unpaid: 'Unpaid Leave',
  sick: 'Sick Leave',
  maternity: 'Maternity Leave',
  personal: 'Personal Leave',
  other: 'Other'
};

const getLeaveTypeLabel = (type) => {
  return LEAVE_TYPE_DISPLAY[type] || String(type || '').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
};

const calculateServiceYears = (startDate, year) => {
  if (!startDate) return 0;
  const joined = new Date(startDate);
  if (Number.isNaN(joined.getTime())) return 0;
  const target = new Date(`${year}-12-31`);
  let years = target.getFullYear() - joined.getFullYear();
  if (
    target.getMonth() < joined.getMonth() ||
    (target.getMonth() === joined.getMonth() && target.getDate() < joined.getDate())
  ) {
    years -= 1;
  }
  return Math.max(0, years);
};

const getAnnualLeaveAllowance = async (userId, year) => {
  const user = await User.findByPk(userId, { attributes: ['startDate'] });
  const serviceYears = calculateServiceYears(user?.startDate, year);
  const additionalDays = Math.floor(serviceYears / 5) * ADDITIONAL_ANNUAL_DAY_EVERY_5_YEARS;
  return {
    total: DEFAULT_ANNUAL_LEAVE_DAYS + additionalDays,
    serviceYears,
    extraDays: additionalDays
  };
};

const countLeaveDaysTowardLimit = (leave) => {
  if (!leave) return 0;
  if (leave.type !== 'paid') return 0;
  if (!leave.subType) return Number(leave.days || 0);
  return ANNUAL_LEAVE_SUBTYPES.has(leave.subType) ? Number(leave.days || 0) : 0;
};

const getAnnualLeaveUsage = async (userId, year, excludeLeaveId = null) => {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const where = {
    userId,
    status: { [Op.in]: ["pending", "approved"] },
    startDate: {
      [Op.gte]: yearStart,
      [Op.lte]: yearEnd,
    },
    type: 'paid'
  };

  if (excludeLeaveId) {
    where.id = { [Op.ne]: excludeLeaveId };
  }

  const leaves = await LeaveRequest.findAll({ where });
  return leaves.reduce((sum, leave) => sum + countLeaveDaysTowardLimit(leave), 0);
};

export const getCompanyHolidayConfig = async (req, res) => {
  try {
    return res.json({
      status: 'success',
      holidayPolicy: {
        holidays: COMPANY_HOLIDAY_CONFIG,
        totalDays: COMPANY_HOLIDAY_CONFIG.reduce((sum, h) => sum + h.days, 0),
        note: 'Company holidays are paid and do not require attendance when observed.'
      }
    });
  } catch (err) {
    console.error('Error fetching holiday policy:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

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

    const requestYear = new Date(startDate).getFullYear();
    const allowance = await getAnnualLeaveAllowance(userId, requestYear);
    const usedDays = await getAnnualLeaveUsage(userId, requestYear);
    const projectedDays = type === 'annual_leave' ? usedDays + days : usedDays;

    if (type === 'annual_leave' && projectedDays > allowance.total) {
      return res.status(400).json({
        status: "error",
        message: `You can only take up to ${allowance.total} annual leave day(s) for this year. You have already used ${usedDays} day(s).`,
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

    const dbType = LEAVE_SUBTYPE_TO_DB_TYPE[type] || type;
    const leaveRequest = await LeaveRequest.create({
      userId,
      type: dbType,
      subType: type,
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

// Get leave requests (employee: own requests, staff roles: all)
export const getLeaveRequests = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const userId = req.user.userId;
    const isStaff = req.user.role !== 'employee';

    const where = {};
    if (!isStaff) {
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

    let annualLeaveUsageByUser = new Map();
    if (isStaff) {
      const currentYear = new Date().getFullYear();
      const approvedPaidLeaves = await LeaveRequest.findAll({
        where: {
          status: 'approved',
          type: 'paid',
          startDate: {
            [Op.gte]: `${currentYear}-01-01`,
            [Op.lte]: `${currentYear}-12-31`
          }
        },
        attributes: ['userId', 'days', 'subType']
      });
      for (const leave of approvedPaidLeaves) {
        const userId = Number(leave.userId);
        const used = countLeaveDaysTowardLimit(leave);
        annualLeaveUsageByUser.set(userId, (annualLeaveUsageByUser.get(userId) || 0) + used);
      }
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
      // Newest activity first (submit/approve/reject), stable tie-breaker
      order: [
        ['updatedAt', 'DESC'],
        ['id', 'DESC']
      ]
    });

    const leaveRequestsPlain = leaveRequests.map((leave) => {
      const item = leave.get({ plain: true });
      if (isStaff) {
        item.annualLeaveUsed = annualLeaveUsageByUser.get(Number(item.userId)) || 0;
      }
      return item;
    });

    return res.json({
      status: "success",
      leaveRequests: leaveRequestsPlain
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
    const isStaff = req.user.role !== 'employee';

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
    if (!isStaff && leaveRequest.userId !== userId) {
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

// Approve leave request (Supervisor/Manager via route guard)
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

    await createNotification(
      null,
      'system',
      'Leave Request Approved',
      `Leave request #${leaveRequest.id} has been approved.`,
      { leaveRequestId: leaveRequest.id, action: 'approved' }
    );

    try {
      const owner = leaveRequest.userId
        ? await User.findByPk(leaveRequest.userId, {
            attributes: ["id", "name", "email", "employeeCode"],
          })
        : null;
      emitApprovalEvent({
        actor: req.user,
        requestType: "leave",
        requestId: leaveRequest.id,
        status: "approved",
        level: 1,
        targetUser: owner ? owner.get({ plain: true }) : null,
        approvedAt: leaveRequest.approvedAt,
      });
    } catch (emitErr) {
      console.warn("[leave.approve] realtime emit failed:", emitErr.message);
    }

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

// Reject leave request (Supervisor/Manager via route guard)
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

    try {
      const owner = leaveRequest.userId
        ? await User.findByPk(leaveRequest.userId, {
            attributes: ["id", "name", "email", "employeeCode"],
          })
        : null;
      emitApprovalEvent({
        actor: req.user,
        requestType: "leave",
        requestId: leaveRequest.id,
        status: "rejected",
        level: 1,
        targetUser: owner ? owner.get({ plain: true }) : null,
        comments: rejectionReason || null,
        approvedAt: leaveRequest.approvedAt,
      });
    } catch (emitErr) {
      console.warn("[leave.reject] realtime emit failed:", emitErr.message);
    }

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

    const allowance = await getAnnualLeaveAllowance(userId, currentYear);
    const totalDaysUsed = approvedLeaves.reduce((sum, leave) => sum + countLeaveDaysTowardLimit(leave), 0);
    const remainingDays = Math.max(0, allowance.total - totalDaysUsed);

    return res.json({
      status: "success",
      balance: {
        total: allowance.total,
        used: totalDaysUsed,
        remaining: remainingDays,
        year: currentYear,
        serviceYears: allowance.serviceYears,
        extraDays: allowance.extraDays
      },
      holidayPolicy: {
        holidays: COMPANY_HOLIDAY_CONFIG,
        totalDays: COMPANY_HOLIDAY_CONFIG.reduce((sum, h) => sum + h.days, 0),
        note: 'Company holidays are paid and do not require attendance when observed.'
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
    const isStaff = req.user.role !== 'employee';

    const leaveRequest = await LeaveRequest.findByPk(id);
    if (!leaveRequest) {
      return res.status(404).json({
        status: "error",
        message: "Leave request not found"
      });
    }

    // Check permission
    if (!isStaff && leaveRequest.userId !== userId) {
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

// Update leave request (only pending)
export const updateLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isStaff = req.user.role !== "employee";

    const leaveRequest = await LeaveRequest.findByPk(id);
    if (!leaveRequest) {
      return res.status(404).json({
        status: "error",
        message: "Leave request not found"
      });
    }

    // Permission: employee can only update own request
    if (!isStaff && leaveRequest.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied"
      });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        status: "error",
        message: "Can only update pending leave requests"
      });
    }

    const { type, startDate, endDate, reason } = req.body;
    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: type, startDate, endDate, reason"
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

    const requestYear = new Date(startDate).getFullYear();
    const allowance = await getAnnualLeaveAllowance(leaveRequest.userId, requestYear);
    const usedDays = await getAnnualLeaveUsage(leaveRequest.userId, requestYear, leaveRequest.id);
    const projectedDays = type === 'annual_leave' ? usedDays + days : usedDays;

    if (type === 'annual_leave' && projectedDays > allowance.total) {
      return res.status(400).json({
        status: "error",
        message: `You can only take up to ${allowance.total} annual leave day(s) for this year. You have already used ${usedDays} day(s).`,
      });
    }

    // Overlap check against other pending/approved requests for the same user (exclude self)
    const overlapping = await LeaveRequest.findOne({
      where: {
        userId: leaveRequest.userId,
        id: { [Op.ne]: leaveRequest.id },
        status: { [Op.in]: ["pending", "approved"] },
        [Op.or]: [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } },
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

    const dbType = LEAVE_SUBTYPE_TO_DB_TYPE[type] || type;
    await leaveRequest.update({
      type: dbType,
      subType: type,
      startDate,
      endDate,
      days,
      reason,
      status: "pending"
    });

    return res.json({
      status: "success",
      message: "Leave request updated successfully",
      leaveRequest
    });
  } catch (err) {
    console.error("Error updating leave request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

