import express from "express";
import {
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from "../controllers/notificationController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";
import { auditMutation } from "../services/actionAuditService.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user's notifications
router.get("/", getNotifications);
router.put(
  "/:id/read",
  auditMutation({
    action: "notification.mark_read",
    category: "own_notification",
    entityType: "notification",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Marked notification #${req.params?.id} as read`,
  }),
  markAsRead
);
router.put(
  "/read-all",
  auditMutation({
    action: "notification.mark_all_read",
    category: "own_notification",
    summary: () => "Marked all notifications as read",
  }),
  markAllAsRead
);
router.delete(
  "/:id",
  auditMutation({
    action: "notification.delete",
    category: "own_notification",
    entityType: "notification",
    entityIdFrom: (req) => Number(req.params?.id) || null,
    summary: (req) => `Deleted notification #${req.params?.id}`,
  }),
  deleteNotification
);

// Admin only: send notification
router.post("/send", adminOnly, sendNotification);

export default router;

