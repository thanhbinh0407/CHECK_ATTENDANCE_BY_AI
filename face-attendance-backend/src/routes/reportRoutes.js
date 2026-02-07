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
  getAllowancesAndBonusesReportController
} from "../controllers/reportController.js";
import { authMiddleware, adminOrAccountant } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin/accountant role
router.use(authMiddleware);
router.use(adminOrAccountant);

// Get employee turnover report
router.get("/turnover", getTurnoverReport);

// Get attendance report
router.get("/attendance", getAttendanceReportController);

// Get payroll cost report
router.get("/payroll-cost", getPayrollCostReportController);

// Get employee structure report
router.get("/structure", getStructureReport);

// Get seniority and age report
router.get("/seniority-age", getSeniorityAndAgeReportController);

// Get education and skills report
router.get("/education-skills", getEducationAndSkillsReportController);

// Get leave status report
router.get("/leave-status", getLeaveStatusReportController);

// Get average income report
router.get("/average-income", getAverageIncomeReportController);

// Get late/early detail report
router.get("/late-early", getLateEarlyDetailReportController);

// Get absent detail report
router.get("/absent", getAbsentDetailReportController);

// Get overtime detail report
router.get("/overtime", getOvertimeDetailReportController);

// Get allowances and bonuses report
router.get("/allowances-bonuses", getAllowancesAndBonusesReportController);

export default router;

