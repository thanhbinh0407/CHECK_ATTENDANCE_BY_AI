import express from "express";
import {
  getWorkExperiences,
  createWorkExperience,
  updateWorkExperience,
  deleteWorkExperience
} from "../controllers/workExperienceController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { auditMutation } from "../services/actionAuditService.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all work experiences for an employee
router.get("/:userId", getWorkExperiences);

// Create work experience
router.post(
  "/:userId",
  auditMutation({
    action: "work_experience.create",
    category: "own_work_experience",
    entityType: "work_experience",
    targetUserIdFrom: (req) => Number(req.params?.userId) || null,
    entityIdFrom: (req, res, body) => body?.workExperience?.id ?? body?.id ?? null,
    summary: () => "Added work experience entry",
  }),
  createWorkExperience
);

// Update work experience
router.put(
  "/:id",
  auditMutation({
    action: "work_experience.update",
    category: "own_work_experience",
    entityType: "work_experience",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Updated work experience #${req.params?.id}`,
  }),
  updateWorkExperience
);

// Delete work experience
router.delete(
  "/:id",
  auditMutation({
    action: "work_experience.delete",
    category: "own_work_experience",
    entityType: "work_experience",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Deleted work experience #${req.params?.id}`,
  }),
  deleteWorkExperience
);

export default router;

