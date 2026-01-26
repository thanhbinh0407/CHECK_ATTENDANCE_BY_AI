import Qualification from "../models/pg/Qualification.js";
import User from "../models/pg/User.js";
import { Op } from "sequelize";

// Get all qualifications (optionally filtered by userId and approvalStatus)
export const getAllQualifications = async (req, res) => {
  try {
    const { userId, approvalStatus } = req.query;
    const where = {};
    
    if (userId) where.userId = parseInt(userId);
    if (approvalStatus) where.approvalStatus = approvalStatus;
    
    const qualifications = await Qualification.findAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'employeeCode', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    return res.json({
      status: "success",
      qualifications
    });
  } catch (err) {
    console.error("Error fetching qualifications:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get qualification by ID
export const getQualificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const qualification = await Qualification.findByPk(id, {
      include: [{
        model: User,
        attributes: ['id', 'name', 'employeeCode']
      }]
    });
    
    if (!qualification) {
      return res.status(404).json({
        status: "error",
        message: "Qualification not found"
      });
    }

    return res.json({
      status: "success",
      qualification
    });
  } catch (err) {
    console.error("Error fetching qualification:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create qualification
export const createQualification = async (req, res) => {
  try {
    const { userId, type, name, issuedBy, issuedDate, expiryDate, certificateNumber, documentPath, description } = req.body;

    if (!userId || !type || !name) {
      return res.status(400).json({
        status: "error",
        message: "UserId, type, and name are required"
      });
    }

    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    const qualification = await Qualification.create({
      userId,
      type,
      name,
      issuedBy,
      issuedDate: issuedDate ? new Date(issuedDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      certificateNumber,
      documentPath,
      description,
      isActive: true
    });

    return res.json({
      status: "success",
      message: "Qualification created successfully",
      qualification
    });
  } catch (err) {
    console.error("Error creating qualification:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update qualification
export const updateQualification = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, issuedBy, issuedDate, expiryDate, certificateNumber, documentPath, description, isActive } = req.body;

    const qualification = await Qualification.findByPk(id);
    if (!qualification) {
      return res.status(404).json({
        status: "error",
        message: "Qualification not found"
      });
    }

    await qualification.update({
      type: type || qualification.type,
      name: name || qualification.name,
      issuedBy: issuedBy !== undefined ? issuedBy : qualification.issuedBy,
      issuedDate: issuedDate !== undefined ? (issuedDate ? new Date(issuedDate) : null) : qualification.issuedDate,
      expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : qualification.expiryDate,
      certificateNumber: certificateNumber !== undefined ? certificateNumber : qualification.certificateNumber,
      documentPath: documentPath !== undefined ? documentPath : qualification.documentPath,
      description: description !== undefined ? description : qualification.description,
      isActive: isActive !== undefined ? isActive : qualification.isActive
    });

    return res.json({
      status: "success",
      message: "Qualification updated successfully",
      qualification
    });
  } catch (err) {
    console.error("Error updating qualification:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete qualification
export const deleteQualification = async (req, res) => {
  try {
    const { id } = req.params;

    const qualification = await Qualification.findByPk(id);
    if (!qualification) {
      return res.status(404).json({
        status: "error",
        message: "Qualification not found"
      });
    }

    await qualification.destroy();

    return res.json({
      status: "success",
      message: "Qualification deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting qualification:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get my qualifications (employee's own qualifications - only approved ones for personal view)
export const getMyQualifications = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized"
      });
    }

    const qualifications = await Qualification.findAll({
      where: { userId, approvalStatus: 'approved' },
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      status: "success",
      qualifications
    });
  } catch (err) {
    console.error("Error fetching my qualifications:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Approve qualification request (admin only)
export const approveQualificationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;

    const qualification = await Qualification.findByPk(id);
    if (!qualification) {
      return res.status(404).json({
        status: "error",
        message: "Qualification not found"
      });
    }

    await qualification.update({
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: adminId,
      rejectionReason: null
    });

    return res.json({
      status: "success",
      message: "Qualification approved successfully",
      qualification
    });
  } catch (err) {
    console.error("Error approving qualification:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Reject qualification request (admin only)
export const rejectQualificationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const qualification = await Qualification.findByPk(id);
    if (!qualification) {
      return res.status(404).json({
        status: "error",
        message: "Qualification not found"
      });
    }

    await qualification.update({
      approvalStatus: 'rejected',
      rejectionReason: reason || 'No reason provided'
    });

    return res.json({
      status: "success",
      message: "Qualification rejected",
      qualification
    });
  } catch (err) {
    console.error("Error rejecting qualification:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

