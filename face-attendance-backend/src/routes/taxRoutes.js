import express from "express";
import {
  getEmployeeAnnualTaxSummary,
  getAllEmployeesAnnualTaxSummaryController,
  calculateTax
} from "../controllers/taxController.js";
import { authMiddleware, canViewReports } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Nhân viên tính thuế của chính mình
router.get("/calculate", calculateTax);

// Kế toán, Supervisor, Manager xem báo cáo thuế
router.use(canViewReports);

router.get("/annual-summary", getEmployeeAnnualTaxSummary);
router.get("/annual-summary-all", getAllEmployeesAnnualTaxSummaryController);

export default router;


