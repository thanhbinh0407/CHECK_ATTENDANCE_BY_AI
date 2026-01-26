import express from "express";
import {
  getAllDependents,
  getDependentById,
  createDependent,
  updateDependent,
  deleteDependent,
  approveDependentRequest,
  rejectDependentRequest,
  getMyDependents
} from "../controllers/dependentController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Employee can view and manage own dependents
router.get("/my", getMyDependents);
router.post("/", createDependent);
router.put("/:id", updateDependent);
router.delete("/:id", deleteDependent);

// Admin only routes
router.get("/", adminOnly, getAllDependents);
router.get("/:id", adminOnly, getDependentById);
router.put("/:id/approve", adminOnly, approveDependentRequest);
router.put("/:id/reject", adminOnly, rejectDependentRequest);

export default router;

