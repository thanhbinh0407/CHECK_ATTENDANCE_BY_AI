import express from "express";
import { register, login, getCurrentUser, changePassword } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { auditMutation } from "../services/actionAuditService.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", getCurrentUser);
router.post(
  "/change-password",
  authMiddleware,
  auditMutation({
    action: "profile.change_password",
    category: "own_profile",
    entityType: "user",
    entityIdFrom: (req) => req.user?.userId ?? req.user?.id ?? null,
    summary: () => "Changed own password",
  }),
  changePassword
);

export default router;
