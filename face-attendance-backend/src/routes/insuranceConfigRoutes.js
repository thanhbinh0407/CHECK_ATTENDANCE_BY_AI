import express from "express";
import {
  getInsuranceConfigs,
  getInsuranceConfigById,
  createInsuranceConfig,
  updateInsuranceConfig,
  deleteInsuranceConfig,
  getActiveInsuranceConfig
} from "../controllers/insuranceConfigController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// All routes require admin role
router.use(adminOnly);

// Get all insurance configs
router.get("/", getInsuranceConfigs);

// Get active insurance config
router.get("/active", getActiveInsuranceConfig);

// Get insurance config by ID
router.get("/:id", getInsuranceConfigById);

// Create insurance config
router.post("/", createInsuranceConfig);

// Update insurance config
router.put("/:id", updateInsuranceConfig);

// Delete insurance config
router.delete("/:id", deleteInsuranceConfig);

export default router;

