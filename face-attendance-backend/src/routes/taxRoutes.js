import express from "express";
import {
  getEmployeeAnnualTaxSummary,
  getAllEmployeesAnnualTaxSummaryController,
  calculateTax
} from "../controllers/taxController.js";
import { authMiddleware, adminOrAccountant } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Calculate tax for current user (employees can access their own)
router.get("/calculate", calculateTax);

// Admin/accountant only routes
router.use(adminOrAccountant);

// Get annual tax summary for a specific employee
router.get("/annual-summary", getEmployeeAnnualTaxSummary);

// Get annual tax summary for all employees
router.get("/annual-summary-all", getAllEmployeesAnnualTaxSummaryController);

export default router;


