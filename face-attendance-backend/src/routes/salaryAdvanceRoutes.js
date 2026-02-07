import express from "express";
import {
  getSalaryAdvances,
  createSalaryAdvance,
  approveSalaryAdvance,
  markDeducted
} from "../controllers/salaryAdvanceController.js";
import { authMiddleware, adminOrAccountant } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all salary advances
router.get("/", getSalaryAdvances);

// Create salary advance request
router.post("/", createSalaryAdvance);

// Approve/Reject salary advance (admin/accountant only)
router.put("/:id/approve", adminOrAccountant, approveSalaryAdvance);

// Mark as deducted (admin/accountant only)
router.put("/:id/deduct", adminOrAccountant, markDeducted);

export default router;



