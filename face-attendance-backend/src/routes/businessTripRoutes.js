import express from "express";
import {
  getBusinessTripRequests,
  createBusinessTripRequest,
  approveBusinessTripRequest,
  deleteBusinessTripRequest
} from "../controllers/businessTripController.js";
import { authMiddleware, supervisorOrManager } from "../middleware/authMiddleware.js";
import { auditMutation } from "../services/actionAuditService.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên tạo và xem đơn công tác
router.get("/", getBusinessTripRequests);
router.post(
  "/",
  auditMutation({
    action: "business_trip.create",
    category: "own_request",
    entityType: "business_trip_request",
    entityIdFrom: (req, res, body) => body?.request?.id ?? body?.id ?? null,
    summary: () => "Submitted business trip request",
    metadata: (req) => ({
      destination: req.body?.destination,
      startDate: req.body?.startDate,
      endDate: req.body?.endDate,
    }),
  }),
  createBusinessTripRequest
);
router.delete(
  "/:id",
  auditMutation({
    action: "business_trip.delete",
    category: "own_request",
    entityType: "business_trip_request",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Deleted business trip request #${req.params?.id}`,
  }),
  deleteBusinessTripRequest
);

// Supervisor (Quản lý) hoặc Manager duyệt đơn công tác
router.put("/:id/approve", supervisorOrManager, approveBusinessTripRequest);

export default router;



