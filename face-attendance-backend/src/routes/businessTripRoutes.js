import express from "express";
import {
  getBusinessTripRequests,
  createBusinessTripRequest,
  approveBusinessTripRequest,
  deleteBusinessTripRequest
} from "../controllers/businessTripController.js";
import { authMiddleware, supervisorOrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên tạo và xem đơn công tác
router.get("/", getBusinessTripRequests);
router.post("/", createBusinessTripRequest);
router.delete("/:id", deleteBusinessTripRequest);

// Supervisor (Quản lý) hoặc Manager duyệt đơn công tác
router.put("/:id/approve", supervisorOrManager, approveBusinessTripRequest);

export default router;



