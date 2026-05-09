import BusinessTripRequest from "../models/pg/BusinessTripRequest.js";
import ApprovalWorkflow from "../models/pg/ApprovalWorkflow.js";
import User from "../models/pg/User.js";
import { Op } from "sequelize";
import { resolveApprovalChain } from "../services/approvalPolicyService.js";
import { emitApprovalEvent } from "../services/actionAuditService.js";
import { createNotification } from "./notificationController.js";

// Get all business trip requests
export const getBusinessTripRequests = async (req, res) => {
  try {
    const { userId: queryUserId, status, month, year } = req.query;
    const tokenUserId = req.user?.userId ?? req.user?.id;
    const isStaff = req.user?.role && req.user.role !== "employee";

    const where = {};
    if (!isStaff) {
      if (tokenUserId == null) {
        return res.status(401).json({ status: "error", message: "User not identified" });
      }
      where.userId = tokenUserId;
    } else if (queryUserId != null && queryUserId !== "" && queryUserId !== "undefined") {
      const parsed = parseInt(queryUserId, 10);
      if (!Number.isNaN(parsed)) where.userId = parsed;
    }
    if (status) where.approvalStatus = status;
    if (month && year) {
      where.startDate = {
        [Op.between]: [
          new Date(year, month - 1, 1),
          new Date(year, month, 0)
        ]
      };
    }

    const requests = await BusinessTripRequest.findAll({
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
    console.error("Error fetching business trip requests:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create business trip request
export const createBusinessTripRequest = async (req, res) => {
  try {
    const { startDate, endDate, destination, purpose, estimatedCost, transportType, accommodation } = req.body;
    // In JWT we store userId, but keep a fallback to id for safety
    const userId = req.user?.userId ?? req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated"
      });
    }

    if (!startDate || !endDate || !destination || !purpose) {
      return res.status(400).json({
        status: "error",
        message: "Start date, end date, destination, and purpose are required"
      });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        status: "error",
        message: "End date must be after start date"
      });
    }

    // Get user's manager for approval
    const user = await User.findByPk(userId, {
      include: [{ model: User, as: 'Manager' }]
    });

    const approverChain = await resolveApprovalChain('business_trip', user, {
      amount: estimatedCost,
    });
    const initialApproverId = approverChain[0] || null;

    const request = await BusinessTripRequest.create({
      userId,
      startDate,
      endDate,
      destination,
      purpose,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
      transportType: transportType || null,
      accommodation: accommodation || null,
      approvalLevel: 1,
      currentApproverId: initialApproverId
    });

    // Create approval workflow
    if (initialApproverId) {
      await ApprovalWorkflow.create({
        requestType: 'business_trip',
        requestId: request.id,
        level: 1,
        approverId: initialApproverId,
        status: 'pending'
      });

      await createNotification(
        initialApproverId,
        "business_trip_request",
        "New Business Trip Request",
        `${user.name} has submitted a business trip request to ${destination}`,
        { businessTripRequestId: request.id }
      );
    }

    return res.json({
      status: "success",
      message: "Business trip request created successfully",
      request
    });
  } catch (err) {
    console.error("Error creating business trip request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Approve/Reject business trip request
export const approveBusinessTripRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body;
    const approverId = req.user?.userId ?? req.user?.id;

    const request = await BusinessTripRequest.findByPk(id, {
      include: [
        { model: User, as: 'User' },
        { model: User, as: 'CurrentApprover' }
      ]
    });

    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "Business trip request not found"
      });
    }

    if (request.approvalStatus !== 'pending') {
      return res.status(400).json({
        status: "error",
        message: "Request has already been processed"
      });
    }

    // Role middleware (supervisorOrManager) already restricts who can call
    // this endpoint. We no longer require `currentApproverId === req.user.id`
    // — any supervisor/manager on duty can decide any pending request.

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

      const [workflowRowsUpdated] = await ApprovalWorkflow.update(
        { status: 'rejected', approvedAt: new Date(), comments, approverId },
        { where: { requestType: 'business_trip', requestId: id, level: decisionLevel, status: 'pending' } }
      );
      if (!workflowRowsUpdated) {
        await ApprovalWorkflow.create({
          requestType: 'business_trip',
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
        "business_trip_request",
        "Business Trip Request Rejected",
        `Your business trip request to ${request.destination} has been rejected`,
        { businessTripRequestId: request.id }
      );

      emittedStatus = 'rejected';
    } else if (action === 'approve') {
      const approverChain = await resolveApprovalChain('business_trip', request.User, {
        amount: request.estimatedCost,
      });
      const currentIndex = Math.max(request.approvalLevel - 1, 0);
      const nextApproverId = approverChain[currentIndex + 1] || null;

      if (!nextApproverId) {
        await request.update({
          approvalStatus: 'approved',
          approvedBy: approverId,
          approvedAt: new Date()
        });

        const [finalWorkflowRowsUpdated] = await ApprovalWorkflow.update(
          { status: 'approved', approvedAt: new Date(), comments, approverId },
          { where: { requestType: 'business_trip', requestId: id, level: decisionLevel, status: 'pending' } }
        );
        if (!finalWorkflowRowsUpdated) {
          await ApprovalWorkflow.create({
            requestType: 'business_trip',
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
          "business_trip_request",
          "Business Trip Request Approved",
          `Your business trip request to ${request.destination} has been approved`,
          { businessTripRequestId: request.id }
        );

        emittedStatus = 'approved';
      } else {
        const nextLevel = request.approvalLevel + 1;

        await request.update({
          approvalLevel: nextLevel,
          currentApproverId: nextApproverId
        });

        const [midWorkflowRowsUpdated] = await ApprovalWorkflow.update(
          { status: 'approved', approvedAt: new Date(), comments, approverId },
          { where: { requestType: 'business_trip', requestId: id, level: decisionLevel, status: 'pending' } }
        );
        if (!midWorkflowRowsUpdated) {
          await ApprovalWorkflow.create({
            requestType: 'business_trip',
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
            requestType: 'business_trip',
            requestId: id,
            level: nextLevel,
            approverId: nextApproverId,
            status: 'pending'
          });

          await createNotification(
            nextApproverId,
            "business_trip_request",
            "Business Trip Request Pending Approval",
            `${request.User.name}'s business trip request needs your approval`,
            { businessTripRequestId: request.id }
          );
        }

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
          requestType: 'business_trip',
          requestId: request.id,
          status: emittedStatus,
          level: decisionLevel,
          targetUser: owner,
          comments: comments || null,
        });
      } catch (emitErr) {
        console.warn('[business_trip.approve] realtime emit failed:', emitErr.message);
      }
    }

    return res.json({
      status: "success",
      message: `Business trip request ${action}d successfully`,
      request: await BusinessTripRequest.findByPk(id, {
        include: [
          { model: User, as: 'User', attributes: ['id', 'name', 'employeeCode'] },
          { model: User, as: 'Approver', attributes: ['id', 'name'] },
          { model: User, as: 'CurrentApprover', attributes: ['id', 'name'] }
        ]
      })
    });
  } catch (err) {
    console.error("Error approving business trip request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete business trip request
export const deleteBusinessTripRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await BusinessTripRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "Business trip request not found"
      });
    }

    if (request.approvalStatus !== 'pending') {
      return res.status(400).json({
        status: "error",
        message: "Cannot delete approved or rejected request"
      });
    }

    await ApprovalWorkflow.destroy({
      where: { requestType: 'business_trip', requestId: id }
    });

    await request.destroy();

    return res.json({
      status: "success",
      message: "Business trip request deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting business trip request:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};



