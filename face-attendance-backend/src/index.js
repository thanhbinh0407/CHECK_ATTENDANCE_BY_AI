import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import sequelize from "./db/sequelize.js";
import authRoutes from "./routes/authRoutes.js";
import enrollRoutes from "./routes/enrollRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import debugRoutes from "./routes/debugRoutes.js";
import antiSpoofRoutes from "./routes/antiSpoofRoutes.js";
import shiftRoutes from "./routes/shiftRoutes.js";
import salaryRoutes from "./routes/salaryRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import jobTitleRoutes from "./routes/jobTitleRoutes.js";
import qualificationRoutes from "./routes/qualificationRoutes.js";
import dependentRoutes from "./routes/dependentRoutes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerDoc } from "./swagger.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "15mb" }));

// Debug middleware
app.use((req, res, next) => {
  if (req.path.includes("/enroll")) {
    console.log("Enroll request:", req.body);
  }
  next();
});

// Connect PostgreSQL 17
try {
  await sequelize.authenticate();
  console.log("PostgreSQL 17 connection successful");
  await sequelize.sync();
  console.log("PostgreSQL schema synced");
  
  console.log("PostgreSQL 17 connection successful");
} catch (err) {
  console.error("PostgreSQL connection failed:", err.message);
}

// Setup scheduled tasks for notifications
import { checkLateArrivals } from "./controllers/notificationController.js";
// Check for late arrivals every hour
setInterval(async () => {
  try {
    await checkLateArrivals();
  } catch (err) {
    console.error("Error checking late arrivals:", err);
  }
}, 60 * 60 * 1000); // Every hour

app.use("/api/auth", authRoutes);
app.use("/api/enroll", enrollRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/anti-spoof", antiSpoofRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/job-titles", jobTitleRoutes);
app.use("/api/qualifications", qualificationRoutes);
app.use("/api/dependents", dependentRoutes);
app.use("/api", debugRoutes);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.get("/", (req, res) => res.send("Face Attendance Backend Running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend trên http://localhost:${PORT}`));
