import {
  calculateAnnualTaxSummary,
  getAllEmployeesAnnualTaxSummary
} from "../services/taxService.js";

// Get annual tax summary for a specific employee
export const getEmployeeAnnualTaxSummary = async (req, res) => {
  try {
    const { userId, year } = req.query;

    if (!userId || !year) {
      return res.status(400).json({
        status: "error",
        message: "userId and year are required"
      });
    }

    const summary = await calculateAnnualTaxSummary(parseInt(userId), parseInt(year));

    return res.json({
      status: "success",
      summary
    });
  } catch (err) {
    console.error("Error generating annual tax summary:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get annual tax summary for all employees
export const getAllEmployeesAnnualTaxSummaryController = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const summary = await getAllEmployeesAnnualTaxSummary(targetYear);

    return res.json({
      status: "success",
      summary
    });
  } catch (err) {
    console.error("Error generating all employees annual tax summary:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};


