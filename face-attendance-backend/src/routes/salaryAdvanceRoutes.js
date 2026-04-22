import express from "express";
import {
  getSalaryAdvances,
  createSalaryAdvance,
  approveSalaryAdvance,
  markDeducted,
  getSalaryAdvanceSalaryPreview,
  disburseSalaryAdvance,
} from "../controllers/salaryAdvanceController.js";
import { authMiddleware, accountantOrSupervisor, accountantOnly } from "../middleware/authMiddleware.js";
import { auditMutation } from "../services/actionAuditService.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên tạo và xem đơn tạm ứng
router.get("/", getSalaryAdvances);
router.post(
  "/",
  auditMutation({
    action: "salary_advance.create",
    category: "own_request",
    entityType: "salary_advance",
    entityIdFrom: (req, res, body) => body?.request?.id ?? body?.id ?? null,
    summary: () => "Submitted salary advance request",
    metadata: (req) => ({
      amount: req.body?.amount,
      month: req.body?.month,
      year: req.body?.year,
    }),
  }),
  createSalaryAdvance
);

router.get("/:id/salary-preview", getSalaryAdvanceSalaryPreview);

// Kế toán hoặc Supervisor duyệt tạm ứng lương
router.put("/:id/approve", accountantOrSupervisor, approveSalaryAdvance);
router.put("/:id/disburse", accountantOnly, disburseSalaryAdvance);
router.put("/:id/deduct", accountantOrSupervisor, markDeducted);

export default router;



