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
import { authMiddleware, hrOrManager } from "../middleware/authMiddleware.js";
import { uploadQualification } from "../utils/fileUpload.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Upload document endpoint
router.post("/upload", uploadQualification.single('document'), uploadQualificationDocument);

// Nhân viên quản lý bằng cấp của mình
router.get("/my", getMyQualifications);
router.post("/", createQualification);
router.put("/:id", updateQualification);
router.delete("/:id", deleteQualification);

// HR hoặc Manager xem, duyệt, từ chối bằng cấp
router.get("/", hrOrManager, getAllQualifications);
router.get("/:id", hrOrManager, getQualificationById);
router.put("/:id/approve", hrOrManager, approveQualificationRequest);
router.put("/:id/reject", hrOrManager, rejectQualificationRequest);

export default router;

