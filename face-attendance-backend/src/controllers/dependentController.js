import Dependent from "../models/pg/Dependent.js";
import User from "../models/pg/User.js";
import DependentDocument from "../models/pg/DependentDocument.js";
import { Op } from "sequelize";
import { getDependentFileUrl } from "../utils/fileUpload.js";
import { recordAction } from "../services/actionAuditService.js";
import { assertCanManageProfileSubresource, isStaffProfileEditor } from "../utils/profileSubresourceAccess.js";
import { emitEmployeePortalRefresh } from "../socket.js";

const normalizeIdNumber = (value) => String(value || "").replace(/\D/g, "");
const isValidIdNumber = (value) => /^(\d{9}|\d{12})$/.test(normalizeIdNumber(value));
const MAX_DEPENDENT_ID_REF_LEN = 80;

/**
 * CCCD/VNeID: chỉ chữ số 9 hoặc 12. Nhân viên (employee) bắt buộc đúng format.
 * HR/Manager/Supervisor/Accountant có thể lưu mã tham chiếu nội bộ hoặc dữ liệu seed (vd. DEP-EMP028-1).
 */
function parseDependentIdNumber(raw, req) {
  const trimmed = raw == null ? "" : String(raw).trim();
  if (trimmed === "") return { ok: true, value: null };
  const digits = normalizeIdNumber(trimmed);
  if (isValidIdNumber(digits)) return { ok: true, value: digits };
  if (isStaffProfileEditor(req)) {
    if (trimmed.length > MAX_DEPENDENT_ID_REF_LEN) {
      return { ok: false, message: `ID / reference must be at most ${MAX_DEPENDENT_ID_REF_LEN} characters` };
    }
    return { ok: true, value: trimmed };
  }
  return { ok: false, message: "ID Number must be 9 or 12 digits" };
}

const isFutureDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d > today;
};

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
      order: [
        ['updatedAt', 'DESC'],
        ['id', 'DESC']
      ]
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

// Get documents for a dependent (employee: only own dependent)
export const getDependentDocuments = async (req, res) => {
  try {
    const { id } = req.params; // dependentId
    const tokenUserId = req.user?.userId ?? req.user?.id;

    const dependent = await Dependent.findByPk(id);
    if (!dependent) {
      return res.status(404).json({ status: "error", message: "Dependent not found" });
    }

    // Employee can only access own dependent
    if (tokenUserId != null && dependent.userId !== tokenUserId && req.user?.role !== "admin") {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const documents = await DependentDocument.findAll({
      where: { dependentId: dependent.id },
      order: [["createdAt", "DESC"]]
    });

    // Ensure documentPath is an absolute URL so frontends on other ports can load images/files
    const origin = `${req.protocol}://${req.get('host')}`;
    const docsWithUrls = documents.map(d => ({
      id: d.id,
      dependentId: d.dependentId,
      userId: d.userId,
      documentPath: d.documentPath && d.documentPath.startsWith('/') ? `${origin}${d.documentPath}` : d.documentPath,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));

    return res.json({ status: "success", documents: docsWithUrls });
  } catch (err) {
    console.error("Error fetching dependent documents:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Upload dependent documents (PDF only, allow multiple)
export const uploadDependentDocuments = async (req, res) => {
  try {
    const { id } = req.params; // dependentId
    const tokenUserId = req.user?.userId ?? req.user?.id;

    const dependent = await Dependent.findByPk(id);
    if (!dependent) {
      return res.status(404).json({ status: "error", message: "Dependent not found" });
    }

    // Employee can only upload to own dependent
    if (tokenUserId == null || dependent.userId !== tokenUserId) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    // Normalize req.files to an array whether multer used .array() or .fields()
    let filesArray = [];
    if (Array.isArray(req.files)) filesArray = req.files;
    else if (req.files && typeof req.files === 'object') {
      // req.files is an object where values are arrays
      filesArray = Object.values(req.files).flat();
    }

    if (!Array.isArray(filesArray) || filesArray.length === 0) {
      return res.status(400).json({ status: "error", message: "No files uploaded" });
    }

    const docsToCreate = filesArray.map((f) => ({
      dependentId: dependent.id,
      userId: dependent.userId,
      documentPath: getDependentFileUrl(f.filename),
      fileName: f.originalname,
      fileSize: f.size,
      mimeType: f.mimetype
    }));

    const created = await DependentDocument.bulkCreate(docsToCreate);

    const origin = `${req.protocol}://${req.get('host')}`;
    const createdWithUrls = created.map(d => ({
      id: d.id,
      dependentId: d.dependentId,
      userId: d.userId,
      documentPath: d.documentPath && d.documentPath.startsWith('/') ? `${origin}${d.documentPath}` : d.documentPath,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));

    return res.json({
      status: "success",
      message: "Documents uploaded successfully",
      documents: createdWithUrls
    });
  } catch (err) {
    console.error("Error uploading dependent documents:", err);
    return res.status(500).json({ status: "error", message: err.message });
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

    if (!(await assertCanManageProfileSubresource(req, res, userId))) return;

    let normalizedIdForStore = null;
    if (idNumber != null && String(idNumber).trim() !== "") {
      const parsed = parseDependentIdNumber(idNumber, req);
      if (!parsed.ok) {
        return res.status(400).json({ status: "error", message: parsed.message });
      }
      normalizedIdForStore = parsed.value;
    } else if (!isStaffProfileEditor(req)) {
      return res.status(400).json({
        status: "error",
        message: "ID Number is required"
      });
    }

    if (dateOfBirth && isFutureDate(dateOfBirth)) {
      return res.status(400).json({
        status: "error",
        message: "Date of Birth cannot be in the future"
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
      idNumber: normalizedIdForStore,
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

    if (!(await assertCanManageProfileSubresource(req, res, dependent.userId))) return;

    let nextIdNumber = dependent.idNumber;
    if (idNumber !== undefined) {
      if (idNumber === null || String(idNumber).trim() === "") {
        if (!isStaffProfileEditor(req)) {
          return res.status(400).json({
            status: "error",
            message: "ID Number is required"
          });
        }
        nextIdNumber = null;
      } else {
        const parsed = parseDependentIdNumber(idNumber, req);
        if (!parsed.ok) {
          return res.status(400).json({ status: "error", message: parsed.message });
        }
        nextIdNumber = parsed.value;
      }
    }

    if (dateOfBirth !== undefined && dateOfBirth && isFutureDate(dateOfBirth)) {
      return res.status(400).json({
        status: "error",
        message: "Date of Birth cannot be in the future"
      });
    }

    await dependent.update({
      fullName: fullName || dependent.fullName,
      relationship: relationship || dependent.relationship,
      dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : dependent.dateOfBirth,
      gender: gender !== undefined ? gender : dependent.gender,
      idNumber: idNumber !== undefined ? nextIdNumber : dependent.idNumber,
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

    if (!(await assertCanManageProfileSubresource(req, res, dependent.userId))) return;

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

// Get my dependents (employee: all own records — pending / approved / rejected)
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
      where: { userId },
      order: [
        ['updatedAt', 'DESC'],
        ['id', 'DESC']
      ]
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

    await recordAction(req, {
      action: "dependent.approve",
      category: "other",
      targetUserId: dependent.userId,
      entityType: "dependent",
      entityId: dependent.id,
      summary: `Approved dependent: ${dependent.fullName || "—"}`,
      metadata: {
        relationship: dependent.relationship || null,
      },
    });

    emitEmployeePortalRefresh(dependent.userId, "dependent");

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

    await recordAction(req, {
      action: "dependent.reject",
      category: "other",
      targetUserId: dependent.userId,
      entityType: "dependent",
      entityId: dependent.id,
      summary: `Rejected dependent: ${dependent.fullName || "—"}`,
      metadata: {
        reason: reason || null,
      },
    });

    emitEmployeePortalRefresh(dependent.userId, "dependent");

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

