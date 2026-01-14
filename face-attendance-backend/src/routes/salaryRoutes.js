import express from "express";
import {
  getAllSalaryRules,
  getSalaryRuleById,
  createSalaryRule,
  updateSalaryRule,
  deleteSalaryRule,
  calculateSalary,
  getSalaries,
  updateSalaryStatus
} from "../controllers/salaryController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Salary Rules routes (Admin only)
router.get("/rules", adminOnly, getAllSalaryRules);
router.get("/rules/:id", adminOnly, getSalaryRuleById);
router.post("/rules", adminOnly, createSalaryRule);
router.put("/rules/:id", adminOnly, updateSalaryRule);
router.delete("/rules/:id", adminOnly, deleteSalaryRule);

// Salary calculation and management (Admin only)
router.post("/calculate", adminOnly, calculateSalary);
router.get("/", adminOnly, getSalaries);
router.put("/:id/status", adminOnly, updateSalaryStatus);

export default router;

