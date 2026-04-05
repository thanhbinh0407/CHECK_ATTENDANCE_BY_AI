import {
  calculateAnnualTaxSummary,
  getAllEmployeesAnnualTaxSummary,
  calculatePersonalIncomeTax
} from "../services/taxService.js";

// Calculate tax for current user
export const calculateTax = async (req, res) => {
  try {
    const { userId, month, year, grossSalary } = req.query;
    const tokenUserId = req.user?.id ?? req.user?.userId;

    // Users can only calculate their own tax
    if (parseInt(userId) !== tokenUserId) {
      return res.status(403).json({
        status: "error",
        message: "You can only calculate tax for yourself"
      });
    }

    if (!grossSalary || !month || !year) {
      return res.status(400).json({
        status: "error",
        message: "grossSalary, month, and year are required"
      });
    }

    const taxAmount = await calculatePersonalIncomeTax(parseInt(userId), parseFloat(grossSalary), parseInt(month), parseInt(year));

    return res.json({
      status: "success",
      taxAmount,
      grossSalary: parseFloat(grossSalary),
      month: parseInt(month),
      year: parseInt(year)
    });
  } catch (err) {
    console.error("Error calculating tax:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

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


