import express from "express";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  updateDocument
} from "../controllers/documentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { auditMutation } from "../services/actionAuditService.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all documents for an employee
router.get("/:userId", getDocuments);

// Upload document
router.post(
  "/:userId",
  auditMutation({
    action: "document.upload",
    category: "own_document",
    entityType: "document",
    targetUserIdFrom: (req) => Number(req.params?.userId) || null,
    entityIdFrom: (req, res, body) => body?.document?.id ?? body?.id ?? null,
    summary: (req) => `Uploaded document for user #${req.params?.userId}`,
  }),
  uploadDocument
);

// Update document
router.put(
  "/:id",
  auditMutation({
    action: "document.update",
    category: "own_document",
    entityType: "document",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Updated document #${req.params?.id}`,
  }),
  updateDocument
);

// Delete document
router.delete(
  "/:id",
  auditMutation({
    action: "document.delete",
    category: "own_document",
    entityType: "document",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Deleted document #${req.params?.id}`,
  }),
  deleteDocument
);

export default router;



