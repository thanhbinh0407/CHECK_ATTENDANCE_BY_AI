import SalaryGrade from "../models/pg/SalaryGrade.js";

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

    await grade.update({
      code: code || grade.code,
      name: name || grade.name,
      level: level !== undefined ? parseInt(level) : grade.level,
      baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : grade.baseSalary,
      minYearsOfService: minYearsOfService !== undefined ? parseInt(minYearsOfService) : grade.minYearsOfService,
      description: description !== undefined ? description : grade.description,
      isActive: isActive !== undefined ? isActive : grade.isActive
    });

    return res.json({
      status: "success",
      message: "Salary grade updated successfully",
      grade
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

