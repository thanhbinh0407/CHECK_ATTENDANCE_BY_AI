import express from "express";
import { logAttendance, getTodayAttendance, matchFace, getTodayStatus } from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/log", logAttendance);
router.get("/today", getTodayAttendance);
router.post("/match", matchFace);
router.get("/status", getTodayStatus);

export default router;
