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
  markPaidSalary,
  revertSalaryToPending,
  approveSalary,
  rejectSalary,
  adjustSalary
} from "../controllers/salaryController.js";
import { authMiddleware, accountantOrManager, supervisorOrManager, canViewReports, staffRoles, accountantOnly, managerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Salary Rules - Kế toán hoặc Manager quản lý quy tắc lương
router.get("/rules", canViewReports, getAllSalaryRules);
router.get("/rules/:id", accountantOrManager, getSalaryRuleById);
router.post("/rules", accountantOrManager, createSalaryRule);
router.put("/rules/:id", accountantOrManager, updateSalaryRule);
router.delete("/rules/:id", accountantOrManager, deleteSalaryRule);

// Tính lương và xem bảng lương - Kế toán, Supervisor hoặc Manager
router.post("/calculate", accountantOrManager, calculateSalary);
router.get("/", canViewReports, getSalaries);
router.get("/pending", canViewReports, getPendingSalaries);

// Duyệt / từ chối lương - Supervisor hoặc Manager
// Legacy endpoint (status-aware in controller)
router.put("/:id/status", staffRoles, updateSalaryStatus);
router.put("/:id/approve", supervisorOrManager, approveSalary);
router.put("/:id/reject", supervisorOrManager, rejectSalary);
// Accountant: approved -> paid
router.put("/:id/mark-paid", accountantOnly, markPaidSalary);
// Manager: paid -> pending (audit revert)
router.put("/:id/revert", managerOnly, revertSalaryToPending);
router.put("/:id/adjust", accountantOrManager, adjustSalary);

export default router;

