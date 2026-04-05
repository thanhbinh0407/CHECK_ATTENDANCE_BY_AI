import express from "express";
import {
  getAllJobTitles,
  getJobTitleById,
  createJobTitle,
  updateJobTitle,
  deleteJobTitle
} from "../controllers/jobTitleController.js";
import { authMiddleware, hrOrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Đọc: tất cả (nhân viên cần biết chức danh)
router.get("/", getAllJobTitles);
router.get("/:id", getJobTitleById);

// Ghi: HR hoặc Manager
router.post("/", hrOrManager, createJobTitle);
router.put("/:id", hrOrManager, updateJobTitle);
router.delete("/:id", hrOrManager, deleteJobTitle);

export default router;

