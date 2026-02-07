import express from "express";
import {
  getDashboardAnalyticsController
} from "../controllers/analyticsController.js";
import { authMiddleware, adminOrAccountant } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin/accountant access
router.use(authMiddleware);
router.use(adminOrAccountant);

// Advanced analytics dashboard
router.get("/dashboard", getDashboardAnalyticsController);

export default router;

