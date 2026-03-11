import express from "express";
import { getEmployeeInsurance } from "../controllers/insuranceController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get insurance details for an employee
router.get("/employee", getEmployeeInsurance);

export default router;