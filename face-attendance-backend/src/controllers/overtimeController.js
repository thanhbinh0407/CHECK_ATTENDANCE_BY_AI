import OvertimeRequest from "../models/pg/OvertimeRequest.js";
import ApprovalWorkflow from "../models/pg/ApprovalWorkflow.js";
import User from "../models/pg/User.js";
import Notification from "../models/pg/Notification.js";
import { Op } from "sequelize";

// Get all overtime requests
export const getOvertimeRequests = async (req, res) => {
  try {
    const { userId: queryUserId, status, month, year } = req.query;
    // Token contains userId, not id
    const tokenUserId = req.user?.userId ?? req.user?.id;

    const where = {};
    // If userId is provided in query, use it (for admin), otherwise use token userId (for employee)
    if (queryUserId) {
      where.userId = queryUserId;
    } else if (tokenUserId) {
      where.userId = tokenUserId;
    }
    if (status) where.approvalStatus = status;
    if (month && year) {
      where.date = {
        [Op.between]: [
          new Date(year, month - 1, 1),
          new Date(year, month, 0)
        ]
      };
    }

    const requests = await OvertimeRequest.findAll({
      where,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name', 'employeeCode', 'email'] },
        { model: User, as: 'Approver', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'CurrentApprover', attributes: ['id', 'name', 'email'] }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.json({
      status: "success",
      requests
    });
  } catch (err) {
    console.error("Error fetching overtime requests:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create overtime request
export const createOvertimeRequest = async (req, res) => {
  try {
    const { date, startTime, endTime, reason, projectName } = req.body;
    // Token contains userId, not id
    const userId = req.user?.userId ?? req.user?.id;

    // Validate required fields
    if (!date || !startTime || !endTime || !reason) {
      return res.status(400).json({
        status: "error",
        message: "Date, start time, end time, and reason are required"
      });
    }

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated"
      });
    }

    // Calculate total hours
    // Handle both same-day and overnight scenarios
    const start = new Date(`${date}T${startTime}`);
    let end = new Date(`${date}T${endTime}`);
    
    // If end time is before start time, assume it's the next day (overnight work)
    if (end < start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
    }
    
    const totalHours = (end - start) / (1000 * 60 * 60);

    if (totalHours <= 0) {
      return res.status(400).json({
        status: "error",
        message: "End time must be after start time"
      });
    }

    // Validate total hours is reasonable (not more than 24 hours)
    if (totalHours > 24) {
      return res.status(400).json({
        status: "error",
        message: "Overtime hours cannot exceed 24 hours"
      });
    }

    // Get user's manager for approval
    const user = await User.findByPk(userId, {
      include: [{ model: User, as: 'Manager' }]
    });

    const request = await OvertimeRequest.create({
      userId,
      date,
      startTime,
      endTime,
      totalHours: parseFloat(totalHours.toFixed(2)),
      reason,
      projectName: projectName || null,
      approvalLevel: 1,
      currentApproverId: user?.managerId || null
    });

    // Create approval workflow
    if (user?.managerId) {
      await ApprovalWorkflow.create({
        requestType: 'overtime',
        requestId: request.id,
        level: 1,
        approverId: user.managerId,
        status: 'pending'
      });

      // Notify manager
      await Notification.create({
        userId: user.managerId,
        type: 'overtime_request',
        title: 'New Overtime Request',
        message: `${user.name} has submitted an overtime request for ${date}`,
        isRead: false
      });
    }

    return res.json({
      status: "success",
      message: "Overtime request created successfully",
      request
    });
  } catch (err) {
    console.error("Error creating overtime request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Approve/Reject overtime request
export const approveOvertimeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    const approverId = req.user?.userId ?? req.user?.id;

    const request = await OvertimeRequest.findByPk(id, {
      include: [
        { model: User, as: 'User' },
        { model: User, as: 'CurrentApprover' }
      ]
    });

    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "Overtime request not found"
      });
    }

    if (request.approvalStatus !== 'pending') {
      return res.status(400).json({
        status: "error",
        message: "Request has already been processed"
      });
    }

    // Check if current user is the approver
    if (request.currentApproverId !== approverId) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to approve this request"
      });
    }

    if (action === 'reject') {
      await request.update({
        approvalStatus: 'rejected',
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: comments || null
      });

      // Update workflow
      await ApprovalWorkflow.update(
        { status: 'rejected', approvedAt: new Date(), comments },
        { where: { requestType: 'overtime', requestId: id, approverId } }
      );

      // Notify employee
      await Notification.create({
        userId: request.userId,
        type: 'overtime_request',
        title: 'Overtime Request Rejected',
        message: `Your overtime request for ${request.date} has been rejected`,
        isRead: false
      });
    } else if (action === 'approve') {
      // Check if this is the final approval level
      if (request.approvalLevel >= 3) {
        // Final approval
        await request.update({
          approvalStatus: 'approved',
          approvedBy: approverId,
          approvedAt: new Date()
        });

        await ApprovalWorkflow.update(
          { status: 'approved', approvedAt: new Date(), comments },
          { where: { requestType: 'overtime', requestId: id, approverId } }
        );

        // Notify employee
        await Notification.create({
          userId: request.userId,
          type: 'overtime_request',
          title: 'Overtime Request Approved',
          message: `Your overtime request for ${request.date} has been approved`,
          isRead: false
        });
      } else {
        // Move to next approval level
        const nextLevel = request.approvalLevel + 1;
        // TODO: Determine next approver based on workflow (HR, Director, etc.)
        // For now, assume HR is level 2, Director is level 3
        const hrUsers = await User.findAll({ where: { role: 'admin' }, limit: 1 });
        const nextApproverId = nextLevel === 2 ? (hrUsers[0]?.id || null) : null;

        await request.update({
          approvalLevel: nextLevel,
          currentApproverId: nextApproverId
        });

        await ApprovalWorkflow.update(
          { status: 'approved', approvedAt: new Date(), comments },
          { where: { requestType: 'overtime', requestId: id, approverId } }
        );

        if (nextApproverId) {
          await ApprovalWorkflow.create({
            requestType: 'overtime',
            requestId: id,
            level: nextLevel,
            approverId: nextApproverId,
            status: 'pending'
          });

          // Notify next approver
          await Notification.create({
            userId: nextApproverId,
            type: 'overtime_request',
            title: 'Overtime Request Pending Approval',
            message: `${request.User.name}'s overtime request needs your approval`,
            isRead: false
          });
        }
      }
    }

    return res.json({
      status: "success",
      message: `Overtime request ${action}d successfully`,
      request: await OvertimeRequest.findByPk(id, {
        include: [
          { model: User, as: 'User', attributes: ['id', 'name', 'employeeCode'] },
          { model: User, as: 'Approver', attributes: ['id', 'name'] },
          { model: User, as: 'CurrentApprover', attributes: ['id', 'name'] }
        ]
      })
    });
  } catch (err) {
    console.error("Error approving overtime request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete overtime request
export const deleteOvertimeRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await OvertimeRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "Overtime request not found"
      });
    }

    // Only allow deletion if pending
    if (request.approvalStatus !== 'pending') {
      return res.status(400).json({
        status: "error",
        message: "Cannot delete approved or rejected request"
      });
    }

    // Delete related workflows
    await ApprovalWorkflow.destroy({
      where: { requestType: 'overtime', requestId: id }
    });

    await request.destroy();

    return res.json({
      status: "success",
      message: "Overtime request deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting overtime request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};



