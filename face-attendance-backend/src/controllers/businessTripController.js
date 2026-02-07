import BusinessTripRequest from "../models/pg/BusinessTripRequest.js";
import ApprovalWorkflow from "../models/pg/ApprovalWorkflow.js";
import User from "../models/pg/User.js";
import Notification from "../models/pg/Notification.js";
import { Op } from "sequelize";

// Get all business trip requests
export const getBusinessTripRequests = async (req, res) => {
  try {
    const { userId, status, month, year } = req.query;

    const where = {};
    if (userId) where.userId = userId;
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
      order: [['startDate', 'DESC'], ['createdAt', 'DESC']]
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
    const userId = req.user.id;

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
      currentApproverId: user?.managerId || null
    });

    // Create approval workflow
    if (user?.managerId) {
      await ApprovalWorkflow.create({
        requestType: 'business_trip',
        requestId: request.id,
        level: 1,
        approverId: user.managerId,
        status: 'pending'
      });

      // Notify manager
      await Notification.create({
        userId: user.managerId,
        type: 'business_trip_request',
        title: 'New Business Trip Request',
        message: `${user.name} has submitted a business trip request to ${destination}`,
        isRead: false
      });
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
    const approverId = req.user.id;

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

      await ApprovalWorkflow.update(
        { status: 'rejected', approvedAt: new Date(), comments },
        { where: { requestType: 'business_trip', requestId: id, approverId } }
      );

      await Notification.create({
        userId: request.userId,
        type: 'business_trip_request',
        title: 'Business Trip Request Rejected',
        message: `Your business trip request to ${request.destination} has been rejected`,
        isRead: false
      });
    } else if (action === 'approve') {
      if (request.approvalLevel >= 3) {
        await request.update({
          approvalStatus: 'approved',
          approvedBy: approverId,
          approvedAt: new Date()
        });

        await ApprovalWorkflow.update(
          { status: 'approved', approvedAt: new Date(), comments },
          { where: { requestType: 'business_trip', requestId: id, approverId } }
        );

        await Notification.create({
          userId: request.userId,
          type: 'business_trip_request',
          title: 'Business Trip Request Approved',
          message: `Your business trip request to ${request.destination} has been approved`,
          isRead: false
        });
      } else {
        const nextLevel = request.approvalLevel + 1;
        const hrUsers = await User.findAll({ where: { role: 'admin' }, limit: 1 });
        const nextApproverId = nextLevel === 2 ? (hrUsers[0]?.id || null) : null;

        await request.update({
          approvalLevel: nextLevel,
          currentApproverId: nextApproverId
        });

        await ApprovalWorkflow.update(
          { status: 'approved', approvedAt: new Date(), comments },
          { where: { requestType: 'business_trip', requestId: id, approverId } }
        );

        if (nextApproverId) {
          await ApprovalWorkflow.create({
            requestType: 'business_trip',
            requestId: id,
            level: nextLevel,
            approverId: nextApproverId,
            status: 'pending'
          });

          await Notification.create({
            userId: nextApproverId,
            type: 'business_trip_request',
            title: 'Business Trip Request Pending Approval',
            message: `${request.User.name}'s business trip request needs your approval`,
            isRead: false
          });
        }
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



