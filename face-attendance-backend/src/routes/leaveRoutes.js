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
import { auditMutation } from "../services/actionAuditService.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên: tạo, xem, xóa đơn nghỉ của mình
router.post(
  "/request",
  auditMutation({
    action: "leave.create",
    category: "own_request",
    entityType: "leave_request",
    entityIdFrom: (req, res, body) => body?.leaveRequest?.id ?? body?.request?.id ?? body?.id ?? null,
    summary: () => "Submitted leave request",
    metadata: (req) => ({
      type: req.body?.type,
      startDate: req.body?.startDate,
      endDate: req.body?.endDate,
      days: req.body?.days,
    }),
  }),
  createLeaveRequest
);
router.get("/requests", getLeaveRequests);
router.get("/requests/:id", getLeaveRequestById);
router.get("/balance", getLeaveBalance);
router.delete(
  "/requests/:id",
  auditMutation({
    action: "leave.delete",
    category: "own_request",
    entityType: "leave_request",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Deleted leave request #${req.params?.id}`,
  }),
  deleteLeaveRequest
);

// Supervisor, Manager hoặc HR duyệt / từ chối đơn nghỉ
router.put("/requests/:id/approve", supervisorManagerOrHr, approveLeaveRequest);
router.put("/requests/:id/reject", supervisorManagerOrHr, rejectLeaveRequest);
// Employee edit (pending only)
router.put(
  "/requests/:id",
  auditMutation({
    action: "leave.update",
    category: "own_request",
    entityType: "leave_request",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Updated leave request #${req.params?.id}`,
  }),
  updateLeaveRequest
);

export default router;

