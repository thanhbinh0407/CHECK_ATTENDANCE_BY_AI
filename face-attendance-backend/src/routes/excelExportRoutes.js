import express from "express";
import {
  exportTurnoverReportController,
  exportAttendanceReportController,
  exportPayrollCostReportController,
  exportStructureReportController,
  exportSeniorityAndAgeReportController,
  exportEducationAndSkillsReportController,
  exportLeaveStatusReportController,
  exportAverageIncomeReportController,
  exportLateEarlyDetailReportController,
  exportAbsentDetailReportController,
  exportOvertimeDetailReportController,
  exportAllowancesAndBonusesReportController,
  exportAnnualTaxSummaryController
} from "../controllers/excelExportController.js";
import { authMiddleware, canViewReports } from "../middleware/authMiddleware.js";

const router = express.Router();

// Kế toán, Supervisor, Manager được xuất báo cáo
router.use(authMiddleware);
router.use(canViewReports);

router.get("/turnover", exportTurnoverReportController);
router.get("/attendance", exportAttendanceReportController);
router.get("/payroll-cost", exportPayrollCostReportController);
router.get("/structure", exportStructureReportController);
router.get("/seniority-age", exportSeniorityAndAgeReportController);
router.get("/education-skills", exportEducationAndSkillsReportController);
router.get("/leave-status", exportLeaveStatusReportController);
router.get("/average-income", exportAverageIncomeReportController);
router.get("/late-early", exportLateEarlyDetailReportController);
router.get("/absent", exportAbsentDetailReportController);
router.get("/overtime", exportOvertimeDetailReportController);
router.get("/allowances-bonuses", exportAllowancesAndBonusesReportController);
router.get("/annual-tax", exportAnnualTaxSummaryController);

export default router;


