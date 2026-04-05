import User from "../models/pg/User.js";
import FaceProfile from "../models/pg/FaceProfile.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import Salary from "../models/pg/Salary.js";
import LeaveRequest from "../models/pg/LeaveRequest.js";
import Department from "../models/pg/Department.js";
import JobTitle from "../models/pg/JobTitle.js";
import SalaryGrade from "../models/pg/SalaryGrade.js";
import Dependent from "../models/pg/Dependent.js";
import Qualification from "../models/pg/Qualification.js";
import WorkExperience from "../models/pg/WorkExperience.js";
import JobHistory from "../models/pg/JobHistory.js";
import SalaryHistory from "../models/pg/SalaryHistory.js";
import RoleChangeAudit from "../models/pg/RoleChangeAudit.js";
import sequelize from "../db/sequelize.js";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { recalculatePendingSalariesForUsers } from "../services/salaryCalculationService.js";
import { sendNotification } from "./notificationController.js";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const sumAllowances = (obj) => {
  return (
    toNumber(obj?.lunchAllowance) +
    toNumber(obj?.transportAllowance) +
    toNumber(obj?.phoneAllowance) +
    toNumber(obj?.responsibilityAllowance)
  );
};

// Get all employees
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.findAll({
      attributes: { exclude: ["password"] },
      include: [
        { 
          model: FaceProfile,
          as: "FaceProfiles",
          attributes: ["id", "createdAt"],
          required: false
        },
        { 
          model: Department, 
          attributes: ['id', 'name'],
          required: false
        },
        { 
          model: JobTitle, 
          attributes: ['id', 'name'],
          required: false
        },
        { 
          model: User, 
          as: 'Manager', 
          attributes: ['id', 'name', 'employeeCode', 'email'],
          required: false
        }
      ],
      order: [
        [{ model: User, as: 'Manager' }, 'name', 'ASC'],
        ['createdAt', 'ASC']
      ]
    });

    return res.json({
      status: "success",
      employees
    });
  } catch (err) {
    console.error("Error fetching employees:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

/** Tổng hợp điểm danh trong ngày theo userId (log cuối trong ngày = trạng thái hiện tại). */
export const getTodayPresenceSummary = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const logs = await AttendanceLog.findAll({
      where: {
        userId: { [Op.ne]: null },
        timestamp: { [Op.gte]: todayStart, [Op.lt]: tomorrow },
      },
      attributes: ["userId", "type", "timestamp"],
      order: [["timestamp", "ASC"]],
    });

    const byUser = new Map();
    for (const log of logs) {
      const uid = log.userId;
      if (!byUser.has(uid)) {
        byUser.set(uid, { logCount: 0, lastType: null, lastAt: null });
      }
      const p = byUser.get(uid);
      p.logCount += 1;
      p.lastType = log.type;
      p.lastAt = log.timestamp;
    }

    const presence = Object.fromEntries(byUser.entries());

    return res.json({
      status: "success",
      date: todayStart.toISOString().split("T")[0],
      presence,
    });
  } catch (err) {
    console.error("Error fetching today presence:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

// Get employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await User.findOne({
      where: { id },
      attributes: { exclude: ["password"] },
      include: [{ 
        model: FaceProfile 
      }]
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    return res.json({
      status: "success",
      employee
    });
  } catch (err) {
    console.error("Error fetching employee:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get employee by ID WITH password (for admin/accountant viewing)
export const getEmployeeWithPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await User.findOne({
      where: { id },
      include: [{ 
        model: FaceProfile 
      }]
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    return res.json({
      status: "success",
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employeeCode,
        role: employee.role,
        isActive: employee.isActive,
        baseSalary: employee.baseSalary,
        password: employee.password, // bcrypt hash (not plaintext)
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
        FaceProfiles: employee.FaceProfiles
      }
    });
  } catch (err) {
    console.error("Error fetching employee:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      employeeCode, 
      isActive, 
      baseSalary,
      phoneNumber,
      address,
      permanentAddress,
      temporaryAddress,
      dateOfBirth,
      gender,
      idNumber,
      idIssueDate,
      idIssuePlace,
      personalEmail,
      companyEmail,
      departmentId,
      jobTitleId,
      startDate,
      bankAccount,
      bankName,
      bankBranch,
      taxCode,
      contractType,
      employmentStatus,
      managerId,
      branchName,
      lunchAllowance,
      transportAllowance,
      phoneAllowance,
      responsibilityAllowance,
      socialInsuranceNumber,
      healthInsuranceProvider,
      dependentCount,
      educationLevel,
      major,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      effectiveDate,
      historyNote,
      salaryChangeReason,
      role: bodyRole,
    } = req.body;

    const actorId = req.user?.userId ?? req.user?.id ?? null;
    const actorIsManager = req.user?.role === "manager";

    const employee = await User.findOne({
      where: { id }
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    // Check email uniqueness
    if (email && email !== employee.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({
          status: "error",
          message: "Email already in use"
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (employeeCode !== undefined) updateData.employeeCode = employeeCode;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (baseSalary !== undefined) updateData.baseSalary = parseFloat(baseSalary) || 0;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (address !== undefined) updateData.address = address;
    if (permanentAddress !== undefined) updateData.permanentAddress = permanentAddress;
    if (temporaryAddress !== undefined) updateData.temporaryAddress = temporaryAddress;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (idNumber !== undefined) updateData.idNumber = idNumber;
    if (idIssueDate !== undefined) updateData.idIssueDate = idIssueDate ? new Date(idIssueDate) : null;
    if (idIssuePlace !== undefined) updateData.idIssuePlace = idIssuePlace;
    if (personalEmail !== undefined) updateData.personalEmail = personalEmail;
    if (companyEmail !== undefined) updateData.companyEmail = companyEmail;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (jobTitleId !== undefined) updateData.jobTitleId = jobTitleId;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankBranch !== undefined) updateData.bankBranch = bankBranch;
    if (taxCode !== undefined) updateData.taxCode = taxCode;
    if (contractType !== undefined) updateData.contractType = contractType || null;
    if (employmentStatus !== undefined) updateData.employmentStatus = employmentStatus || null;
    if (managerId !== undefined) updateData.managerId = managerId ? parseInt(managerId) : null;
    if (branchName !== undefined) updateData.branchName = branchName;
    if (lunchAllowance !== undefined) updateData.lunchAllowance = parseFloat(lunchAllowance) || 0;
    if (transportAllowance !== undefined) updateData.transportAllowance = parseFloat(transportAllowance) || 0;
    if (phoneAllowance !== undefined) updateData.phoneAllowance = parseFloat(phoneAllowance) || 0;
    if (responsibilityAllowance !== undefined) updateData.responsibilityAllowance = parseFloat(responsibilityAllowance) || 0;
    if (socialInsuranceNumber !== undefined) updateData.socialInsuranceNumber = socialInsuranceNumber;
    if (healthInsuranceProvider !== undefined) updateData.healthInsuranceProvider = healthInsuranceProvider;
    if (dependentCount !== undefined) updateData.dependentCount = parseInt(dependentCount) || 0;
    if (educationLevel !== undefined) {
      // Convert empty string to null for enum fields
      updateData.educationLevel = educationLevel === "" ? null : educationLevel;
    }
    if (major !== undefined) updateData.major = major;
    if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName;
    if (emergencyContactRelationship !== undefined) updateData.emergencyContactRelationship = emergencyContactRelationship;
    if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone;

    let roleAuditPayload = null;
    if (bodyRole !== undefined && bodyRole !== null && String(bodyRole).trim() !== "") {
      if (!actorIsManager) {
        return res.status(403).json({
          status: "error",
          message: "Chỉ Manager mới được đổi role trong form chỉnh sửa.",
        });
      }
      const validRoles = ["manager", "hr", "accountant", "supervisor", "employee"];
      const newRole = String(bodyRole).trim();
      if (!validRoles.includes(newRole)) {
        return res.status(400).json({ status: "error", message: "Invalid role" });
      }
      if (Number(employee.id) === Number(actorId)) {
        return res.status(400).json({ status: "error", message: "Cannot change your own role" });
      }
      if (newRole !== employee.role) {
        roleAuditPayload = { oldRole: employee.role, newRole };
        updateData.role = newRole;
      }
    }
    
    // Convert empty strings to null for enum fields to avoid PostgreSQL enum errors
    if (gender !== undefined) updateData.gender = gender === "" ? null : gender;
    if (contractType !== undefined) updateData.contractType = contractType === "" ? null : contractType;
    if (employmentStatus !== undefined) updateData.employmentStatus = employmentStatus === "" ? null : employmentStatus;

    // Detect if salary-affecting fields changed
    const salaryAffectingFields = ['baseSalary', 'lunchAllowance', 'transportAllowance', 'phoneAllowance', 'responsibilityAllowance', 'startDate'];
    const salaryFieldsChanged = salaryAffectingFields.some(field => updateData[field] !== undefined);

    const oldDepartmentId = employee.departmentId;
    const oldJobTitleId = employee.jobTitleId;
    const oldBaseSalary = toNumber(employee.baseSalary);
    const oldTotalAllowance = sumAllowances(employee);

    const newDepartmentId = updateData.departmentId !== undefined ? updateData.departmentId : employee.departmentId;
    const newJobTitleId = updateData.jobTitleId !== undefined ? updateData.jobTitleId : employee.jobTitleId;
    const newBaseSalary = updateData.baseSalary !== undefined ? toNumber(updateData.baseSalary) : oldBaseSalary;
    const newTotalAllowance =
      (updateData.lunchAllowance !== undefined ||
        updateData.transportAllowance !== undefined ||
        updateData.phoneAllowance !== undefined ||
        updateData.responsibilityAllowance !== undefined)
        ? sumAllowances({ ...employee.toJSON(), ...updateData })
        : oldTotalAllowance;

    const jobChanged = oldDepartmentId !== newDepartmentId || oldJobTitleId !== newJobTitleId;
    const salaryChanged = oldBaseSalary !== newBaseSalary || oldTotalAllowance !== newTotalAllowance;

    const normalizedEffectiveDate = effectiveDate || new Date().toISOString().slice(0, 10);
    const changedBy = req.user?.userId ?? req.user?.id ?? null;

    const getJobChangeType = () => {
      if (oldJobTitleId !== newJobTitleId && oldDepartmentId === newDepartmentId) return 'promotion';
      if (oldDepartmentId !== newDepartmentId && oldJobTitleId === newJobTitleId) return 'transfer';
      if (oldDepartmentId !== newDepartmentId && oldJobTitleId !== newJobTitleId) return 'other';
      return 'correction';
    };

    const getSalaryChangeType = () => {
      if (oldBaseSalary === 0 && newBaseSalary > 0) return 'initial_salary';
      if (newBaseSalary > oldBaseSalary || newTotalAllowance > oldTotalAllowance) return 'increase';
      if (newBaseSalary < oldBaseSalary || newTotalAllowance < oldTotalAllowance) return 'decrease';
      return 'correction';
    };

    await sequelize.transaction(async (transaction) => {
      await employee.update(updateData, { transaction });

      if (roleAuditPayload) {
        await RoleChangeAudit.create(
          {
            userId: employee.id,
            changedBy: actorId,
            oldRole: roleAuditPayload.oldRole,
            newRole: roleAuditPayload.newRole,
            reason: salaryChangeReason || historyNote || "Role updated via employee edit form",
            ipAddress: req.ip || null,
            userAgent: req.get("user-agent") || null,
          },
          { transaction }
        );
      }

      if (jobChanged) {
        await JobHistory.create({
          userId: employee.id,
          fromDepartmentId: oldDepartmentId,
          toDepartmentId: newDepartmentId,
          fromJobTitleId: oldJobTitleId,
          toJobTitleId: newJobTitleId,
          changeType: getJobChangeType(),
          effectiveDate: normalizedEffectiveDate,
          notes: historyNote || null,
          changedBy,
        }, { transaction });
      }

      if (salaryChanged) {
        await SalaryHistory.create({
          userId: employee.id,
          previousBaseSalary: oldBaseSalary,
          newBaseSalary,
          previousTotalAllowance: oldTotalAllowance,
          newTotalAllowance,
          changeType: getSalaryChangeType(),
          effectiveDate: normalizedEffectiveDate,
          reason: salaryChangeReason || historyNote || null,
          changedBy,
        }, { transaction });
      }
    });

    // Recalculate pending/approved salary records if salary-affecting fields changed
    let recalculatedSalaryCount = 0;
    if (salaryFieldsChanged) {
      const recalcResult = await recalculatePendingSalariesForUsers([parseInt(id)]);
      recalculatedSalaryCount = recalcResult.recalculatedCount;
      if (recalcResult.errors.length > 0) {
        console.warn("Some salary recalculations failed:", recalcResult.errors);
      }
    }

    // Reload with associations
    await employee.reload({
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: JobTitle, attributes: ['id', 'name'] },
        { model: User, as: 'Manager', attributes: ['id', 'name', 'employeeCode', 'email'] }
      ]
    });

    console.log(`Employee updated: ${employee.name} (ID: ${id})${salaryFieldsChanged ? ` - ${recalculatedSalaryCount} salary record(s) recalculated` : ''}`);

    // Send broadcast notifications for important changes
    if (jobChanged) {
      const changeTypeText = getJobChangeType() === 'promotion' ? 'promoted' : 
                            getJobChangeType() === 'transfer' ? 'transferred' : 'updated';
      await sendNotification(null, 'system', 'Employee Position Updated', 
        `Employee ${employee.name} (${employee.employeeCode}) has been ${changeTypeText}.`, 
        { employeeId: employee.id, changeType: 'job', type: getJobChangeType() });
    }

    if (salaryChanged) {
      const changeTypeText = getSalaryChangeType() === 'increase' ? 'increased' : 
                            getSalaryChangeType() === 'decrease' ? 'decreased' : 'updated';
      await sendNotification(null, 'system', 'Employee Salary Updated', 
        `Employee ${employee.name} (${employee.employeeCode}) salary has been ${changeTypeText}.`, 
        { employeeId: employee.id, changeType: 'salary', type: getSalaryChangeType() });
    }

    return res.json({
      status: "success",
      message: salaryFieldsChanged && recalculatedSalaryCount > 0
        ? `Employee updated successfully. ${recalculatedSalaryCount} salary record(s) recalculated.`
        : "Employee updated successfully",
      recalculatedSalaryCount,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employeeCode,
        personalEmail: employee.personalEmail,
        companyEmail: employee.companyEmail,
        role: employee.role,
        isActive: employee.isActive,
        baseSalary: employee.baseSalary,
        phoneNumber: employee.phoneNumber,
        address: employee.address,
        permanentAddress: employee.permanentAddress,
        temporaryAddress: employee.temporaryAddress,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        idNumber: employee.idNumber,
        idIssueDate: employee.idIssueDate,
        idIssuePlace: employee.idIssuePlace,
        departmentId: employee.departmentId,
        jobTitleId: employee.jobTitleId,
        startDate: employee.startDate,
        bankAccount: employee.bankAccount,
        bankName: employee.bankName,
        bankBranch: employee.bankBranch,
        taxCode: employee.taxCode,
        idNumber: employee.idNumber,
        contractType: employee.contractType,
        employmentStatus: employee.employmentStatus,
        managerId: employee.managerId,
        branchName: employee.branchName,
        lunchAllowance: employee.lunchAllowance,
        transportAllowance: employee.transportAllowance,
        phoneAllowance: employee.phoneAllowance,
        responsibilityAllowance: employee.responsibilityAllowance,
        socialInsuranceNumber: employee.socialInsuranceNumber,
        healthInsuranceProvider: employee.healthInsuranceProvider,
        dependentCount: employee.dependentCount,
        educationLevel: employee.educationLevel,
        major: employee.major,
        emergencyContactName: employee.emergencyContactName,
        emergencyContactRelationship: employee.emergencyContactRelationship,
        emergencyContactPhone: employee.emergencyContactPhone,
        Department: employee.Department,
        JobTitle: employee.JobTitle,
        Manager: employee.Manager
      }
    });
  } catch (err) {
    console.error("Error updating employee:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete employee (hard delete - remove completely)
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findOne({
      where: { id, role: "employee" }
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    const employeeName = employee.name;

    // Delete attendance logs first (foreign key dependency)
    await AttendanceLog.destroy({ where: { userId: id } });
    console.log(`Deleted attendance logs for employee ${id}`);

    // Delete face profiles
    await FaceProfile.destroy({ where: { userId: id } });
    console.log(`Deleted face profiles for employee ${id}`);

    // Delete user
    await employee.destroy();
    console.log(`Employee permanently deleted: ${employeeName} (ID: ${id})`);

    return res.json({
      status: "success",
      message: "Employee deleted successfully",
      deletedEmployee: {
        id: id,
        name: employeeName
      }
    });
  } catch (err) {
    console.error("Error deleting employee:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Permanently delete employee (hard delete)
export const permanentlyDeleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findOne({
      where: { id, role: "employee" }
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    // Delete face profiles first
    await FaceProfile.destroy({ where: { userId: id } });

    // Delete user
    await employee.destroy();

    console.log(`Employee permanently deleted: ${employee.name} (ID: ${id})`);

    return res.json({
      status: "success",
      message: "Employee permanently deleted"
    });
  } catch (err) {
    console.error("Error permanently deleting employee:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Reset employee password
export const resetEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const employee = await User.findOne({
      where: { id, role: "employee" }
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    // Default password if not provided
    const passwordToUse = newPassword || "Password123!";
    const hashedPassword = await bcrypt.hash(passwordToUse, 10);

    await employee.update({ password: hashedPassword });

    console.log(`Password reset for employee: ${employee.name} (ID: ${id})`);

    return res.json({
      status: "success",
      message: "Password reset successfully",
      newPassword: passwordToUse // Return password so admin can share it
    });
  } catch (err) {
    console.error("Error resetting password:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create employee (for single or bulk import)
export const createEmployee = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      employeeCode, 
      baseSalary,
      phoneNumber,
      address,
      permanentAddress,
      temporaryAddress,
      dateOfBirth,
      gender,
      idNumber,
      idIssueDate,
      idIssuePlace,
      personalEmail,
      companyEmail,
      departmentId,
      jobTitleId,
      startDate,
      contractType,
      employmentStatus,
      managerId,
      branchName,
      bankAccount,
      bankName,
      bankBranch,
      taxCode,
      lunchAllowance,
      transportAllowance,
      phoneAllowance,
      responsibilityAllowance,
      socialInsuranceNumber,
      healthInsuranceProvider,
      dependentCount,
      educationLevel,
      major,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      effectiveDate,
      historyNote,
      salaryChangeReason
    } = req.body;

    // Validate required fields
    if (!name || !email || !employeeCode) {
      return res.status(400).json({
        status: "error",
        message: "Name, email, and employee code are required"
      });
    }

    // Check if employee code already exists
    const existingByCode = await User.findOne({
      where: { employeeCode }
    });
    if (existingByCode) {
      return res.status(400).json({
        status: "error",
        message: `Employee code ${employeeCode} already exists`
      });
    }

    // Check if email already exists
    const existingByEmail = await User.findOne({
      where: { email }
    });
    if (existingByEmail) {
      return res.status(400).json({
        status: "error",
        message: `Email ${email} already exists`
      });
    }

    // Generate default password
    const defaultPassword = "Password123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const normalizedEffectiveDate = effectiveDate || startDate || new Date().toISOString().slice(0, 10);
    const changedBy = req.user?.userId ?? req.user?.id ?? null;
    const initialBaseSalary = parseFloat(baseSalary) || 0;
    const initialTotalAllowance =
      (parseFloat(lunchAllowance) || 0) +
      (parseFloat(transportAllowance) || 0) +
      (parseFloat(phoneAllowance) || 0) +
      (parseFloat(responsibilityAllowance) || 0);

    let employee;
    await sequelize.transaction(async (transaction) => {
      employee = await User.create({
        name,
        email,
        employeeCode,
        password: hashedPassword,
        role: "employee",
        isActive: true,
        baseSalary: initialBaseSalary,
        phoneNumber: phoneNumber || null,
        address: address || null,
        permanentAddress: permanentAddress || null,
        temporaryAddress: temporaryAddress || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        idNumber: idNumber || null,
        idIssueDate: idIssueDate || null,
        idIssuePlace: idIssuePlace || null,
        personalEmail: personalEmail || null,
        companyEmail: companyEmail || null,
        departmentId: departmentId || null,
        jobTitleId: jobTitleId || null,
        startDate: startDate || new Date(),
        contractType: contractType || null,
        employmentStatus: employmentStatus || 'active',
        managerId: managerId ? parseInt(managerId) : null,
        branchName: branchName || null,
        bankAccount: bankAccount || null,
        bankName: bankName || null,
        bankBranch: bankBranch || null,
        taxCode: taxCode || null,
        lunchAllowance: parseFloat(lunchAllowance) || 0,
        transportAllowance: parseFloat(transportAllowance) || 0,
        phoneAllowance: parseFloat(phoneAllowance) || 0,
        responsibilityAllowance: parseFloat(responsibilityAllowance) || 0,
        socialInsuranceNumber: socialInsuranceNumber || null,
        healthInsuranceProvider: healthInsuranceProvider || null,
        dependentCount: parseInt(dependentCount) || 0,
        educationLevel: educationLevel || null,
        major: major || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactRelationship: emergencyContactRelationship || null,
        emergencyContactPhone: emergencyContactPhone || null,
        educationLevel: educationLevel || null,
        major: major || null
      }, { transaction });

      await JobHistory.create({
        userId: employee.id,
        fromDepartmentId: null,
        toDepartmentId: employee.departmentId,
        fromJobTitleId: null,
        toJobTitleId: employee.jobTitleId,
        changeType: 'hire',
        effectiveDate: normalizedEffectiveDate,
        notes: historyNote || 'Initial assignment when employee created',
        changedBy,
      }, { transaction });

      await SalaryHistory.create({
        userId: employee.id,
        previousBaseSalary: 0,
        newBaseSalary: initialBaseSalary,
        previousTotalAllowance: 0,
        newTotalAllowance: initialTotalAllowance,
        changeType: 'initial_salary',
        effectiveDate: normalizedEffectiveDate,
        reason: salaryChangeReason || historyNote || 'Initial salary setup when employee created',
        changedBy,
      }, { transaction });
    });

    console.log(`Employee created: ${name} (${employeeCode})`);

    return res.json({
      status: "success",
      message: "Employee created successfully",
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employeeCode,
        baseSalary: employee.baseSalary
      }
    });
  } catch (err) {
    console.error("Error creating employee:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Bulk create employees (for Excel import)
export const bulkCreateEmployees = async (req, res) => {
  try {
    const { employees } = req.body;

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Employees array is required"
      });
    }

    const results = {
      success: [],
      failed: []
    };

    const defaultPassword = "Password123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    for (const empData of employees) {
      try {
        const { employeeCode, name, email, baseSalary } = empData;

        // Validate required fields
        if (!employeeCode || !name || !email) {
          results.failed.push({
            employeeCode: employeeCode || 'N/A',
            name: name || 'N/A',
            reason: "Missing required fields (employeeCode, name, email)"
          });
          continue;
        }

        // Check if employee code already exists
        const existingByCode = await User.findOne({
          where: { employeeCode }
        });
        if (existingByCode) {
          results.failed.push({
            employeeCode,
            name,
            reason: `Employee code ${employeeCode} already exists`
          });
          continue;
        }

        // Check if email already exists
        const existingByEmail = await User.findOne({
          where: { email }
        });
        if (existingByEmail) {
          results.failed.push({
            employeeCode,
            name,
            reason: `Email ${email} already exists`
          });
          continue;
        }

        // Create employee
        const employee = await User.create({
          name,
          email,
          employeeCode,
          password: hashedPassword,
          role: "employee",
          isActive: true,
          baseSalary: parseFloat(baseSalary) || 0
        });

        results.success.push({
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          email: employee.email
        });

        console.log(`Employee created: ${name} (${employeeCode})`);
      } catch (err) {
        results.failed.push({
          employeeCode: empData.employeeCode || 'N/A',
          name: empData.name || 'N/A',
          reason: err.message
        });
        console.error(`Error creating employee ${empData.employeeCode}:`, err);
      }
    }

    return res.json({
      status: "success",
      message: `Created ${results.success.length} employees, ${results.failed.length} failed`,
      results
    });
  } catch (err) {
    console.error("Error in bulk create:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get employee attendance statistics for current month
export const getEmployeeAttendanceStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;

    const employee = await User.findOne({
      where: { id }
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    // Use current month/year if not provided
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const logs = await AttendanceLog.findAll({
      where: {
        userId: id,
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['timestamp', 'ASC']]
    });

    // Calculate statistics (group by local day, based on timestamp + IN/OUT)
    const timeZone = 'Asia/Ho_Chi_Minh';
    const dayKeyOf = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone }); // YYYY-MM-DD
    const dayMap = new Map();

    for (const log of logs) {
      const key = dayKeyOf(log.timestamp);
      if (!dayMap.has(key)) {
        dayMap.set(key, { dateKey: key, checkIn: null, checkOut: null, logs: [] });
      }
      const day = dayMap.get(key);
      day.logs.push(log);

      if (log.type === 'IN') {
        if (!day.checkIn || new Date(log.timestamp) < new Date(day.checkIn.timestamp)) {
          day.checkIn = log;
        }
      } else if (log.type === 'OUT') {
        if (!day.checkOut || new Date(log.timestamp) > new Date(day.checkOut.timestamp)) {
          day.checkOut = log;
        }
      }
    }

    const daily = Array.from(dayMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey)); // oldest -> newest
    const daysWorked = daily.filter(d => !!d.checkIn).length;
    const lateCount = daily.filter(d => d.checkIn?.isLate === true).length;
    const earlyLeaveCount = daily.filter(d => d.checkOut?.isEarlyLeave === true).length;
    const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const absenceCount = Math.max(0, totalDaysInMonth - daysWorked);

    return res.json({
      status: "success",
      month: targetMonth,
      year: targetYear,
      statistics: {
        totalDays: totalDaysInMonth,
        daysWorked,
        lateCount,
        absenceCount,
        earlyLeaveCount,
        recentAttendance: daily.slice(-31).map(d => ({
          date: d.dateKey,
          checkIn: d.checkIn ? d.checkIn.timestamp : null,
          checkOut: d.checkOut ? d.checkOut.timestamp : null,
          flags: {
            isLate: d.checkIn?.isLate === true,
            isEarlyLeave: d.checkOut?.isEarlyLeave === true,
            isOvertime: (d.logs || []).some(l => l.isOvertime === true)
          }
        })),
        rawLogs: logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          type: log.type,
          isLate: log.isLate,
          isEarlyLeave: log.isEarlyLeave,
          isOvertime: log.isOvertime
        }))
      }
    });
  } catch (err) {
    console.error("Error fetching attendance stats:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get detailed employee information
export const getEmployeeDetailedInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const includeHistory = req.query.includeHistory === 'true';

    // Get employee basic info (including password for admin viewing)
    const employee = await User.findOne({
      where: { id },
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: JobTitle, attributes: ['id', 'name'] },
        { model: SalaryGrade, attributes: ['id', 'name', 'baseSalary'] },
        { model: User, as: 'Manager', attributes: ['id', 'name', 'employeeCode', 'email'] },
        // Family / Dependents - include address so frontend can display it
        { 
          model: Dependent, 
          as: 'Dependents', 
          attributes: [
            'id',
            'fullName',
            'relationship',
            'dateOfBirth',
            'gender',
            'idNumber',
            'address',
            'phoneNumber',
            'email',
            'occupation',
            'approvalStatus'
          ] 
        },
        { model: Qualification, as: 'Qualifications', attributes: ['id', 'type', 'name', 'issuedBy', 'issuedDate', 'expiryDate', 'certificateNumber', 'documentPath', 'description', 'approvalStatus'] },
        { model: WorkExperience, as: 'WorkExperiences', attributes: ['id', 'companyName', 'position', 'startDate', 'endDate', 'description', 'responsibilities', 'achievements', 'isCurrent'], order: [['startDate', 'DESC']] }
      ]
      // Note: password is included by default, not excluded
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    // Get attendance statistics for current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Allow caller to override month/year via query params (for the month filter UI)
    const queryMonth = req.query.month ? parseInt(req.query.month) : null;
    const queryYear  = req.query.year  ? parseInt(req.query.year)  : null;
    const hasFilter  = queryMonth && queryYear &&
                       queryMonth >= 1 && queryMonth <= 12 &&
                       queryYear >= 2020;

    // Helper: split free-form address into hamlet / commune / province for frontend forms
    // Examples:
    //  - "Ấp 1 - Cái Bè - Tiền Giang"
    //  - "Ấp 1, Cái Bè, Tiền Giang"
    const parseAddressParts = (address) => {
      if (!address) return { hamlet: "", commune: "", province: "" };
      let parts = address.split("-").map(s => s.trim()).filter(Boolean);
      if (parts.length < 3) {
        parts = address.split(",").map(s => s.trim()).filter(Boolean);
      }
      const hamlet = parts[0] || "";
      const commune = parts[1] || "";
      const province = parts[2] || "";
      return { hamlet, commune, province };
    };

    // Helper: fetch and compute attendance stats for a given year/month
    const timeZone = 'Asia/Ho_Chi_Minh';
    const dayKeyOf = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone }); // YYYY-MM-DD

    const getAttendanceStatsForMonth = async (year, month, isCurrentMonth) => {
      const startDate = new Date(year, month - 1, 1);
      const endDate   = new Date(year, month, 0, 23, 59, 59, 999);

      const logs = await AttendanceLog.findAll({
        where: { userId: id, timestamp: { [Op.between]: [startDate, endDate] } },
        order: [['timestamp', 'ASC']]
      });

      const dayMap = new Map();
      for (const log of logs) {
        const key = dayKeyOf(log.timestamp);
        if (!dayMap.has(key)) {
          dayMap.set(key, { dateKey: key, checkIn: null, checkOut: null, logs: [], isAbsent: false });
        }
        const day = dayMap.get(key);
        day.logs.push(log);
        if (log.type === 'IN') {
          if (!day.checkIn || new Date(log.timestamp) < new Date(day.checkIn.timestamp)) day.checkIn = log;
        } else if (log.type === 'OUT') {
          if (!day.checkOut || new Date(log.timestamp) > new Date(day.checkOut.timestamp)) day.checkOut = log;
        }
      }

      // Build working-day list: Mon–Fri, from start of month up to today (if current) or end of month (if past)
      const daysInMonth = new Date(year, month, 0).getDate();
      const todayKeyLocal = dayKeyOf(currentDate);
      const allWorkingDayKeys = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (isCurrentMonth && key > todayKeyLocal) break; // stop at today for current month
        const dow = new Date(year, month - 1, d).getDay();
        if (dow === 0 || dow === 6) continue; // skip weekends
        allWorkingDayKeys.push(key);
        if (!dayMap.has(key)) {
          dayMap.set(key, { dateKey: key, checkIn: null, checkOut: null, logs: [], isAbsent: true });
        }
      }

      const daily = Array.from(dayMap.values())
        .filter(d => { const dow = new Date(d.dateKey).getDay(); return dow !== 0 && dow !== 6; })
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

      return {
        logs,
        daily,
        workingDaysSoFar: allWorkingDayKeys.length,
        workingDaysCount: daily.filter(d => !!d.checkIn).length,
        lateCount:        daily.filter(d => d.checkIn?.isLate === true).length,
        earlyLeaveCount:  daily.filter(d => d.checkOut?.isEarlyLeave === true).length,
      };
    };

    // If caller specified a month/year filter, use it directly (no fallback needed)
    // Otherwise try current month and fall back to previous if no working days elapsed yet
    let statsMonth, statsYear, statsIsCurrentMonth, stats;

    if (hasFilter) {
      statsMonth = queryMonth;
      statsYear  = queryYear;
      statsIsCurrentMonth = (statsMonth === currentMonth && statsYear === currentYear);
      stats = await getAttendanceStatsForMonth(statsYear, statsMonth, statsIsCurrentMonth);
    } else {
      // Try current month first; fall back to previous month if no working days elapsed yet
      // (e.g. today is the 1st and it's a weekend) or no attendance logs exist for this month
      statsMonth = currentMonth;
      statsYear  = currentYear;
      statsIsCurrentMonth = true;
      stats = await getAttendanceStatsForMonth(currentYear, currentMonth, true);

      if (stats.workingDaysSoFar === 0 || (stats.logs.length === 0 && stats.workingDaysSoFar <= 1)) {
        statsMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        statsYear  = currentMonth === 1 ? currentYear - 1 : currentYear;
        statsIsCurrentMonth = false;
        stats = await getAttendanceStatsForMonth(statsYear, statsMonth, false);
      }
    }

    const { daily, workingDaysSoFar, workingDaysCount, lateCount, earlyLeaveCount } = stats;
    const absentDaysCount = Math.max(0, workingDaysSoFar - workingDaysCount);

    // Get leave requests (all-time, for history & stats)
    const leaveRequests = await LeaveRequest.findAll({
      where: { userId: id },
      order: [['startDate', 'DESC']],
      limit: 10
    });

    // Get leave requests that overlap with the displayed attendance month
    const statsMonthStart = new Date(statsYear, statsMonth - 1, 1);
    const statsMonthEnd   = new Date(statsYear, statsMonth, 0); // last day of month
    const monthLeaveRequests = await LeaveRequest.findAll({
      where: {
        userId: id,
        startDate: { [Op.lte]: statsMonthEnd },
        endDate:   { [Op.gte]: statsMonthStart }
      },
      order: [['startDate', 'ASC']]
    });

    // Get salary history
    const salaries = await Salary.findAll({
      where: { userId: id },
      order: [['year', 'DESC'], ['month', 'DESC']],
      limit: 12
    });

    let jobHistories = [];
    let salaryChangeHistories = [];

    if (includeHistory) {
      [jobHistories, salaryChangeHistories] = await Promise.all([
        JobHistory.findAll({
          where: { userId: id },
          include: [
            { model: Department, as: 'FromDepartment', attributes: ['id', 'name'] },
            { model: Department, as: 'ToDepartment', attributes: ['id', 'name'] },
            { model: JobTitle, as: 'FromJobTitle', attributes: ['id', 'name'] },
            { model: JobTitle, as: 'ToJobTitle', attributes: ['id', 'name'] },
            { model: User, as: 'ChangedByUser', attributes: ['id', 'name', 'employeeCode', 'role'] },
          ],
          order: [['effectiveDate', 'DESC'], ['createdAt', 'DESC']],
          limit: 20,
        }),
        SalaryHistory.findAll({
          where: { userId: id },
          include: [
            { model: User, as: 'ChangedByUser', attributes: ['id', 'name', 'employeeCode', 'role'] },
          ],
          order: [['effectiveDate', 'DESC'], ['createdAt', 'DESC']],
          limit: 20,
        })
      ]);
    }

    // Derive hamlet / commune / province from employee address (used by TK1-TS Appendix on frontend)
    const addressSource =
      employee.address || employee.permanentAddress || employee.temporaryAddress || "";
    const addressParts = parseAddressParts(addressSource);

    return res.json({
      status: "success",
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employeeCode,
        role: employee.role,
        phoneNumber: employee.phoneNumber,
        address: employee.address,
        permanentAddress: employee.permanentAddress,
        temporaryAddress: employee.temporaryAddress,
        addressHamlet: addressParts.hamlet,
        addressCommune: addressParts.commune,
        addressProvince: addressParts.province,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        idNumber: employee.idNumber,
        idIssueDate: employee.idIssueDate,
        idIssuePlace: employee.idIssuePlace,
        personalEmail: employee.personalEmail,
        companyEmail: employee.companyEmail,
        startDate: employee.startDate,
        baseSalary: employee.baseSalary,
        isActive: employee.isActive,
        departmentId: employee.departmentId,
        jobTitleId: employee.jobTitleId,
        department: employee.Department?.name || 'N/A',
        jobTitle: employee.JobTitle?.name || 'N/A',
        salaryGrade: employee.SalaryGrade?.name || 'N/A',
        contractType: employee.contractType,
        employmentStatus: employee.employmentStatus,
        managerId: employee.managerId,
        branchName: employee.branchName,
        Manager: employee.Manager ? { id: employee.Manager.id, name: employee.Manager.name, employeeCode: employee.Manager.employeeCode } : null,
        Department: employee.Department,
        JobTitle: employee.JobTitle,
        SalaryGrade: employee.SalaryGrade,
        bankAccount: employee.bankAccount,
        bankName: employee.bankName,
        bankBranch: employee.bankBranch,
        taxCode: employee.taxCode,
        contractType: employee.contractType,
        employmentStatus: employee.employmentStatus,
        managerId: employee.managerId,
        branchName: employee.branchName,
        lunchAllowance: employee.lunchAllowance,
        transportAllowance: employee.transportAllowance,
        phoneAllowance: employee.phoneAllowance,
        responsibilityAllowance: employee.responsibilityAllowance,
        socialInsuranceNumber: employee.socialInsuranceNumber,
        healthInsuranceProvider: employee.healthInsuranceProvider,
        dependentCount: employee.dependentCount,
        educationLevel: employee.educationLevel,
        major: employee.major,
        emergencyContactName: employee.emergencyContactName,
        emergencyContactRelationship: employee.emergencyContactRelationship,
        emergencyContactPhone: employee.emergencyContactPhone,
        // password is intentionally omitted (stored as bcrypt hash)
        attendanceStats: {
          month: statsMonth,
          year: statsYear,
          isFallback: !statsIsCurrentMonth, // true when showing previous month's data
          totalDays: workingDaysSoFar,   // Mon-Fri working days in the displayed month
          totalDaysWorked: workingDaysCount,
          totalLate: lateCount,
          totalAbsent: absentDaysCount,  // working days with no check-in
          totalEarlyLeave: earlyLeaveCount
        },
        recentAttendance: daily.slice(0, 62).map(d => {
          // Check if this absent day is covered by an approved leave request
          let leaveInfo = null;
          if (d.isAbsent) {
            const dayDate = new Date(d.dateKey);
            const covering = monthLeaveRequests.find(lr => {
              if (lr.status !== 'approved') return false;
              const s = new Date(lr.startDate);
              const e = new Date(lr.endDate);
              return dayDate >= s && dayDate <= e;
            });
            if (covering) {
              leaveInfo = {
                id: covering.id,
                type: covering.type,
                startDate: covering.startDate,
                endDate: covering.endDate,
                days: covering.days,
                reason: covering.reason,
                status: covering.status
              };
            }
          }
          return {
            date: d.dateKey, // YYYY-MM-DD
            checkIn: d.checkIn ? d.checkIn.timestamp : null,
            checkOut: d.checkOut ? d.checkOut.timestamp : null,
            isAbsent: d.isAbsent === true,
            leaveInfo,
            flags: {
              isLate: d.checkIn?.isLate === true,
              isEarlyLeave: d.checkOut?.isEarlyLeave === true,
              isOvertime: (d.logs || []).some(l => l.isOvertime === true)
            },
            status: d.isAbsent
              ? (leaveInfo ? 'Nghỉ phép' : 'Vắng')
              : d.checkIn?.isLate ? 'Muộn' : d.checkOut?.isEarlyLeave ? 'Về sớm' : 'Bình thường'
          };
        }),
        leaveHistory: leaveRequests.map(leave => ({
          id: leave.id,
          type: leave.type,
          startDate: new Date(leave.startDate).toLocaleDateString('vi-VN'),
          endDate: new Date(leave.endDate).toLocaleDateString('vi-VN'),
          days: leave.days,
          status: leave.status,
          reason: leave.reason
        })),
        monthLeaveRequests: monthLeaveRequests.map(leave => ({
          id: leave.id,
          type: leave.type,
          startDate: leave.startDate,   // raw DATEONLY string YYYY-MM-DD
          endDate: leave.endDate,
          days: leave.days,
          status: leave.status,
          reason: leave.reason
        })),
        leaveStats: {
          totalDaysUsed: leaveRequests.filter(l => l.status === 'approved').reduce((sum, l) => sum + (l.days || 0), 0),
          totalDaysRemaining: 12 - (leaveRequests.filter(l => l.status === 'approved').reduce((sum, l) => sum + (l.days || 0), 0) || 0)
        },
        salaryHistory: salaries.map(salary => ({
          id: salary.id,
          month: salary.month,
          year: salary.year,
          baseSalary: salary.baseSalary,
          bonus: salary.bonus || 0,
          deduction: salary.deduction || 0,
          finalSalary: salary.finalSalary,
          status: salary.status
        })),
        jobHistory: jobHistories.map(history => ({
          id: history.id,
          fromDepartmentId: history.fromDepartmentId,
          toDepartmentId: history.toDepartmentId,
          fromDepartmentName: history.FromDepartment?.name || null,
          toDepartmentName: history.ToDepartment?.name || null,
          fromJobTitleId: history.fromJobTitleId,
          toJobTitleId: history.toJobTitleId,
          fromJobTitleName: history.FromJobTitle?.name || null,
          toJobTitleName: history.ToJobTitle?.name || null,
          changeType: history.changeType,
          effectiveDate: history.effectiveDate,
          notes: history.notes,
          changedBy: history.ChangedByUser
            ? {
                id: history.ChangedByUser.id,
                name: history.ChangedByUser.name,
                employeeCode: history.ChangedByUser.employeeCode,
                role: history.ChangedByUser.role,
              }
            : null,
        })),
        salaryChangeHistory: salaryChangeHistories.map(history => ({
          id: history.id,
          previousBaseSalary: history.previousBaseSalary,
          newBaseSalary: history.newBaseSalary,
          previousTotalAllowance: history.previousTotalAllowance,
          newTotalAllowance: history.newTotalAllowance,
          changeType: history.changeType,
          effectiveDate: history.effectiveDate,
          reason: history.reason,
          changedBy: history.ChangedByUser
            ? {
                id: history.ChangedByUser.id,
                name: history.ChangedByUser.name,
                employeeCode: history.ChangedByUser.employeeCode,
                role: history.ChangedByUser.role,
              }
            : null,
        })),
        // Family / Dependents info for frontend (EmployeeProfileModal - Family tab)
        dependents: employee.Dependents
          ? employee.Dependents.map(dep => ({
          id: dep.id,
          fullName: dep.fullName,
          relationship: dep.relationship,
          dateOfBirth: dep.dateOfBirth,
              gender: dep.gender,
              idNumber: dep.idNumber,
              address: dep.address,
              phoneNumber: dep.phoneNumber,
              email: dep.email
            }))
          : [],
        // Qualifications / Certificates for frontend (Qualifications tab)
        qualifications: employee.Qualifications
          ? employee.Qualifications.map(qual => ({
          id: qual.id,
          type: qual.type,
          name: qual.name,
          issuedBy: qual.issuedBy,
              issuedDate: qual.issuedDate,
              expiryDate: qual.expiryDate,
              certificateNumber: qual.certificateNumber,
              description: qual.description
            }))
          : [],
        WorkExperiences: employee.WorkExperiences || []
      }
    });
  } catch (err) {
    console.error("Error fetching employee details:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

export const getEmployeeHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const historyType = (req.query.historyType || 'both').toLowerCase();
    const fromDate = req.query.fromDate || null;
    const toDate = req.query.toDate || null;
    const changeType = req.query.changeType || null;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '10', 10), 1), 100);
    const offset = (page - 1) * pageSize;

    const employee = await User.findOne({
      where: { id },
      attributes: ['id'],
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: JobTitle, attributes: ['id', 'name'] },
      ],
    });
    if (!employee) {
      return res.status(404).json({ status: 'error', message: 'Employee not found' });
    }

    const baseWhere = { userId: id };
    if (changeType) baseWhere.changeType = changeType;
    if (fromDate || toDate) {
      baseWhere.effectiveDate = {};
      if (fromDate) baseWhere.effectiveDate[Op.gte] = fromDate;
      if (toDate) baseWhere.effectiveDate[Op.lte] = toDate;
    }

    const response = { status: 'success', historyType, pagination: { page, pageSize } };

    if (historyType === 'job' || historyType === 'both') {
      const { rows, count } = await JobHistory.findAndCountAll({
        where: baseWhere,
        include: [
          { model: Department, as: 'FromDepartment', attributes: ['id', 'name'] },
          { model: Department, as: 'ToDepartment', attributes: ['id', 'name'] },
          { model: JobTitle, as: 'FromJobTitle', attributes: ['id', 'name'] },
          { model: JobTitle, as: 'ToJobTitle', attributes: ['id', 'name'] },
          { model: User, as: 'ChangedByUser', attributes: ['id', 'name', 'employeeCode', 'role'] },
        ],
        order: [['effectiveDate', 'DESC'], ['createdAt', 'DESC']],
        offset,
        limit: pageSize,
      });

      const currentDepartmentName = employee.Department?.name || null;
      const currentJobTitleName = employee.JobTitle?.name || null;

      response.jobHistory = rows.map((history) => {
        let fromDepartmentName = history.FromDepartment?.name || null;
        let toDepartmentName = history.ToDepartment?.name || null;
        let fromJobTitleName = history.FromJobTitle?.name || null;
        let toJobTitleName = history.ToJobTitle?.name || null;

        // promotion/demotion: department is unchanged.
        if (history.changeType === 'promotion' || history.changeType === 'demotion') {
          const stableDept = fromDepartmentName || toDepartmentName;
          if (stableDept) {
            fromDepartmentName = stableDept;
            toDepartmentName = stableDept;
          }
        }

        // transfer: job title is unchanged.
        if (history.changeType === 'transfer') {
          const stableTitle = fromJobTitleName || toJobTitleName;
          if (stableTitle) {
            fromJobTitleName = stableTitle;
            toJobTitleName = stableTitle;
          }
        }

        // If IDs are equal, normalize both sides from whichever side is available.
        if (history.fromDepartmentId != null && history.fromDepartmentId === history.toDepartmentId) {
          const stableDept = fromDepartmentName || toDepartmentName;
          if (stableDept) {
            fromDepartmentName = stableDept;
            toDepartmentName = stableDept;
          }
        }

        if (history.fromJobTitleId != null && history.fromJobTitleId === history.toJobTitleId) {
          const stableTitle = fromJobTitleName || toJobTitleName;
          if (stableTitle) {
            fromJobTitleName = stableTitle;
            toJobTitleName = stableTitle;
          }
        }

        // Final fallback: keep User Detail consistent with current Work Information when history side is missing.
        if (!fromDepartmentName) fromDepartmentName = toDepartmentName || currentDepartmentName;
        if (!toDepartmentName) toDepartmentName = fromDepartmentName || currentDepartmentName;
        if (!fromJobTitleName) fromJobTitleName = toJobTitleName || currentJobTitleName;
        if (!toJobTitleName) toJobTitleName = fromJobTitleName || currentJobTitleName;

        return {
          id: history.id,
          fromDepartmentId: history.fromDepartmentId,
          toDepartmentId: history.toDepartmentId,
          fromDepartmentName,
          toDepartmentName,
          fromJobTitleId: history.fromJobTitleId,
          toJobTitleId: history.toJobTitleId,
          fromJobTitleName,
          toJobTitleName,
          changeType: history.changeType,
          effectiveDate: history.effectiveDate,
          notes: history.notes,
          changedBy: history.ChangedByUser
            ? {
                id: history.ChangedByUser.id,
                name: history.ChangedByUser.name,
                employeeCode: history.ChangedByUser.employeeCode,
                role: history.ChangedByUser.role,
              }
            : null,
        };
      });
      response.jobPagination = { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
    }

    if (historyType === 'salary' || historyType === 'both') {
      const { rows, count } = await SalaryHistory.findAndCountAll({
        where: baseWhere,
        include: [
          { model: User, as: 'ChangedByUser', attributes: ['id', 'name', 'employeeCode', 'role'] },
        ],
        order: [['effectiveDate', 'DESC'], ['createdAt', 'DESC']],
        offset,
        limit: pageSize,
      });

      response.salaryChangeHistory = rows.map((history) => ({
        id: history.id,
        previousBaseSalary: history.previousBaseSalary,
        newBaseSalary: history.newBaseSalary,
        previousTotalAllowance: history.previousTotalAllowance,
        newTotalAllowance: history.newTotalAllowance,
        changeType: history.changeType,
        effectiveDate: history.effectiveDate,
        reason: history.reason,
        changedBy: history.ChangedByUser
          ? {
              id: history.ChangedByUser.id,
              name: history.ChangedByUser.name,
              employeeCode: history.ChangedByUser.employeeCode,
              role: history.ChangedByUser.role,
            }
          : null,
      }));
      response.salaryPagination = { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
    }

    return res.json(response);
  } catch (err) {
    console.error('Error fetching employee history:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, reason } = req.body || {};
    const actorId = req.user?.userId ?? req.user?.id;
    const validRoles = ["manager", "hr", "accountant", "supervisor", "employee"];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ status: "error", message: "Invalid role" });
    }

    const targetUser = await User.findByPk(id, {
      attributes: ["id", "name", "email", "employeeCode", "role", "isActive"],
    });

    if (!targetUser) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    if (Number(targetUser.id) === Number(actorId)) {
      return res.status(400).json({ status: "error", message: "Cannot change your own role" });
    }

    if (targetUser.role === role) {
      return res.json({
        status: "success",
        message: "Role unchanged",
        user: targetUser,
      });
    }

    const oldRole = targetUser.role;
    await sequelize.transaction(async (transaction) => {
      await targetUser.update({ role }, { transaction });
      await RoleChangeAudit.create(
        {
          userId: targetUser.id,
          changedBy: actorId,
          oldRole,
          newRole: role,
          reason: reason || null,
          ipAddress: req.ip || null,
          userAgent: req.get("user-agent") || null,
        },
        { transaction }
      );
    });

    return res.json({
      status: "success",
      message: "User role updated successfully",
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        employeeCode: targetUser.employeeCode,
        role,
        isActive: targetUser.isActive,
      },
    });
  } catch (err) {
    console.error("Error updating user role:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

export const getRoleAuditLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || "20", 10), 1), 100);
    const offset = (page - 1) * pageSize;
    const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;

    const where = {};
    if (Number.isInteger(userId)) where.userId = userId;

    const { rows, count } = await RoleChangeAudit.findAndCountAll({
      where,
      include: [
        { model: User, as: "TargetUser", attributes: ["id", "name", "email", "employeeCode", "role"] },
        { model: User, as: "ChangedByUser", attributes: ["id", "name", "email", "employeeCode", "role"] },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit: pageSize,
    });

    return res.json({
      status: "success",
      logs: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / pageSize)),
      },
    });
  } catch (err) {
    console.error("Error fetching role audit logs:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

