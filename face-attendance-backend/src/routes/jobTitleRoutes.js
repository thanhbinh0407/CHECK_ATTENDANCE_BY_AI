import express from "express";
import {
  getAllJobTitles,
  getJobTitleById,
  createJobTitle,
  updateJobTitle,
  deleteJobTitle
} from "../controllers/jobTitleController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication and admin access
router.use(authMiddleware);
router.use(adminOnly);

router.get("/", getAllJobTitles);
router.get("/:id", getJobTitleById);
router.post("/", createJobTitle);
router.put("/:id", updateJobTitle);
router.delete("/:id", deleteJobTitle);

export default router;

