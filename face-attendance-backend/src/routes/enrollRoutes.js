import express from "express";
import { registerUser } from "../controllers/enrollController.js";
import { authMiddleware, hrOrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// HR hoặc Manager mới được đăng ký khuôn mặt
router.post("/register", authMiddleware, hrOrManager, registerUser);

export default router;
