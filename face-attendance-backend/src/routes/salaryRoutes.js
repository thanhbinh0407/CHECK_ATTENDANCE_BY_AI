import express from "express";
import {
  getAllSalaryRules,
  getSalaryRuleById,
  createSalaryRule,
  updateSalaryRule,
  deleteSalaryRule,
  calculateSalary,
  getSalaries,
  getPendingSalaries,
  updateSalaryStatus,
  approveSalary,
  rejectSalary,
  adjustSalary
} from "../controllers/salaryController.js";
import { authMiddleware, adminOnly, adminOrAccountant } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Salary Rules routes (Admin or Accountant) - MUST be before /:id routes
router.get("/rules", adminOrAccountant, getAllSalaryRules);
router.get("/rules/:id", adminOnly, getSalaryRuleById);
router.post("/rules", adminOnly, createSalaryRule);
router.put("/rules/:id", adminOnly, updateSalaryRule);
router.delete("/rules/:id", adminOnly, deleteSalaryRule);

// Salary calculation and management (Admin or Accountant)
router.post("/calculate", adminOrAccountant, calculateSalary);
router.get("/", adminOrAccountant, getSalaries);
router.get("/pending", adminOrAccountant, getPendingSalaries);

// Specific salary item routes - MUST be after other routes
router.put("/:id/status", adminOnly, updateSalaryStatus);
router.put("/:id/approve", adminOnly, approveSalary);
router.put("/:id/reject", adminOnly, rejectSalary);
router.put("/:id/adjust", adminOnly, adjustSalary);

export default router;

