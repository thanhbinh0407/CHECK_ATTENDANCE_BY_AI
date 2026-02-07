import {
  getEmployeeTurnoverReport,
  getAttendanceReport,
  getPayrollCostReport as getPayrollCostReportService,
  getEmployeeStructureReport,
  getSeniorityAndAgeReport,
  getEducationAndSkillsReport,
  getLeaveStatusReport,
  getAverageIncomeReport,
  getLateEarlyDetailReport,
  getAbsentDetailReport,
  getOvertimeDetailReport,
  getAllowancesAndBonusesReport
} from "../services/reportService.js";

// Get employee turnover report
export const getTurnoverReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: "error",
        message: "Start date and end date are required"
      });
    }

    const report = await getEmployeeTurnoverReport(startDate, endDate);

    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating turnover report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get attendance report
export const getAttendanceReportController = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }

    const report = await getAttendanceReport(parseInt(month), parseInt(year));

    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating attendance report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get payroll cost report
export const getPayrollCostReportController = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }

    const report = await getPayrollCostReportService(parseInt(month), parseInt(year));

    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating payroll cost report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get employee structure report
export const getStructureReport = async (req, res) => {
  try {
    const report = await getEmployeeStructureReport();

    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating structure report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get seniority and age report
export const getSeniorityAndAgeReportController = async (req, res) => {
  try {
    const report = await getSeniorityAndAgeReport();
    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating seniority and age report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get education and skills report
export const getEducationAndSkillsReportController = async (req, res) => {
  try {
    const report = await getEducationAndSkillsReport();
    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating education and skills report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get leave status report
export const getLeaveStatusReportController = async (req, res) => {
  try {
    const { year } = req.query;
    const report = await getLeaveStatusReport(year ? parseInt(year) : null);
    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating leave status report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get average income report
export const getAverageIncomeReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const report = await getAverageIncomeReport(parseInt(month), parseInt(year));
    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating average income report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get late/early detail report
export const getLateEarlyDetailReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const report = await getLateEarlyDetailReport(parseInt(month), parseInt(year));
    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating late/early detail report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get absent detail report
export const getAbsentDetailReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const report = await getAbsentDetailReport(parseInt(month), parseInt(year));
    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating absent detail report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get overtime detail report
export const getOvertimeDetailReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const report = await getOvertimeDetailReport(parseInt(month), parseInt(year));
    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating overtime detail report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get allowances and bonuses report
export const getAllowancesAndBonusesReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const report = await getAllowancesAndBonusesReport(parseInt(month), parseInt(year));
    return res.json({
      status: "success",
      report
    });
  } catch (err) {
    console.error("Error generating allowances and bonuses report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

