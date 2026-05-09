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
import { auditMutation } from "../services/actionAuditService.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Upload document endpoint
router.post(
  "/upload",
  uploadQualification.single('document'),
  auditMutation({
    action: "qualification.upload_document",
    category: "own_qualification",
    entityType: "qualification",
    summary: () => "Uploaded qualification document",
  }),
  uploadQualificationDocument
);

// Nhân viên quản lý bằng cấp của mình
router.get("/my", getMyQualifications);
router.post(
  "/",
  auditMutation({
    action: "qualification.create",
    category: "own_qualification",
    entityType: "qualification",
    entityIdFrom: (req, res, body) => body?.qualification?.id ?? body?.id ?? null,
    summary: (req) => `Added qualification ${req.body?.name || ""}`.trim(),
  }),
  createQualification
);
router.put(
  "/:id",
  auditMutation({
    action: "qualification.update",
    category: "own_qualification",
    entityType: "qualification",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Updated qualification #${req.params?.id}`,
  }),
  updateQualification
);
router.delete(
  "/:id",
  auditMutation({
    action: "qualification.delete",
    category: "own_qualification",
    entityType: "qualification",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Deleted qualification #${req.params?.id}`,
  }),
  deleteQualification
);

// HR hoặc Manager xem, duyệt, từ chối bằng cấp
router.get("/", hrOrManager, getAllQualifications);
router.get("/:id", hrOrManager, getQualificationById);
router.put("/:id/approve", hrOrManager, approveQualificationRequest);
router.put("/:id/reject", hrOrManager, rejectQualificationRequest);

export default router;

