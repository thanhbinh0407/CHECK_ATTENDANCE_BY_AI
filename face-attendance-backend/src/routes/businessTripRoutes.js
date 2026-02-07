import express from "express";
import {
  getBusinessTripRequests,
  createBusinessTripRequest,
  approveBusinessTripRequest,
  deleteBusinessTripRequest
} from "../controllers/businessTripController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all business trip requests
router.get("/", getBusinessTripRequests);

// Create business trip request
router.post("/", createBusinessTripRequest);

// Approve/Reject business trip request
router.put("/:id/approve", approveBusinessTripRequest);

// Delete business trip request
router.delete("/:id", deleteBusinessTripRequest);

export default router;



