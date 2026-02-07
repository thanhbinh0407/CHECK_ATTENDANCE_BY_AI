import express from "express";
import {
  getWorkExperiences,
  createWorkExperience,
  updateWorkExperience,
  deleteWorkExperience
} from "../controllers/workExperienceController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all work experiences for an employee
router.get("/:userId", getWorkExperiences);

// Create work experience
router.post("/:userId", createWorkExperience);

// Update work experience
router.put("/:id", updateWorkExperience);

// Delete work experience
router.delete("/:id", deleteWorkExperience);

export default router;

