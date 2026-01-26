import express from "express";
import {
  getAllQualifications,
  getQualificationById,
  createQualification,
  updateQualification,
  deleteQualification,
  approveQualificationRequest,
  rejectQualificationRequest,
  getMyQualifications
} from "../controllers/qualificationController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Employee can view and manage own qualifications
router.get("/my", getMyQualifications);
router.post("/", createQualification);
router.put("/:id", updateQualification);
router.delete("/:id", deleteQualification);

// Admin only routes
router.get("/", adminOnly, getAllQualifications);
router.get("/:id", adminOnly, getQualificationById);
router.put("/:id/approve", adminOnly, approveQualificationRequest);
router.put("/:id/reject", adminOnly, rejectQualificationRequest);

export default router;

