import express from "express";
import {
  getAllDependents,
  getDependentById,
  createDependent,
  updateDependent,
  deleteDependent,
  approveDependentRequest,
  rejectDependentRequest,
  getMyDependents,
  uploadDependentDocuments,
  getDependentDocuments
} from "../controllers/dependentController.js";
import { authMiddleware, hrOrManager } from "../middleware/authMiddleware.js";
import { uploadDependentDocuments as uploadDependentMulter } from "../utils/fileUpload.js";
import { auditMutation } from "../services/actionAuditService.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên quản lý người phụ thuộc của mình
router.get("/my", getMyDependents);
router.post(
  "/",
  auditMutation({
    action: "dependent.create",
    category: "own_dependent",
    entityType: "dependent",
    entityIdFrom: (req, res, body) => body?.dependent?.id ?? body?.id ?? null,
    summary: (req) => `Added dependent ${req.body?.fullName || ""}`.trim(),
  }),
  createDependent
);
router.put(
  "/:id",
  auditMutation({
    action: "dependent.update",
    category: "own_dependent",
    entityType: "dependent",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Updated dependent #${req.params?.id}`,
  }),
  updateDependent
);
router.delete(
  "/:id",
  auditMutation({
    action: "dependent.delete",
    category: "own_dependent",
    entityType: "dependent",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Deleted dependent #${req.params?.id}`,
  }),
  deleteDependent
);
router.get("/:id/documents", getDependentDocuments);
router.post(
  "/:id/documents",
  uploadDependentMulter.fields([
    { name: "documents", maxCount: 10 },
    { name: "cccdFiles", maxCount: 2 }
  ]),
  auditMutation({
    action: "dependent.upload_documents",
    category: "own_dependent",
    entityType: "dependent",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Uploaded documents for dependent #${req.params?.id}`,
  }),
  uploadDependentDocuments
);

// HR hoặc Manager xem và duyệt người phụ thuộc
router.get("/", hrOrManager, getAllDependents);
router.get("/:id", hrOrManager, getDependentById);
router.put("/:id/approve", hrOrManager, approveDependentRequest);
router.put("/:id/reject", hrOrManager, rejectDependentRequest);

export default router;

