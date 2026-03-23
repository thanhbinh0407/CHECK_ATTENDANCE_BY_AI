import express from "express";
import {
  getInsuranceConfigs,
  getInsuranceConfigById,
  createInsuranceConfig,
  updateInsuranceConfig,
  deleteInsuranceConfig,
  getActiveInsuranceConfig
} from "../controllers/insuranceConfigController.js";
import { authMiddleware, accountantOrManager, canViewReports } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Kế toán và Supervisor xem cấu hình bảo hiểm
router.get("/", canViewReports, getInsuranceConfigs);
router.get("/active", canViewReports, getActiveInsuranceConfig);
router.get("/:id", canViewReports, getInsuranceConfigById);

// Kế toán hoặc Manager tạo/sửa/xóa cấu hình bảo hiểm
router.post("/", accountantOrManager, createInsuranceConfig);
router.put("/:id", accountantOrManager, updateInsuranceConfig);
router.delete("/:id", accountantOrManager, deleteInsuranceConfig);

export default router;

