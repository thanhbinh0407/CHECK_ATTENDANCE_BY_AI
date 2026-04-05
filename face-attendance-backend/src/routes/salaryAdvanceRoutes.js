import express from "express";
import {
  getSalaryAdvances,
  createSalaryAdvance,
  approveSalaryAdvance,
  markDeducted
} from "../controllers/salaryAdvanceController.js";
import { authMiddleware, accountantOrSupervisor } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên tạo và xem đơn tạm ứng
router.get("/", getSalaryAdvances);
router.post("/", createSalaryAdvance);

// Kế toán hoặc Supervisor duyệt tạm ứng lương
router.put("/:id/approve", accountantOrSupervisor, approveSalaryAdvance);
router.put("/:id/deduct", accountantOrSupervisor, markDeducted);

export default router;



