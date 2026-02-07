import WorkExperience from "../models/pg/WorkExperience.js";
import User from "../models/pg/User.js";

// Get all work experiences for an employee
export const getWorkExperiences = async (req, res) => {
  try {
    const { userId } = req.params;

    const experiences = await WorkExperience.findAll({
      where: { userId },
      order: [['startDate', 'DESC']]
    });

    return res.json({
      status: "success",
      workExperiences: experiences
    });
  } catch (err) {
    console.error("Error fetching work experiences:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Create work experience
export const createWorkExperience = async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyName, position, startDate, endDate, description, responsibilities, achievements, isCurrent } = req.body;

    // Validate required fields
    if (!companyName || !position) {
      return res.status(400).json({
        status: "error",
        message: "Company name and position are required"
      });
    }

    // Check if user exists
    const user = await User.findOne({ where: { id: userId, role: "employee" } });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    const experience = await WorkExperience.create({
      userId,
      companyName,
      position,
      startDate: startDate || null,
      endDate: isCurrent ? null : (endDate || null),
      description: description || null,
      responsibilities: responsibilities || null,
      achievements: achievements || null,
      isCurrent: isCurrent || false
    });

    return res.json({
      status: "success",
      message: "Work experience created successfully",
      workExperience: experience
    });
  } catch (err) {
    console.error("Error creating work experience:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update work experience
export const updateWorkExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, position, startDate, endDate, description, responsibilities, achievements, isCurrent } = req.body;

    const experience = await WorkExperience.findByPk(id);
    if (!experience) {
      return res.status(404).json({
        status: "error",
        message: "Work experience not found"
      });
    }

    const updateData = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (position !== undefined) updateData.position = position;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = isCurrent ? null : (endDate ? new Date(endDate) : null);
    if (description !== undefined) updateData.description = description;
    if (responsibilities !== undefined) updateData.responsibilities = responsibilities;
    if (achievements !== undefined) updateData.achievements = achievements;
    if (isCurrent !== undefined) {
      updateData.isCurrent = isCurrent;
      if (isCurrent) updateData.endDate = null;
    }

    await experience.update(updateData);

    return res.json({
      status: "success",
      message: "Work experience updated successfully",
      workExperience: experience
    });
  } catch (err) {
    console.error("Error updating work experience:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete work experience
export const deleteWorkExperience = async (req, res) => {
  try {
    const { id } = req.params;

    const experience = await WorkExperience.findByPk(id);
    if (!experience) {
      return res.status(404).json({
        status: "error",
        message: "Work experience not found"
      });
    }

    await experience.destroy();

    return res.json({
      status: "success",
      message: "Work experience deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting work experience:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

