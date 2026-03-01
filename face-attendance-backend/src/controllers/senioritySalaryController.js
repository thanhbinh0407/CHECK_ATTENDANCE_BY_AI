import {
  applySenioritySalaryIncrease,
  applySenioritySalaryIncreasesForAll,
  calculateSeniority,
  getQualifiedGrade
} from "../services/senioritySalaryService.js";
import User from "../models/pg/User.js";

/**
 * Get seniority information for a user
 */
export const getUserSeniority = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    // Fix: use startDate (the actual DB field)
    const seniority = calculateSeniority(user.startDate);
    const qualifiedGrade = await getQualifiedGrade(seniority);

    return res.json({
      status: "success",
      seniority: {
        years:             seniority,
        startDate:         user.startDate,
        currentBaseSalary: user.baseSalary,
        qualifiedGrade:    qualifiedGrade ? { id: qualifiedGrade.id, name: qualifiedGrade.name, baseSalary: qualifiedGrade.baseSalary, minYearsOfService: qualifiedGrade.minYearsOfService } : null
      }
    });
  } catch (error) {
    console.error("Error getting user seniority:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * Apply seniority salary increase for a specific user
 */
export const applySalaryIncrease = async (req, res) => {
  try {
    const { userId } = req.params;
    const { dryRun = false, notifyUser = true } = req.body;
    
    const result = await applySenioritySalaryIncrease(userId, {
      dryRun,
      notifyUser
    });
    
    if (result.success) {
      return res.json({
        status: "success",
        message: result.message,
        data: result
      });
    } else {
      return res.status(400).json({
        status: "error",
        message: result.message,
        data: result
      });
    }
  } catch (error) {
    console.error("Error applying salary increase:", error);
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Apply seniority salary increases for all eligible employees
 */
export const applySalaryIncreasesForAll = async (req, res) => {
  try {
    const { dryRun = false, notifyUsers = true, minSeniority = 0 } = req.body;
    
    const results = await applySenioritySalaryIncreasesForAll({
      dryRun,
      notifyUsers,
      minSeniority: parseInt(minSeniority) || 0
    });
    
    return res.json({
      status: "success",
      message: `Processed ${results.processed} employees. ${results.upgraded} upgraded, ${results.skipped} skipped, ${results.errors} errors.`,
      summary: {
        total: results.total,
        processed: results.processed,
        upgraded: results.upgraded,
        skipped: results.skipped,
        errors: results.errors
      },
      details: results.details
    });
  } catch (error) {
    console.error("Error applying salary increases for all:", error);
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

