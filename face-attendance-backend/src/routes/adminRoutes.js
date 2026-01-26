import express from "express";
import {
  getAllEmployees,
  getEmployeeById,
  getEmployeeWithPassword,
  updateEmployee,
  deleteEmployee,
  permanentlyDeleteEmployee,
  resetEmployeePassword,
  getEmployeeAttendanceStats,
  getEmployeeDetailedInfo
} from "../controllers/adminController.js";
import { authMiddleware, adminOnly, adminOrAccountant } from "../middleware/authMiddleware.js";
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

// Protected admin/accountant endpoints
router.use(authMiddleware);
router.use(adminOrAccountant);

router.get("/employees", getAllEmployees);
router.get("/employees/:id", getEmployeeById);
router.get("/employees/:id/details", getEmployeeDetailedInfo);

// Admin only endpoints
router.get("/employees/:id/with-password", adminOnly, getEmployeeWithPassword);
router.put("/employees/:id", adminOnly, updateEmployee);
router.delete("/employees/:id", adminOnly, deleteEmployee);
router.delete("/employees/:id/permanent", adminOnly, permanentlyDeleteEmployee);
router.post("/employees/:id/reset-password", adminOnly, resetEmployeePassword);
router.get("/employees/:id/attendance-stats", getEmployeeAttendanceStats);

export default router;
