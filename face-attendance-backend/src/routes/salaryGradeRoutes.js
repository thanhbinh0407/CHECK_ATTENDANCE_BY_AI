import express from "express";
import {
  getSalaryGrades,
  getSalaryGradeById,
  createSalaryGrade,
  updateSalaryGrade,
  deleteSalaryGrade
} from "../controllers/salaryGradeController.js";
import { authMiddleware, accountantOrManager, canViewReports } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Kế toán và Supervisor có thể xem ngạch lương
router.get("/", canViewReports, getSalaryGrades);
router.get("/:id", canViewReports, getSalaryGradeById);

// Chỉ Kế toán hoặc Manager tạo/sửa/xóa ngạch lương
router.post("/", accountantOrManager, createSalaryGrade);
router.put("/:id", accountantOrManager, updateSalaryGrade);
router.delete("/:id", accountantOrManager, deleteSalaryGrade);

export default router;

