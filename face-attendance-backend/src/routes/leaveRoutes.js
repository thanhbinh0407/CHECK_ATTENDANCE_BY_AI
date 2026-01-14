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
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Employee routes
router.post("/request", createLeaveRequest);
router.get("/requests", getLeaveRequests);
router.get("/requests/:id", getLeaveRequestById);
router.get("/balance", getLeaveBalance);
router.delete("/requests/:id", deleteLeaveRequest);

// Admin routes
router.put("/requests/:id/approve", adminOnly, approveLeaveRequest);
router.put("/requests/:id/reject", adminOnly, rejectLeaveRequest);

export default router;

