import express from "express";
import {
  getEmployeeAnnualTaxSummary,
  getAllEmployeesAnnualTaxSummaryController
} from "../controllers/taxController.js";
import { authMiddleware, adminOrAccountant } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin/accountant role
router.use(authMiddleware);
router.use(adminOrAccountant);

// Get annual tax summary for a specific employee
router.get("/annual-summary", getEmployeeAnnualTaxSummary);

// Get annual tax summary for all employees
router.get("/annual-summary-all", getAllEmployeesAnnualTaxSummaryController);

export default router;


