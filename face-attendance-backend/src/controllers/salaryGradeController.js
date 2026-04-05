import SalaryGrade from "../models/pg/SalaryGrade.js";
import User from "../models/pg/User.js";
import { recalculatePendingSalariesForUsers } from "../services/salaryCalculationService.js";

// Get all salary grades
export const getSalaryGrades = async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const grades = await SalaryGrade.findAll({
      where,
      order: [["level", "ASC"], ["code", "ASC"]]
    });

    return res.json({
      status: "success",
      grades
    });
  } catch (err) {
    console.error("Error fetching salary grades:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get salary grade by ID
export const getSalaryGradeById = async (req, res) => {
  try {
    const { id } = req.params;
    const grade = await SalaryGrade.findByPk(id);

    if (!grade) {
      return res.status(404).json({
        status: "error",
        message: "Salary grade not found"
      });
    }

    return res.json({
      status: "success",
      grade
    });
  } catch (err) {
    console.error("Error fetching salary grade:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create salary grade
export const createSalaryGrade = async (req, res) => {
  try {
    const { code, name, level, baseSalary, description, isActive, minYearsOfService } = req.body;

    if (!code || !name || !baseSalary) {
      return res.status(400).json({
        status: "error",
        message: "Code, name, and base salary are required"
      });
    }

    // Check if code already exists
    const existing = await SalaryGrade.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({
        status: "error",
        message: "Salary grade code already exists"
      });
    }

    const grade = await SalaryGrade.create({
      code,
      name,
      level: parseInt(level) || 1,
      baseSalary: parseFloat(baseSalary) || 0,
      minYearsOfService: parseInt(minYearsOfService) || 0,
      description: description || null,
      isActive: isActive !== undefined ? isActive : true
    });

    return res.json({
      status: "success",
      message: "Salary grade created successfully",
      grade
    });
  } catch (err) {
    console.error("Error creating salary grade:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update salary grade
export const updateSalaryGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, level, baseSalary, description, isActive, minYearsOfService } = req.body;

    const grade = await SalaryGrade.findByPk(id);
    if (!grade) {
      return res.status(404).json({
        status: "error",
        message: "Salary grade not found"
      });
    }

    // Check if code already exists (if changed)
    if (code && code !== grade.code) {
      const existing = await SalaryGrade.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({
          status: "error",
          message: "Salary grade code already exists"
        });
      }
    }

    const oldBaseSalary = parseFloat(grade.baseSalary) || 0;
    const newBaseSalary = baseSalary !== undefined ? parseFloat(baseSalary) : oldBaseSalary;
    const baseSalaryChanged = baseSalary !== undefined && newBaseSalary !== oldBaseSalary;

    await grade.update({
      code: code || grade.code,
      name: name || grade.name,
      level: level !== undefined ? parseInt(level) : grade.level,
      baseSalary: newBaseSalary,
      minYearsOfService: minYearsOfService !== undefined ? parseInt(minYearsOfService) : grade.minYearsOfService,
      description: description !== undefined ? description : grade.description,
      isActive: isActive !== undefined ? isActive : grade.isActive
    });

    // If baseSalary changed, update all employees in this grade
    let updatedEmployeeCount = 0;
    let recalculatedSalaryCount = 0;
    if (baseSalaryChanged) {
      // Get affected user IDs before updating
      const affectedUsers = await User.findAll({
        where: { salaryGradeId: id },
        attributes: ['id']
      });
      const affectedUserIds = affectedUsers.map(u => u.id);

      const [affectedCount] = await User.update(
        { 
          baseSalary: newBaseSalary,
          insuranceBaseSalary: newBaseSalary
        },
        { where: { salaryGradeId: id } }
      );
      updatedEmployeeCount = affectedCount;

      // Recalculate all pending/approved salary records for affected employees
      if (affectedUserIds.length > 0) {
        const recalcResult = await recalculatePendingSalariesForUsers(affectedUserIds);
        recalculatedSalaryCount = recalcResult.recalculatedCount;
        if (recalcResult.errors.length > 0) {
          console.warn("Some salary recalculations failed:", recalcResult.errors);
        }
      }
    }

    return res.json({
      status: "success",
      message: baseSalaryChanged
        ? `Salary grade updated successfully. ${updatedEmployeeCount} employee(s) base salary updated. ${recalculatedSalaryCount} salary record(s) recalculated.`
        : "Salary grade updated successfully",
      grade,
      updatedEmployeeCount,
      recalculatedSalaryCount
    });
  } catch (err) {
    console.error("Error updating salary grade:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete salary grade
export const deleteSalaryGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const grade = await SalaryGrade.findByPk(id);

    if (!grade) {
      return res.status(404).json({
        status: "error",
        message: "Salary grade not found"
      });
    }

    await grade.destroy();

    return res.json({
      status: "success",
      message: "Salary grade deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting salary grade:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

