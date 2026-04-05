import express from "express";
import {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveBalance,
  deleteLeaveRequest,
  updateLeaveRequest
} from "../controllers/leaveController.js";
import { authMiddleware, supervisorManagerOrHr } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên: tạo, xem, xóa đơn nghỉ của mình
router.post("/request", createLeaveRequest);
router.get("/requests", getLeaveRequests);
router.get("/requests/:id", getLeaveRequestById);
router.get("/balance", getLeaveBalance);
router.delete("/requests/:id", deleteLeaveRequest);

// Supervisor, Manager hoặc HR duyệt / từ chối đơn nghỉ
router.put("/requests/:id/approve", supervisorManagerOrHr, approveLeaveRequest);
router.put("/requests/:id/reject", supervisorManagerOrHr, rejectLeaveRequest);
// Employee edit (pending only)
router.put("/requests/:id", updateLeaveRequest);

export default router;

