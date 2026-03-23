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

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên quản lý người phụ thuộc của mình
router.get("/my", getMyDependents);
router.post("/", createDependent);
router.put("/:id", updateDependent);
router.delete("/:id", deleteDependent);
router.get("/:id/documents", getDependentDocuments);
router.post("/:id/documents", uploadDependentMulter.array("documents", 10), uploadDependentDocuments);

// HR hoặc Manager xem và duyệt người phụ thuộc
router.get("/", hrOrManager, getAllDependents);
router.get("/:id", hrOrManager, getDependentById);
router.put("/:id/approve", hrOrManager, approveDependentRequest);
router.put("/:id/reject", hrOrManager, rejectDependentRequest);

export default router;

