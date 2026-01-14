import express from "express";
import {
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  permanentlyDeleteEmployee,
  resetEmployeePassword,
  getEmployeeAttendanceStats
} from "../controllers/adminController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import User from "../models/pg/User.js";

const router = express.Router();

// Public endpoints
router.get("/logs", async (req, res) => {
  try {
    const logs = await AttendanceLog.findAll({
      include: [{
        model: User,
        attributes: ['id', 'name', 'email', 'employeeCode']
      }],
      order: [["timestamp", "DESC"]],
      limit: 1000
    });
    res.json({ status: "success", logs });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Protected admin endpoints
router.use(authMiddleware);
router.use(adminOnly);

router.get("/employees", getAllEmployees);
router.get("/employees/:id", getEmployeeById);
router.put("/employees/:id", updateEmployee);
router.delete("/employees/:id", deleteEmployee);
router.delete("/employees/:id/permanent", permanentlyDeleteEmployee);
router.post("/employees/:id/reset-password", resetEmployeePassword);
router.get("/employees/:id/attendance-stats", getEmployeeAttendanceStats);

export default router;
