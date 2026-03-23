import express from "express";
import {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveBalance,
  deleteLeaveRequest
} from "../controllers/leaveController.js";
import { authMiddleware, supervisorOrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên: tạo, xem, xóa đơn nghỉ của mình
router.post("/request", createLeaveRequest);
router.get("/requests", getLeaveRequests);
router.get("/requests/:id", getLeaveRequestById);
router.get("/balance", getLeaveBalance);
router.delete("/requests/:id", deleteLeaveRequest);

// Supervisor (Quản lý) hoặc Manager (Giám đốc) duyệt đơn
router.put("/requests/:id/approve", supervisorOrManager, approveLeaveRequest);
router.put("/requests/:id/reject", supervisorOrManager, rejectLeaveRequest);

export default router;

