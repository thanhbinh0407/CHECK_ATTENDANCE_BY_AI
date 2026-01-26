import Department from "../models/pg/Department.js";
import { Op } from "sequelize";

// Get all departments
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']]
    });
    return res.json({
      status: "success",
      departments
    });
  } catch (err) {
    console.error("Error fetching departments:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get department by ID
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findByPk(id);
    
    if (!department) {
      return res.status(404).json({
        status: "error",
        message: "Department not found"
      });
    }

    return res.json({
      status: "success",
      department
    });
  } catch (err) {
    console.error("Error fetching department:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create department
export const createDepartment = async (req, res) => {
  try {
    const { code, name, description, managerId } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        status: "error",
        message: "Code and name are required"
      });
    }

    // Check if code already exists
    const existing = await Department.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({
        status: "error",
        message: "Department code already exists"
      });
    }

    const department = await Department.create({
      code,
      name,
      description,
      managerId,
      isActive: true
    });

    return res.json({
      status: "success",
      message: "Department created successfully",
      department
    });
  } catch (err) {
    console.error("Error creating department:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update department
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description, managerId, isActive } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        status: "error",
        message: "Department not found"
      });
    }

    // Check if code is being changed and already exists
    if (code && code !== department.code) {
      const existing = await Department.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({
          status: "error",
          message: "Department code already exists"
        });
      }
    }

    await department.update({
      code: code || department.code,
      name: name || department.name,
      description: description !== undefined ? description : department.description,
      managerId: managerId !== undefined ? managerId : department.managerId,
      isActive: isActive !== undefined ? isActive : department.isActive
    });

    return res.json({
      status: "success",
      message: "Department updated successfully",
      department
    });
  } catch (err) {
    console.error("Error updating department:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete department
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        status: "error",
        message: "Department not found"
      });
    }

    await department.destroy();

    return res.json({
      status: "success",
      message: "Department deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting department:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

