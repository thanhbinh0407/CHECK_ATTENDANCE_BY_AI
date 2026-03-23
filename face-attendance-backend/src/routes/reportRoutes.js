import express from "express";
import {
  getTurnoverReport,
  getAttendanceReportController,
  getPayrollCostReportController,
  getStructureReport,
  getSeniorityAndAgeReportController,
  getEducationAndSkillsReportController,
  getLeaveStatusReportController,
  getAverageIncomeReportController,
  getLateEarlyDetailReportController,
  getAbsentDetailReportController,
  getOvertimeDetailReportController,
  getAllowancesAndBonusesReportController,
  getD02LTDataController,
  saveD02LTDataController
} from "../controllers/reportController.js";
import { authMiddleware, canViewReports, accountantOrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// Kế toán, Supervisor và Manager xem báo cáo
router.use(authMiddleware);
router.use(canViewReports);

router.get("/turnover", getTurnoverReport);
router.get("/attendance", getAttendanceReportController);
router.get("/payroll-cost", getPayrollCostReportController);
router.get("/structure", getStructureReport);
router.get("/seniority-age", getSeniorityAndAgeReportController);
router.get("/education-skills", getEducationAndSkillsReportController);
router.get("/leave-status", getLeaveStatusReportController);
router.get("/average-income", getAverageIncomeReportController);
router.get("/late-early", getLateEarlyDetailReportController);
router.get("/absent", getAbsentDetailReportController);
router.get("/overtime", getOvertimeDetailReportController);
router.get("/allowances-bonuses", getAllowancesAndBonusesReportController);

// Get D02-LT report data
router.get("/d02-lt", getD02LTDataController);

// Save D02-LT report data
router.post("/d02-lt", saveD02LTDataController);

export default router;

