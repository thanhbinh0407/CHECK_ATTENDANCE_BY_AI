import express from "express";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  updateDocument
} from "../controllers/documentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all documents for an employee
router.get("/:userId", getDocuments);

// Upload document
router.post("/:userId", uploadDocument);

// Update document
router.put("/:id", updateDocument);

// Delete document
router.delete("/:id", deleteDocument);

export default router;



