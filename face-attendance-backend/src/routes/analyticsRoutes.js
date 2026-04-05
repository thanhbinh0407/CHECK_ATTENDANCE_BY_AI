import express from "express";
import {
  getDashboardAnalyticsController
} from "../controllers/analyticsController.js";
import { authMiddleware, canViewReports } from "../middleware/authMiddleware.js";

const router = express.Router();

// Accountant, Supervisor và Manager xem analytics
router.use(authMiddleware);
router.use(canViewReports);

router.get("/dashboard", getDashboardAnalyticsController);

export default router;

