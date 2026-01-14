import express from "express";
import {
  getOverview,
  getAttendanceTrend,
  getEmployeeStats,
  getSalaryStats,
  getAttendanceDistribution
} from "../controllers/analyticsController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin access
router.use(authMiddleware);
router.use(adminOnly);

router.get("/overview", getOverview);
router.get("/attendance-trend", getAttendanceTrend);
router.get("/employee-stats", getEmployeeStats);
router.get("/salary-stats", getSalaryStats);
router.get("/attendance-distribution", getAttendanceDistribution);

export default router;

