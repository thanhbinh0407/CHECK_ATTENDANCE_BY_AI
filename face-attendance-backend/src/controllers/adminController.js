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
import bcrypt from "bcryptjs";
import { Op } from "sequelize";

// Get all employees
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.findAll({
      where: { role: "employee" },
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

// Get employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await User.findOne({
      where: { id, role: "employee" },
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
      where: { id, role: "employee" },
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
        password: employee.password,
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
      emergencyContactPhone
    } = req.body;

    const employee = await User.findOne({
      where: { id, role: "employee" }
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
    if (gender !== undefined) updateData.gender = gender || null;
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
    if (idNumber !== undefined) updateData.idNumber = idNumber;
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
    if (educationLevel !== undefined) updateData.educationLevel = educationLevel || null;
    if (major !== undefined) updateData.major = major;
    if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName;
    if (emergencyContactRelationship !== undefined) updateData.emergencyContactRelationship = emergencyContactRelationship;
    if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone;

    await employee.update(updateData);

    // Reload with associations
    await employee.reload({
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: JobTitle, attributes: ['id', 'name'] },
        { model: User, as: 'Manager', attributes: ['id', 'name', 'employeeCode', 'email'] }
      ]
    });

    console.log(`Employee updated: ${employee.name} (ID: ${id})`);

    return res.json({
      status: "success",
      message: "Employee updated successfully",
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
      emergencyContactPhone
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

    // Create employee
    const employee = await User.create({
      name,
      email,
      employeeCode,
      password: hashedPassword,
      role: "employee",
      isActive: true,
      baseSalary: parseFloat(baseSalary) || 0,
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
      where: { id, role: "employee" }
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

    // Calculate statistics
    const lateCount = logs.filter(log => log.isLate === true).length;
    const absenceCount = 0; // TODO: Calculate based on working days vs attendance
    const earlyLeaveCount = logs.filter(log => log.isEarlyLeave === true).length;

    return res.json({
      status: "success",
      month: targetMonth,
      year: targetYear,
      statistics: {
        totalDays: logs.length,
        lateCount,
        absenceCount,
        earlyLeaveCount,
        logs: logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          type: log.type,
          isLate: log.isLate,
          isEarlyLeave: log.isEarlyLeave
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

    // Get employee basic info (including password for admin viewing)
    const employee = await User.findOne({
      where: { id, role: "employee" },
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: JobTitle, attributes: ['id', 'name'] },
        { model: SalaryGrade, attributes: ['id', 'name', 'baseSalary'] },
        { model: User, as: 'Manager', attributes: ['id', 'name', 'employeeCode', 'email'] },
        { model: Dependent, as: 'Dependents', attributes: ['id', 'fullName', 'relationship', 'dateOfBirth', 'gender', 'idNumber', 'phoneNumber', 'email', 'occupation', 'approvalStatus'] },
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

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const attendanceLogs = await AttendanceLog.findAll({
      where: {
        userId: id,
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // Get leave requests
    const leaveRequests = await LeaveRequest.findAll({
      where: {
        userId: id
      },
      order: [['startDate', 'DESC']],
      limit: 10
    });

    // Get salary history
    const salaries = await Salary.findAll({
      where: {
        userId: id
      },
      order: [['year', 'DESC'], ['month', 'DESC']],
      limit: 12
    });

    // Calculate attendance statistics
    const workingDaysCount = attendanceLogs.length;
    const lateCount = attendanceLogs.filter(log => log.isLate === true).length;
    const earlyLeaveCount = attendanceLogs.filter(log => log.isEarlyLeave === true).length;

    return res.json({
      status: "success",
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employeeCode,
        phoneNumber: employee.phoneNumber,
        address: employee.address,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        idNumber: employee.idNumber,
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
        taxCode: employee.taxCode,
        password: employee.password, // Include password for admin viewing
        attendanceStats: {
          totalDaysWorked: workingDaysCount,
          totalLate: lateCount,
          totalAbsent: 0,
          totalEarlyLeave: earlyLeaveCount
        },
        recentAttendance: attendanceLogs.map(log => ({
          date: new Date(log.createdAt).toLocaleDateString('vi-VN'),
          checkIn: log.createdAt ? new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
          checkOut: log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
          status: log.isLate ? 'Muộn' : log.isEarlyLeave ? 'Về sớm' : 'Bình thường'
        })),
        leaveHistory: leaveRequests.map(leave => ({
          id: leave.id,
          type: leave.type,
          startDate: new Date(leave.startDate).toLocaleDateString('vi-VN'),
          endDate: new Date(leave.endDate).toLocaleDateString('vi-VN'),
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
        dependents: employee.Dependents ? employee.Dependents.map(dep => ({
          id: dep.id,
          fullName: dep.fullName,
          relationship: dep.relationship,
          dateOfBirth: dep.dateOfBirth,
          gender: dep.gender
        })) : [],
        qualifications: employee.Qualifications ? employee.Qualifications.map(qual => ({
          id: qual.id,
          type: qual.type,
          name: qual.name,
          issuedBy: qual.issuedBy,
          issuedDate: qual.issuedDate
        })) : []
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

