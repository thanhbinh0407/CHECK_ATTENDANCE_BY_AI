import WorkExperience from "../models/pg/WorkExperience.js";
import User from "../models/pg/User.js";
import { PERMISSIONS } from "../config/permissionMatrix.js";

function parseId(value) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Ai được xem / sửa kinh nghiệm làm việc của nhân viên targetUserId — thống nhất với truy cập hồ sơ:
 * - manager, hr, accountant: toàn bộ nhân viên
 * - supervisor: chỉ nhân viên cùng phòng (departmentId)
 * - employee: chỉ chính mình
 */
async function assertCanAccessTargetEmployee(req, res, targetUserId) {
  const tid = parseId(targetUserId);
  if (tid == null || tid < 1) {
    res.status(400).json({ status: "error", message: "Invalid employee id" });
    return false;
  }

  const { role, id: selfId, departmentId: supervisorDeptId, permissions = [] } = req.user || {};
  const roleLower = String(role || "").toLowerCase();
  const self = parseId(selfId);

  if (["manager", "hr", "accountant"].includes(roleLower)) {
    return true;
  }

  if (roleLower === "employee") {
    if (self === tid && permissions.includes(PERMISSIONS["profile:view:own"])) {
      return true;
    }
    res.status(403).json({
      status: "error",
      message: "You don't have permission to view this employee's work experience",
    });
    return false;
  }

  if (roleLower === "supervisor") {
    const emp = await User.findByPk(tid, { attributes: ["id", "departmentId", "role"] });
    if (!emp || String(emp.role || "").toLowerCase() !== "employee") {
      res.status(404).json({ status: "error", message: "Employee not found" });
      return false;
    }
    const sd = parseId(supervisorDeptId);
    if (Number.isFinite(sd) && sd > 0 && emp.departmentId === sd) {
      return true;
    }
    res.status(403).json({
      status: "error",
      message: "You don't have permission to access this employee's work experience",
    });
    return false;
  }

  res.status(403).json({ status: "error", message: "Access denied" });
  return false;
}

async function assertCanMutateWorkExperience(req, res, targetUserId) {
  const tid = parseId(targetUserId);
  if (tid == null || tid < 1) {
    res.status(400).json({ status: "error", message: "Invalid employee id" });
    return false;
  }

  const { role, id: selfId, departmentId: supervisorDeptId, permissions = [] } = req.user || {};
  const roleLower = String(role || "").toLowerCase();
  const self = parseId(selfId);

  if (["manager", "hr", "accountant"].includes(roleLower)) {
    if (!permissions.includes(PERMISSIONS["user:update"])) {
      res.status(403).json({ status: "error", message: "Missing permission to update employee records" });
      return false;
    }
    return true;
  }

  if (roleLower === "employee") {
    if (self === tid && permissions.includes(PERMISSIONS["profile:update:own"])) {
      return true;
    }
    res.status(403).json({
      status: "error",
      message: "You can only manage your own work experience",
    });
    return false;
  }

  if (roleLower === "supervisor") {
    const emp = await User.findByPk(tid, { attributes: ["id", "departmentId", "role"] });
    if (!emp || String(emp.role || "").toLowerCase() !== "employee") {
      res.status(404).json({ status: "error", message: "Employee not found" });
      return false;
    }
    const sd = parseId(supervisorDeptId);
    if (Number.isFinite(sd) && sd > 0 && emp.departmentId === sd) {
      return true;
    }
    res.status(403).json({
      status: "error",
      message: "You don't have permission to update this employee's work experience",
    });
    return false;
  }

  res.status(403).json({ status: "error", message: "Access denied" });
  return false;
}

// Get all work experiences for an employee
export const getWorkExperiences = async (req, res) => {
  try {
    const userId = parseId(req.params.userId);
    if (userId == null) {
      return res.status(400).json({ status: "error", message: "Invalid user id" });
    }

    if (!(await assertCanAccessTargetEmployee(req, res, userId))) return;

    const experiences = await WorkExperience.findAll({
      where: { userId },
      order: [["startDate", "DESC"]],
    });

    return res.json({
      status: "success",
      workExperiences: experiences,
    });
  } catch (err) {
    console.error("Error fetching work experiences:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

// Create work experience
export const createWorkExperience = async (req, res) => {
  try {
    const userId = parseId(req.params.userId);
    if (userId == null) {
      return res.status(400).json({ status: "error", message: "Invalid user id" });
    }

    if (!(await assertCanMutateWorkExperience(req, res, userId))) return;

    const { companyName, position, startDate, endDate, description, responsibilities, achievements, isCurrent } =
      req.body;

    if (!companyName || !position) {
      return res.status(400).json({
        status: "error",
        message: "Company name and position are required",
      });
    }

    const user = await User.findOne({ where: { id: userId, role: "employee" } });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
      });
    }

    const experience = await WorkExperience.create({
      userId,
      companyName,
      position,
      startDate: startDate ? new Date(startDate) : null,
      endDate: isCurrent ? null : endDate ? new Date(endDate) : null,
      description: description || null,
      responsibilities: responsibilities || null,
      achievements: achievements || null,
      isCurrent: Boolean(isCurrent),
    });

    return res.json({
      status: "success",
      message: "Work experience created successfully",
      workExperience: experience,
    });
  } catch (err) {
    console.error("Error creating work experience:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

// Update work experience
export const updateWorkExperience = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id == null) {
      return res.status(400).json({ status: "error", message: "Invalid work experience id" });
    }

    const { companyName, position, startDate, endDate, description, responsibilities, achievements, isCurrent } =
      req.body;

    const experience = await WorkExperience.findByPk(id);
    if (!experience) {
      return res.status(404).json({
        status: "error",
        message: "Work experience not found",
      });
    }

    if (!(await assertCanMutateWorkExperience(req, res, experience.userId))) return;

    const nextIsCurrent = isCurrent !== undefined ? Boolean(isCurrent) : experience.isCurrent;

    const updateData = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (position !== undefined) updateData.position = position;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) {
      updateData.endDate = nextIsCurrent ? null : endDate ? new Date(endDate) : null;
    }
    if (description !== undefined) updateData.description = description;
    if (responsibilities !== undefined) updateData.responsibilities = responsibilities;
    if (achievements !== undefined) updateData.achievements = achievements;
    if (isCurrent !== undefined) {
      updateData.isCurrent = nextIsCurrent;
      if (nextIsCurrent) updateData.endDate = null;
    }

    await experience.update(updateData);

    return res.json({
      status: "success",
      message: "Work experience updated successfully",
      workExperience: experience,
    });
  } catch (err) {
    console.error("Error updating work experience:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

// Delete work experience
export const deleteWorkExperience = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id == null) {
      return res.status(400).json({ status: "error", message: "Invalid work experience id" });
    }

    const experience = await WorkExperience.findByPk(id);
    if (!experience) {
      return res.status(404).json({
        status: "error",
        message: "Work experience not found",
      });
    }

    if (!(await assertCanMutateWorkExperience(req, res, experience.userId))) return;

    await experience.destroy();

    return res.json({
      status: "success",
      message: "Work experience deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting work experience:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};
