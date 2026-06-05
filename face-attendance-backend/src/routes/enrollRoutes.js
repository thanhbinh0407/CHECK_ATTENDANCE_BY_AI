import express from "express";
import { checkFaceDuplicate, registerUser, updateUserFace } from "../controllers/enrollController.js";
import { authMiddleware, hrOrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// HR hoặc Manager mới được đăng ký khuôn mặt
router.post("/register", authMiddleware, hrOrManager, registerUser);
router.post("/check-face", authMiddleware, hrOrManager, checkFaceDuplicate);
router.put("/face", authMiddleware, hrOrManager, updateUserFace);

export default router;
