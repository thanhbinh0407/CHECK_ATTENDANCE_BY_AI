import OvertimeRequest from "../models/pg/OvertimeRequest.js";
import ApprovalWorkflow from "../models/pg/ApprovalWorkflow.js";
import User from "../models/pg/User.js";
import { Op } from "sequelize";
import { resolveApprovalChain } from "../services/approvalPolicyService.js";
import { emitApprovalEvent } from "../services/actionAuditService.js";
import { createNotification } from "./notificationController.js";

// Get all overtime requests
export const getOvertimeRequests = async (req, res) => {
  try {
    const { userId: queryUserId, status, month, year } = req.query;
    // Token contains userId, not id
    const tokenUserId = req.user?.userId ?? req.user?.id;
    const isStaff = req.user?.role && req.user.role !== "employee";

    const where = {};
    // Employee: only own rows (ignore ?userId=). Staff may filter by userId or list all.
    if (!isStaff && tokenUserId != null) {
      where.userId = tokenUserId;
    } else if (queryUserId != null && queryUserId !== "") {
      const parsed = parseInt(queryUserId, 10);
      if (!Number.isNaN(parsed)) where.userId = parsed;
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
      order: [
        ['updatedAt', 'DESC'],
        ['id', 'DESC']
      ]
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

    const approverChain = await resolveApprovalChain('overtime', user);
    const initialApproverId = approverChain[0] || null;

    const request = await OvertimeRequest.create({
      userId,
      date,
      startTime,
      endTime,
      totalHours: parseFloat(totalHours.toFixed(2)),
      reason,
      projectName: projectName || null,
      approvalLevel: 1,
      currentApproverId: initialApproverId
    });

    // Create approval workflow
    if (initialApproverId) {
      await ApprovalWorkflow.create({
        requestType: 'overtime',
        requestId: request.id,
        level: 1,
        approverId: initialApproverId,
        status: 'pending'
      });

      await createNotification(
        initialApproverId,
        "overtime_request",
        "New Overtime Request",
        `${user.name} has submitted an overtime request for ${date}`,
        { overtimeRequestId: request.id }
      );
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

    // Role middleware (supervisorOrManager) already restricts who can reach
    // this endpoint. We no longer require `currentApproverId === req.user.id`
    // — any supervisor or manager on duty may decide any pending request at
    // the current level. The actual approver is recorded below for audit.

    const decisionLevel = request.approvalLevel || 1;
    let emittedStatus = null;

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({
        status: 'error',
        message: 'Request body must include action: "approve" or "reject"'
      });
    }

    if (action === 'reject') {
      await request.update({
        approvalStatus: 'rejected',
        approvedBy: approverId,
        approvedAt: null,
        rejectionReason: comments != null && String(comments).trim() !== '' ? String(comments).trim() : null
      });

      // Record this approver's decision on the matching workflow row if it
      // exists; otherwise create one so the audit log always has a trace.
      const [workflowRowsUpdated] = await ApprovalWorkflow.update(
        { status: 'rejected', approvedAt: new Date(), comments, approverId },
        { where: { requestType: 'overtime', requestId: id, level: decisionLevel, status: 'pending' } }
      );
      if (!workflowRowsUpdated) {
        await ApprovalWorkflow.create({
          requestType: 'overtime',
          requestId: id,
          level: decisionLevel,
          approverId,
          status: 'rejected',
          approvedAt: new Date(),
          comments: comments || null,
        });
      }

      await createNotification(
        request.userId,
        "overtime_request",
        "Overtime Request Rejected",
        `Your overtime request for ${request.date} has been rejected`,
        { overtimeRequestId: request.id }
      );

      emittedStatus = 'rejected';
    } else if (action === 'approve') {
      const approverChain = await resolveApprovalChain('overtime', request.User);
      const currentIndex = Math.max(request.approvalLevel - 1, 0);
      const nextApproverId = approverChain[currentIndex + 1] || null;

      // Check if this is the final approval level for current policy chain
      if (!nextApproverId) {
        // Final approval
        await request.update({
          approvalStatus: 'approved',
          approvedBy: approverId,
          approvedAt: new Date()
        });

        const [finalWorkflowRowsUpdated] = await ApprovalWorkflow.update(
          { status: 'approved', approvedAt: new Date(), comments, approverId },
          { where: { requestType: 'overtime', requestId: id, level: decisionLevel, status: 'pending' } }
        );
        if (!finalWorkflowRowsUpdated) {
          await ApprovalWorkflow.create({
            requestType: 'overtime',
            requestId: id,
            level: decisionLevel,
            approverId,
            status: 'approved',
            approvedAt: new Date(),
            comments: comments || null,
          });
        }

        await createNotification(
          request.userId,
          "overtime_request",
          "Overtime Request Approved",
          `Your overtime request for ${request.date} has been approved`,
          { overtimeRequestId: request.id }
        );

        emittedStatus = 'approved';
      } else {
        // Move to next approval level from policy chain
        const nextLevel = request.approvalLevel + 1;

        await request.update({
          approvalLevel: nextLevel,
          currentApproverId: nextApproverId
        });

        const [midWorkflowRowsUpdated] = await ApprovalWorkflow.update(
          { status: 'approved', approvedAt: new Date(), comments, approverId },
          { where: { requestType: 'overtime', requestId: id, level: decisionLevel, status: 'pending' } }
        );
        if (!midWorkflowRowsUpdated) {
          await ApprovalWorkflow.create({
            requestType: 'overtime',
            requestId: id,
            level: decisionLevel,
            approverId,
            status: 'approved',
            approvedAt: new Date(),
            comments: comments || null,
          });
        }

        if (nextApproverId) {
          await ApprovalWorkflow.create({
            requestType: 'overtime',
            requestId: id,
            level: nextLevel,
            approverId: nextApproverId,
            status: 'pending'
          });

          await createNotification(
            nextApproverId,
            "overtime_request",
            "Overtime Request Pending Approval",
            `${request.User.name}'s overtime request needs your approval`,
            { overtimeRequestId: request.id }
          );
        }

        // Intermediate approval: this decision is "approved" at this level
        // even though the overall request is still pending the next approver.
        emittedStatus = 'approved';
      }
    }

    if (emittedStatus) {
      try {
        const owner = request.User
          ? {
              id: request.User.id,
              name: request.User.name,
              email: request.User.email,
              employeeCode: request.User.employeeCode,
            }
          : null;
        emitApprovalEvent({
          actor: req.user,
          requestType: 'overtime',
          requestId: request.id,
          status: emittedStatus,
          level: decisionLevel,
          targetUser: owner,
          comments: comments || null,
        });
      } catch (emitErr) {
        console.warn('[overtime.approve] realtime emit failed:', emitErr.message);
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



