import express from "express";
import { registerUser } from "../controllers/enrollController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", authMiddleware, adminOnly, registerUser);

export default router;
