import User from "../models/pg/User.js";
import FaceProfile from "../models/pg/FaceProfile.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
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
