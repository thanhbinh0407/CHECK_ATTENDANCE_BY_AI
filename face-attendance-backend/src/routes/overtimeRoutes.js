import express from "express";
import {
  getOvertimeRequests,
  createOvertimeRequest,
  approveOvertimeRequest,
  deleteOvertimeRequest
} from "../controllers/overtimeController.js";
import { authMiddleware, supervisorOrManager } from "../middleware/authMiddleware.js";
import { auditMutation } from "../services/actionAuditService.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên tạo và xem đơn tăng ca
router.get("/", getOvertimeRequests);
router.post(
  "/",
  auditMutation({
    action: "overtime.create",
    category: "own_request",
    entityType: "overtime_request",
    entityIdFrom: (req, res, body) => body?.request?.id ?? body?.id ?? null,
    summary: () => "Submitted overtime request",
    metadata: (req) => ({
      date: req.body?.date,
      totalHours: req.body?.totalHours,
      projectName: req.body?.projectName,
    }),
  }),
  createOvertimeRequest
);
router.delete(
  "/:id",
  auditMutation({
    action: "overtime.delete",
    category: "own_request",
    entityType: "overtime_request",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Deleted overtime request #${req.params?.id}`,
  }),
  deleteOvertimeRequest
);

// Supervisor (Quản lý) hoặc Manager duyệt đơn tăng ca
router.put("/:id/approve", supervisorOrManager, approveOvertimeRequest);

export default router;



