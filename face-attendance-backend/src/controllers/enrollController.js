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

export const registerUser = async (req, res) => {
  try {
    const { name, email, employeeCode, descriptor, password, jobTitle, educationLevel, certificates, dependents, baseSalary } = req.body;

    if (!name || !email || !employeeCode || !descriptor) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields"
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

    // Use provided password or generate random password
    const finalPassword = password || generateRandomPassword(10);
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Normalize education level to match DB enum
    const normalizedEducationLevel = normalizeEducationLevel(educationLevel);

    // Create user with password and job-related fields
    const user = await User.create({
      name,
      email,
      employeeCode,
      password: hashedPassword,
      role: "employee",
      isActive: true,
      jobTitle: jobTitle || "Nhân viên",
      educationLevel: normalizedEducationLevel,
      baseSalary: baseSalary || 1800000 // Default to state-owned base salary
    });

    // Create face profile
    await FaceProfile.create({
      userId: user.id,
      embeddings: descriptor
    });

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

// Keep old enroll for backward compatibility
export const enroll = registerUser;
