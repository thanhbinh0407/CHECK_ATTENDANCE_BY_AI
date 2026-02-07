import express from "express";
import {
  getOvertimeRequests,
  createOvertimeRequest,
  approveOvertimeRequest,
  deleteOvertimeRequest
} from "../controllers/overtimeController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all overtime requests
router.get("/", getOvertimeRequests);

// Create overtime request
router.post("/", createOvertimeRequest);

// Approve/Reject overtime request
router.put("/:id/approve", approveOvertimeRequest);

// Delete overtime request
router.delete("/:id", deleteOvertimeRequest);

export default router;



