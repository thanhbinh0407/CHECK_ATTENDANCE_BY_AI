import express from "express";
import { register, login, getCurrentUser, changePassword } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", getCurrentUser);
router.post("/change-password", authMiddleware, changePassword);

export default router;
