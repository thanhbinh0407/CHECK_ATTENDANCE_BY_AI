import InsuranceConfig from "../models/pg/InsuranceConfig.js";
import { Op } from "sequelize";

// Get all insurance configs
export const getInsuranceConfigs = async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const configs = await InsuranceConfig.findAll({
      where,
      order: [["effectiveDate", "DESC"], ["createdAt", "DESC"]]
    });

    return res.json({
      status: "success",
      configs
    });
  } catch (err) {
    console.error("Error fetching insurance configs:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get active insurance config
export const getActiveInsuranceConfig = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const config = await InsuranceConfig.findOne({
      where: {
        isActive: true,
        effectiveDate: { [Op.lte]: today },
        [Op.or]: [
          { expiryDate: null },
          { expiryDate: { [Op.gte]: today } }
        ]
      },
      order: [["effectiveDate", "DESC"]]
    });

    if (!config) {
      return res.status(404).json({
        status: "error",
        message: "No active insurance config found"
      });
    }

    return res.json({
      status: "success",
      config
    });
  } catch (err) {
    console.error("Error fetching active insurance config:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get insurance config by ID
export const getInsuranceConfigById = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await InsuranceConfig.findByPk(id);

    if (!config) {
      return res.status(404).json({
        status: "error",
        message: "Insurance config not found"
      });
    }

    return res.json({
      status: "success",
      config
    });
  } catch (err) {
    console.error("Error fetching insurance config:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create insurance config
export const createInsuranceConfig = async (req, res) => {
  try {
    const {
      name,
      effectiveDate,
      expiryDate,
      employeeSocialInsuranceRate,
      employerSocialInsuranceRate,
      employeeHealthInsuranceRate,
      employerHealthInsuranceRate,
      employeeUnemploymentInsuranceRate,
      employerUnemploymentInsuranceRate,
      maxInsuranceSalary,
      minInsuranceSalary,
      isActive,
      description
    } = req.body;

    if (!name || !effectiveDate) {
      return res.status(400).json({
        status: "error",
        message: "Name and effective date are required"
      });
    }

    // If setting as active, deactivate all other configs
    if (isActive) {
      await InsuranceConfig.update(
        { isActive: false },
        { where: { isActive: true } }
      );
    }

    const config = await InsuranceConfig.create({
      name,
      effectiveDate,
      expiryDate: expiryDate || null,
      employeeSocialInsuranceRate: parseFloat(employeeSocialInsuranceRate) || 10.5,
      employerSocialInsuranceRate: parseFloat(employerSocialInsuranceRate) || 21.5,
      employeeHealthInsuranceRate: parseFloat(employeeHealthInsuranceRate) || 1.5,
      employerHealthInsuranceRate: parseFloat(employerHealthInsuranceRate) || 3.0,
      employeeUnemploymentInsuranceRate: parseFloat(employeeUnemploymentInsuranceRate) || 1.0,
      employerUnemploymentInsuranceRate: parseFloat(employerUnemploymentInsuranceRate) || 1.0,
      maxInsuranceSalary: maxInsuranceSalary ? parseFloat(maxInsuranceSalary) : null,
      minInsuranceSalary: minInsuranceSalary ? parseFloat(minInsuranceSalary) : null,
      isActive: isActive !== undefined ? isActive : true,
      description: description || null
    });

    return res.json({
      status: "success",
      message: "Insurance config created successfully",
      config
    });
  } catch (err) {
    console.error("Error creating insurance config:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update insurance config
export const updateInsuranceConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      effectiveDate,
      expiryDate,
      employeeSocialInsuranceRate,
      employerSocialInsuranceRate,
      employeeHealthInsuranceRate,
      employerHealthInsuranceRate,
      employeeUnemploymentInsuranceRate,
      employerUnemploymentInsuranceRate,
      maxInsuranceSalary,
      minInsuranceSalary,
      isActive,
      description
    } = req.body;

    const config = await InsuranceConfig.findByPk(id);
    if (!config) {
      return res.status(404).json({
        status: "error",
        message: "Insurance config not found"
      });
    }

    // If setting as active, deactivate all other configs
    if (isActive && !config.isActive) {
      await InsuranceConfig.update(
        { isActive: false },
        { where: { isActive: true, id: { [Op.ne]: id } } }
      );
    }

    await config.update({
      name: name || config.name,
      effectiveDate: effectiveDate || config.effectiveDate,
      expiryDate: expiryDate !== undefined ? (expiryDate || null) : config.expiryDate,
      employeeSocialInsuranceRate: employeeSocialInsuranceRate !== undefined 
        ? parseFloat(employeeSocialInsuranceRate) 
        : config.employeeSocialInsuranceRate,
      employerSocialInsuranceRate: employerSocialInsuranceRate !== undefined 
        ? parseFloat(employerSocialInsuranceRate) 
        : config.employerSocialInsuranceRate,
      employeeHealthInsuranceRate: employeeHealthInsuranceRate !== undefined 
        ? parseFloat(employeeHealthInsuranceRate) 
        : config.employeeHealthInsuranceRate,
      employerHealthInsuranceRate: employerHealthInsuranceRate !== undefined 
        ? parseFloat(employerHealthInsuranceRate) 
        : config.employerHealthInsuranceRate,
      employeeUnemploymentInsuranceRate: employeeUnemploymentInsuranceRate !== undefined 
        ? parseFloat(employeeUnemploymentInsuranceRate) 
        : config.employeeUnemploymentInsuranceRate,
      employerUnemploymentInsuranceRate: employerUnemploymentInsuranceRate !== undefined 
        ? parseFloat(employerUnemploymentInsuranceRate) 
        : config.employerUnemploymentInsuranceRate,
      maxInsuranceSalary: maxInsuranceSalary !== undefined 
        ? (maxInsuranceSalary ? parseFloat(maxInsuranceSalary) : null) 
        : config.maxInsuranceSalary,
      minInsuranceSalary: minInsuranceSalary !== undefined 
        ? (minInsuranceSalary ? parseFloat(minInsuranceSalary) : null) 
        : config.minInsuranceSalary,
      isActive: isActive !== undefined ? isActive : config.isActive,
      description: description !== undefined ? description : config.description
    });

    return res.json({
      status: "success",
      message: "Insurance config updated successfully",
      config
    });
  } catch (err) {
    console.error("Error updating insurance config:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete insurance config
export const deleteInsuranceConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await InsuranceConfig.findByPk(id);

    if (!config) {
      return res.status(404).json({
        status: "error",
        message: "Insurance config not found"
      });
    }

    await config.destroy();

    return res.json({
      status: "success",
      message: "Insurance config deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting insurance config:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

