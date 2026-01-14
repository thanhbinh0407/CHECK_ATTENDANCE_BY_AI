import express from "express";
import { logAttendance } from "../src/controllers/attendanceController.js";

const router = express.Router();

router.post("/log", logAttendance);

export default router;
