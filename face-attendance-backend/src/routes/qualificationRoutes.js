import express from "express";
import {
  getAllQualifications,
  getQualificationById,
  createQualification,
  updateQualification,
  deleteQualification,
  approveQualificationRequest,
  rejectQualificationRequest,
  getMyQualifications,
  uploadQualificationDocument
} from "../controllers/qualificationController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";
import { uploadQualification } from "../utils/fileUpload.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Upload document endpoint (must be before other POST routes)
router.post("/upload", uploadQualification.single('document'), uploadQualificationDocument);

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

