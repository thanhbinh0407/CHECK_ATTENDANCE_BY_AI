import express from "express";
import {
  getUserSeniority,
  applySalaryIncrease,
  applySalaryIncreasesForAll
} from "../controllers/senioritySalaryController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user seniority (accessible by user or admin)
router.get("/user/:userId", getUserSeniority);

// Apply salary increase for specific user (admin only)
router.post("/user/:userId/apply", adminOnly, applySalaryIncrease);

// Apply salary increases for all eligible employees (admin only)
router.post("/apply-all", adminOnly, applySalaryIncreasesForAll);

export default router;

