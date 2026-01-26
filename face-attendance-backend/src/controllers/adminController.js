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
import bcrypt from "bcryptjs";
import { Op } from "sequelize";

// Get all employees
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.findAll({
      where: { role: "employee" },
      attributes: { exclude: ["password"] },
      include: [{ 
        model: FaceProfile,
        as: "FaceProfiles",
        attributes: ["id", "createdAt"],
        required: false
      }]
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
    const { name, email, employeeCode, isActive, baseSalary } = req.body;

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

    await employee.update(updateData);

    console.log(`Employee updated: ${employee.name} (ID: ${id})${baseSalary !== undefined ? `, baseSalary: ${updateData.baseSalary}` : ''}`);

    return res.json({
      status: "success",
      message: "Employee updated",
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employeeCode,
        role: employee.role,
        isActive: employee.isActive,
        baseSalary: employee.baseSalary
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

    // Get employee basic info
    const employee = await User.findOne({
      where: { id, role: "employee" },
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: JobTitle, attributes: ['id', 'name'] },
        { model: SalaryGrade, attributes: ['id', 'name', 'baseSalary'] },
        { model: Dependent, as: 'Dependents', attributes: ['id', 'fullName', 'relationship', 'dateOfBirth', 'gender'] },
        { model: Qualification, as: 'Qualifications', attributes: ['id', 'type', 'name', 'issuedBy', 'issuedDate'] }
      ]
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
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        joiningDate: employee.joiningDate,
        baseSalary: employee.baseSalary,
        isActive: employee.isActive,
        department: employee.Department?.name || 'N/A',
        jobTitle: employee.JobTitle?.name || 'N/A',
        salaryGrade: employee.SalaryGrade?.name || 'N/A',
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

