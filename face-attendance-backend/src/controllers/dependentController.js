import Dependent from "../models/pg/Dependent.js";
import User from "../models/pg/User.js";
import { Op } from "sequelize";

// Get all dependents (optionally filtered by userId and approvalStatus)
export const getAllDependents = async (req, res) => {
  try {
    const { userId, approvalStatus } = req.query;
    const where = {};
    
    if (userId) where.userId = parseInt(userId);
    if (approvalStatus) where.approvalStatus = approvalStatus;
    
    const dependents = await Dependent.findAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'employeeCode', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    return res.json({
      status: "success",
      dependents
    });
  } catch (err) {
    console.error("Error fetching dependents:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get dependent by ID
export const getDependentById = async (req, res) => {
  try {
    const { id } = req.params;
    const dependent = await Dependent.findByPk(id, {
      include: [{
        model: User,
        attributes: ['id', 'name', 'employeeCode']
      }]
    });
    
    if (!dependent) {
      return res.status(404).json({
        status: "error",
        message: "Dependent not found"
      });
    }

    return res.json({
      status: "success",
      dependent
    });
  } catch (err) {
    console.error("Error fetching dependent:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create dependent
export const createDependent = async (req, res) => {
  try {
    const { userId, fullName, relationship, dateOfBirth, gender, idNumber, address, phoneNumber, email, occupation, notes } = req.body;

    if (!userId || !fullName || !relationship) {
      return res.status(400).json({
        status: "error",
        message: "UserId, fullName, and relationship are required"
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

    const dependent = await Dependent.create({
      userId,
      fullName,
      relationship,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender,
      idNumber,
      address,
      phoneNumber,
      email,
      occupation,
      notes,
      isDependent: true
    });

    return res.json({
      status: "success",
      message: "Dependent created successfully",
      dependent
    });
  } catch (err) {
    console.error("Error creating dependent:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update dependent
export const updateDependent = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, relationship, dateOfBirth, gender, idNumber, address, phoneNumber, email, occupation, notes, isDependent } = req.body;

    const dependent = await Dependent.findByPk(id);
    if (!dependent) {
      return res.status(404).json({
        status: "error",
        message: "Dependent not found"
      });
    }

    await dependent.update({
      fullName: fullName || dependent.fullName,
      relationship: relationship || dependent.relationship,
      dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : dependent.dateOfBirth,
      gender: gender !== undefined ? gender : dependent.gender,
      idNumber: idNumber !== undefined ? idNumber : dependent.idNumber,
      address: address !== undefined ? address : dependent.address,
      phoneNumber: phoneNumber !== undefined ? phoneNumber : dependent.phoneNumber,
      email: email !== undefined ? email : dependent.email,
      occupation: occupation !== undefined ? occupation : dependent.occupation,
      notes: notes !== undefined ? notes : dependent.notes,
      isDependent: isDependent !== undefined ? isDependent : dependent.isDependent
    });

    return res.json({
      status: "success",
      message: "Dependent updated successfully",
      dependent
    });
  } catch (err) {
    console.error("Error updating dependent:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete dependent
export const deleteDependent = async (req, res) => {
  try {
    const { id } = req.params;

    const dependent = await Dependent.findByPk(id);
    if (!dependent) {
      return res.status(404).json({
        status: "error",
        message: "Dependent not found"
      });
    }

    await dependent.destroy();

    return res.json({
      status: "success",
      message: "Dependent deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting dependent:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get my dependents (employee's own dependents - only approved ones for personal view)
export const getMyDependents = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized"
      });
    }

    const dependents = await Dependent.findAll({
      where: { userId, approvalStatus: 'approved' },
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      status: "success",
      dependents
    });
  } catch (err) {
    console.error("Error fetching my dependents:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Approve dependent request (admin only)
export const approveDependentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;

    const dependent = await Dependent.findByPk(id);
    if (!dependent) {
      return res.status(404).json({
        status: "error",
        message: "Dependent not found"
      });
    }

    await dependent.update({
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: adminId,
      rejectionReason: null
    });

    return res.json({
      status: "success",
      message: "Dependent approved successfully",
      dependent
    });
  } catch (err) {
    console.error("Error approving dependent:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Reject dependent request (admin only)
export const rejectDependentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const dependent = await Dependent.findByPk(id);
    if (!dependent) {
      return res.status(404).json({
        status: "error",
        message: "Dependent not found"
      });
    }

    await dependent.update({
      approvalStatus: 'rejected',
      rejectionReason: reason || 'No reason provided'
    });

    return res.json({
      status: "success",
      message: "Dependent rejected",
      dependent
    });
  } catch (err) {
    console.error("Error rejecting dependent:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

