import {
  exportTurnoverReport,
  exportAttendanceReport,
  exportPayrollCostReport,
  exportStructureReport,
  exportSeniorityAndAgeReport,
  exportEducationAndSkillsReport,
  exportLeaveStatusReport,
  exportAverageIncomeReport,
  exportLateEarlyDetailReport,
  exportAbsentDetailReport,
  exportOvertimeDetailReport,
  exportAllowancesAndBonusesReport,
  exportAnnualTaxSummary
} from "../services/excelExportService.js";
import XLSX from 'xlsx';

// Helper to send Excel file
const sendExcelFile = (res, workbook, filename) => {
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.send(buffer);
};

// Export turnover report
export const exportTurnoverReportController = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: "error",
        message: "Start date and end date are required"
      });
    }
    const workbook = await exportTurnoverReport(startDate, endDate);
    sendExcelFile(res, workbook, `BaoCao_BienDongNhanSu_${startDate}_${endDate}`);
  } catch (err) {
    console.error("Error exporting turnover report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export attendance report
export const exportAttendanceReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const workbook = await exportAttendanceReport(parseInt(month), parseInt(year));
    sendExcelFile(res, workbook, `BaoCao_ChamCong_${month}_${year}`);
  } catch (err) {
    console.error("Error exporting attendance report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export payroll cost report
export const exportPayrollCostReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const workbook = await exportPayrollCostReport(parseInt(month), parseInt(year));
    sendExcelFile(res, workbook, `BaoCao_ChiPhiLuong_${month}_${year}`);
  } catch (err) {
    console.error("Error exporting payroll cost report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export structure report
export const exportStructureReportController = async (req, res) => {
  try {
    const workbook = await exportStructureReport();
    sendExcelFile(res, workbook, `BaoCao_CoCauNhanSu_${new Date().getFullYear()}`);
  } catch (err) {
    console.error("Error exporting structure report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export seniority and age report
export const exportSeniorityAndAgeReportController = async (req, res) => {
  try {
    const workbook = await exportSeniorityAndAgeReport();
    sendExcelFile(res, workbook, `BaoCao_ThamNien_DoTuoi_${new Date().getFullYear()}`);
  } catch (err) {
    console.error("Error exporting seniority and age report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export education and skills report
export const exportEducationAndSkillsReportController = async (req, res) => {
  try {
    const workbook = await exportEducationAndSkillsReport();
    sendExcelFile(res, workbook, `BaoCao_TrinhDo_KyNang_${new Date().getFullYear()}`);
  } catch (err) {
    console.error("Error exporting education and skills report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export leave status report
export const exportLeaveStatusReportController = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const workbook = await exportLeaveStatusReport(targetYear);
    sendExcelFile(res, workbook, `BaoCao_TinhTrangNghiPhep_${targetYear}`);
  } catch (err) {
    console.error("Error exporting leave status report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export average income report
export const exportAverageIncomeReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const workbook = await exportAverageIncomeReport(parseInt(month), parseInt(year));
    sendExcelFile(res, workbook, `BaoCao_ThuNhapBinhQuan_${month}_${year}`);
  } catch (err) {
    console.error("Error exporting average income report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export late/early detail report
export const exportLateEarlyDetailReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const workbook = await exportLateEarlyDetailReport(parseInt(month), parseInt(year));
    sendExcelFile(res, workbook, `BaoCao_DiMuon_VeSom_${month}_${year}`);
  } catch (err) {
    console.error("Error exporting late/early detail report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export absent detail report
export const exportAbsentDetailReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const workbook = await exportAbsentDetailReport(parseInt(month), parseInt(year));
    sendExcelFile(res, workbook, `BaoCao_VangMat_${month}_${year}`);
  } catch (err) {
    console.error("Error exporting absent detail report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export overtime detail report
export const exportOvertimeDetailReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const workbook = await exportOvertimeDetailReport(parseInt(month), parseInt(year));
    sendExcelFile(res, workbook, `BaoCao_LamThemGio_${month}_${year}`);
  } catch (err) {
    console.error("Error exporting overtime detail report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export allowances and bonuses report
export const exportAllowancesAndBonusesReportController = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        status: "error",
        message: "Month and year are required"
      });
    }
    const workbook = await exportAllowancesAndBonusesReport(parseInt(month), parseInt(year));
    sendExcelFile(res, workbook, `BaoCao_PhuCap_Thuong_${month}_${year}`);
  } catch (err) {
    console.error("Error exporting allowances and bonuses report:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Export annual tax summary
export const exportAnnualTaxSummaryController = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const workbook = await exportAnnualTaxSummary(targetYear);
    sendExcelFile(res, workbook, `BaoCao_QuyetToanThue_${targetYear}`);
  } catch (err) {
    console.error("Error exporting annual tax summary:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};


