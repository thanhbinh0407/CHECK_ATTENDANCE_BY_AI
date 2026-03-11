import { calculateInsurance } from "../services/insuranceService.js";

// Get insurance details for an employee
export const getEmployeeInsurance = async (req, res) => {
  try {
    const { userId, month, year } = req.query;

    if (!userId || !month || !year) {
      return res.status(400).json({
        status: "error",
        message: "userId, month, and year are required"
      });
    }

    const insurance = await calculateInsurance(parseInt(userId), parseInt(month), parseInt(year));

    return res.json({
      status: "success",
      insurance
    });
  } catch (err) {
    console.error("Error fetching employee insurance:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};