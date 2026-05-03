import JobTitle from "../models/pg/JobTitle.js";
import { Op } from "sequelize";

// Get all job titles
export const getAllJobTitles = async (req, res) => {
  try {
    const jobTitles = await JobTitle.findAll({
      order: [['name', 'ASC']]
    });
    return res.json({
      status: "success",
      jobTitles
    });
  } catch (err) {
    console.error("Error fetching job titles:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get job title by ID
export const getJobTitleById = async (req, res) => {
  try {
    const { id } = req.params;
    const jobTitle = await JobTitle.findByPk(id);
    
    if (!jobTitle) {
      return res.status(404).json({
        status: "error",
        message: "Job title not found"
      });
    }

    return res.json({
      status: "success",
      jobTitle
    });
  } catch (err) {
    console.error("Error fetching job title:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create job title
export const createJobTitle = async (req, res) => {
  try {
    const { code, name, description, level, permissions, baseSalaryMin, baseSalaryMax } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        status: "error",
        message: "Code and name are required"
      });
    }

    // Check if code already exists
    const existing = await JobTitle.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({
        status: "error",
        message: "Job title code already exists"
      });
    }

    const jobTitle = await JobTitle.create({
      code,
      name,
      description,
      level,
      permissions: permissions || [],
      baseSalaryMin: baseSalaryMin || 0,
      baseSalaryMax: baseSalaryMax || 0,
      isActive: true
    });

    return res.json({
      status: "success",
      message: "Job title created successfully",
      jobTitle
    });
  } catch (err) {
    console.error("Error creating job title:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update job title
export const updateJobTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description, level, permissions, baseSalaryMin, baseSalaryMax, isActive } = req.body;

    const jobTitle = await JobTitle.findByPk(id);
    if (!jobTitle) {
      return res.status(404).json({
        status: "error",
        message: "Job title not found"
      });
    }

    // Check if code is being changed and already exists
    if (code && code !== jobTitle.code) {
      const existing = await JobTitle.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({
          status: "error",
          message: "Job title code already exists"
        });
      }
    }

    await jobTitle.update({
      code: code || jobTitle.code,
      name: name || jobTitle.name,
      description: description !== undefined ? description : jobTitle.description,
      level: level !== undefined ? level : jobTitle.level,
      permissions: permissions !== undefined ? permissions : jobTitle.permissions,
      baseSalaryMin: baseSalaryMin !== undefined ? baseSalaryMin : jobTitle.baseSalaryMin,
      baseSalaryMax: baseSalaryMax !== undefined ? baseSalaryMax : jobTitle.baseSalaryMax,
      isActive: isActive !== undefined ? isActive : jobTitle.isActive
    });

    return res.json({
      status: "success",
      message: "Job title updated successfully",
      jobTitle
    });
  } catch (err) {
    console.error("Error updating job title:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete job title
export const deleteJobTitle = async (req, res) => {
  try {
    const { id } = req.params;

    const jobTitle = await JobTitle.findByPk(id);
    if (!jobTitle) {
      return res.status(404).json({
        status: "error",
        message: "Job title not found"
      });
    }

    await jobTitle.destroy();

    return res.json({
      status: "success",
      message: "Job title deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting job title:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

