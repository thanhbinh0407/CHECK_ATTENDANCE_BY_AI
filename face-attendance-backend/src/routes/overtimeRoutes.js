import express from "express";
import {
  getOvertimeRequests,
  createOvertimeRequest,
  approveOvertimeRequest,
  deleteOvertimeRequest
} from "../controllers/overtimeController.js";
import { authMiddleware, supervisorOrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên tạo và xem đơn tăng ca
router.get("/", getOvertimeRequests);
router.post("/", createOvertimeRequest);
router.delete("/:id", deleteOvertimeRequest);

// Supervisor (Quản lý) hoặc Manager duyệt đơn tăng ca
router.put("/:id/approve", supervisorOrManager, approveOvertimeRequest);

export default router;



