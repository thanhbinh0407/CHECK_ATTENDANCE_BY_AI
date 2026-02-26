import express from "express";
import {
  getSalaryGrades,
  getSalaryGradeById,
  createSalaryGrade,
  updateSalaryGrade,
  deleteSalaryGrade
} from "../controllers/salaryGradeController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// All routes require admin role
router.use(adminOnly);

// Get all salary grades
router.get("/", getSalaryGrades);

// Get salary grade by ID
router.get("/:id", getSalaryGradeById);

// Create salary grade
router.post("/", createSalaryGrade);

// Update salary grade
router.put("/:id", updateSalaryGrade);

// Delete salary grade
router.delete("/:id", deleteSalaryGrade);

export default router;

