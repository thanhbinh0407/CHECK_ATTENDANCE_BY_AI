import express from "express";
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from "../controllers/departmentController.js";
import { authMiddleware, hrOrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Đọc: tất cả nhân viên (cần biết phòng ban)
router.get("/", getAllDepartments);
router.get("/:id", getDepartmentById);

// Ghi: HR hoặc Manager
router.post("/", hrOrManager, createDepartment);
router.put("/:id", hrOrManager, updateDepartment);
router.delete("/:id", hrOrManager, deleteDepartment);

export default router;

