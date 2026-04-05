import express from "express";
import {
  getUserSeniority,
  applySalaryIncrease,
  applySalaryIncreasesForAll
} from "../controllers/senioritySalaryController.js";
import { authMiddleware, accountantOrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Tất cả có thể xem thâm niên của nhân viên
router.get("/user/:userId", getUserSeniority);

// Kế toán hoặc Manager mới tăng lương theo thâm niên
router.post("/user/:userId/apply", accountantOrManager, applySalaryIncrease);
router.post("/apply-all", accountantOrManager, applySalaryIncreasesForAll);

export default router;

