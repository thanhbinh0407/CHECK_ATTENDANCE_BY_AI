import User from "../models/pg/User.js";
import FaceProfile from "../models/pg/FaceProfile.js";
import Notification from "../models/pg/Notification.js";
import bcrypt from "bcryptjs";

// Generate random password
function generateRandomPassword(length = 8) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Simple Euclidean distance calculation
function euclidean(a, b) {
  let arrA = Array.isArray(a) ? a : Object.values(a);
  let arrB = Array.isArray(b) ? b : Object.values(b);
  if (arrA.length !== arrB.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < arrA.length; i++) {
    const diff = (Number(arrA[i]) || 0) - (Number(arrB[i]) || 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Map frontend education level (Tiếng Việt) to DB ENUM values
function normalizeEducationLevel(educationLevel) {
  if (!educationLevel) return null;

  const mapping = {
    "Trung cấp": "vocational",
    "Cao đẳng": "college",
    "Đại học": "university",
    "Sau đại học (ThS/TS)": "master",
  };

  // If value is already an enum value, keep it
  const allowed = new Set([
    "high_school",
    "vocational",
    "college",
    "university",
    "master",
    "phd",
    "other",
  ]);

  if (allowed.has(educationLevel)) {
    return educationLevel;
  }

  return mapping[educationLevel] || "other";
}

function normalizeIdNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

export const registerUser = async (req, res) => {
  try {
    const { name, idNumber, email, employeeCode, descriptor, password, jobTitle, educationLevel, certificates, dependents, baseSalary } = req.body;
    const normalizedIdNumber = normalizeIdNumber(idNumber);

    if (!name || !email || !employeeCode || !normalizedIdNumber) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields"
      });
    }

    if (!/^\d{12}$/.test(normalizedIdNumber)) {
      return res.status(400).json({
        status: "error",
        message: "CCCD must be exactly 12 digits"
      });
    }

    // Check if user already exists
    const existing = await User.findOne({
      where: { employeeCode }
    });

    if (existing) {
      return res.status(400).json({
        status: "error",
        message: "Employee code already registered"
      });
    }

    const existingIdNumber = await User.findOne({
      where: { idNumber: normalizedIdNumber }
    });

    if (existingIdNumber) {
      return res.status(400).json({
        status: "error",
        message: `CCCD "${normalizedIdNumber}" is already registered`
      });
    }

    // Use provided password or generate random password
    const finalPassword = password || generateRandomPassword(10);
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Normalize education level to match DB enum
    const normalizedEducationLevel = normalizeEducationLevel(educationLevel);

    if (descriptor !== undefined && descriptor !== null && (!Array.isArray(descriptor) || descriptor.length === 0)) {
      return res.status(400).json({
        status: "error",
        message: "Descriptor must be a non-empty array when provided"
      });
    }

    // Check for duplicate face if descriptor provided
    if (Array.isArray(descriptor) && descriptor.length > 0) {
      const profiles = await FaceProfile.findAll();
      const DUPLICATE_THRESHOLD = 0.32; // Same as HIGH threshold in matchService
      for (const p of profiles) {
        if (!p.embeddings) continue;
        let embeddingsArray = p.embeddings;
        if (!Array.isArray(embeddingsArray)) {
          if (typeof embeddingsArray === 'object') embeddingsArray = Object.values(embeddingsArray);
        }
        if (!Array.isArray(embeddingsArray) || embeddingsArray.length === 0) continue;
        const dist = euclidean(descriptor, embeddingsArray);
        if (dist < DUPLICATE_THRESHOLD) {
          return res.status(400).json({
            status: "error",
            message: "Face already registered in the system"
          });
        }
      }
    }

    // Create user with password and job-related fields
    const user = await User.create({
      name,
      email,
      employeeCode,
      idNumber: normalizedIdNumber,
      password: hashedPassword,
      role: "employee",
      isActive: true,
      jobTitle: jobTitle || "Nhân viên",
      educationLevel: normalizedEducationLevel,
      baseSalary: baseSalary || 1800000 // Default to state-owned base salary
    });

    // Face enrollment is optional at registration time.
    if (Array.isArray(descriptor) && descriptor.length > 0) {
      await FaceProfile.create({
        userId: user.id,
        embeddings: descriptor
      });
    }

    console.log(`User enrolled: ${name} (${employeeCode}) with ${password ? 'custom' : 'auto-generated'} password`);

    return res.json({
      status: "success",
      message: "Enrollment successful",
      userId: user.id,
      password: finalPassword, // Return password so admin can share it
      passwordGenerated: !password, // Indicate if password was auto-generated
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode
      }
    });
  } catch (err) {
    console.error("Enrollment error:", err);
    
    // Handle specific validation errors
    if (err.name === "SequelizeUniqueConstraintError") {
      const field = err.errors?.[0]?.path || "field";
      const value = err.errors?.[0]?.value;
      
      if (field === "email") {
        return res.status(400).json({
          status: "error",
          message: `Email "${value}" is already registered`
        });
      } else if (field === "employeeCode") {
        return res.status(400).json({
          status: "error",
          message: `Employee code "${value}" is already registered`
        });
      } else if (field === "idNumber") {
        return res.status(400).json({
          status: "error",
          message: `CCCD "${value}" is already registered`
        });
      }
    }
    
    if (err.name === "SequelizeValidationError") {
      const errors = err.errors.map(e => e.message).join(", ");
      return res.status(400).json({
        status: "error",
        message: `Validation error: ${errors}`
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: "Enrollment failed: " + err.message
    });
  }
};

export const updateUserFace = async (req, res) => {
  try {
    const { employeeCode, userId, descriptor } = req.body;

    if ((!employeeCode && !userId) || !Array.isArray(descriptor) || descriptor.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "employeeCode or userId and a non-empty descriptor are required"
      });
    }

    const where = employeeCode ? { employeeCode } : { id: userId };
    const user = await User.findOne({ where });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    const existingFace = await FaceProfile.findOne({ where: { userId: user.id } });
    if (existingFace) {
      await existingFace.update({ embeddings: descriptor });
    } else {
      await FaceProfile.create({
        userId: user.id,
        embeddings: descriptor
      });
    }

    return res.json({
      status: "success",
      message: "Face profile updated successfully",
      user: {
        id: user.id,
        name: user.name,
        employeeCode: user.employeeCode
      }
    });
  } catch (err) {
    console.error("Update face error:", err);
    return res.status(500).json({
      status: "error",
      message: "Update face failed: " + err.message
    });
  }
};

// Keep old enroll for backward compatibility
export const enroll = registerUser;
