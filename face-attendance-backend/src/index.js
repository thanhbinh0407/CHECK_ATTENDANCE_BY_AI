import 'dotenv/config';
import express from "express";
import cors from "cors";
import { createServer } from 'http';
import { initSocket } from './socket.js';
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
import workExperienceRoutes from "./routes/workExperienceRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import overtimeRoutes from "./routes/overtimeRoutes.js";
import businessTripRoutes from "./routes/businessTripRoutes.js";
import salaryAdvanceRoutes from "./routes/salaryAdvanceRoutes.js";
import salaryGradeRoutes from "./routes/salaryGradeRoutes.js";
import senioritySalaryRoutes from "./routes/senioritySalaryRoutes.js";
import insuranceConfigRoutes from "./routes/insuranceConfigRoutes.js";
import insuranceRoutes from "./routes/insuranceRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import taxRoutes from "./routes/taxRoutes.js";
import excelExportRoutes from "./routes/excelExportRoutes.js";
import insuranceFormRoutes from "./routes/insuranceFormRoutes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerDoc } from "./swagger.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "15mb" }));

// Serve static files from uploads directory
// Multer stores files under "<projectRoot>/uploads", so serve from process.cwd()
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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

  // Create ENUM types first (if not exists) to avoid "syntax error at or near USING"
  try {
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_contractType" AS ENUM ('probation', '1_year', '3_year', 'indefinite', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_employmentStatus" AS ENUM ('active', 'maternity_leave', 'unpaid_leave', 'suspended', 'terminated', 'resigned');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_gender" AS ENUM ('male', 'female', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_educationLevel" AS ENUM ('high_school', 'vocational', 'college', 'university', 'master', 'phd', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_documents_documentType" AS ENUM ('id_card', 'contract', 'certificate', 'appointment_decision', 'salary_decision', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => { });

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_overtime_requests_approvalStatus" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => { });

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_business_trip_requests_transportType" AS ENUM ('plane', 'train', 'bus', 'car', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => { });

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_approval_workflows_requestType" AS ENUM ('leave', 'overtime', 'business_trip', 'salary_advance', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => { });

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_approval_workflows_status" AS ENUM ('pending', 'approved', 'rejected', 'skipped');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => { });

    // Ensure the notifications enum contains every type used by the codebase.
    // PostgreSQL ENUM values can only be added (not removed) at runtime, so we
    // fan-out one ALTER TYPE per value and ignore duplicates. This avoids the
    // "invalid input value for enum enum_notifications_type" runtime errors
    // when creating notifications for overtime/business trip/etc.
    const notificationEnumValues = [
      'attendance',
      'late',
      'leave',
      'leave_request',
      'salary',
      'salary_advance',
      'salary_advance_request',
      'overtime',
      'overtime_request',
      'business_trip',
      'business_trip_request',
      'qualification',
      'qualification_request',
      'dependent',
      'work_experience',
      'document',
      'attendance_warning',
      'birthday',
      'anniversary',
      'system',
      'alert',
    ];
    for (const value of notificationEnumValues) {
      try {
        await sequelize.query(
          `ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS '${value}';`
        );
      } catch (e) {
        // ignore: enum or value missing in fresh DBs (sync will create the type)
      }
    }

    console.log("✅ ENUM types created/verified");
  } catch (enumErr) {
    console.warn("⚠️ ENUM types creation warning:", enumErr.message);
  }

  // Use sync without alter to avoid "USING" syntax errors with ENUM types
  // Migrations should handle schema changes instead
  try {
    await sequelize.sync({ alter: true });
    console.log("PostgreSQL schema synced");
  } catch (syncErr) {
    // If sync fails (e.g., due to ENUM type issues), log warning but continue
    // Migrations should handle schema changes
    console.warn("⚠️ Schema sync warning (this is OK if using migrations):", syncErr.message);
    console.log("✅ Backend will continue running. Use migrations for schema changes.");
  }
} catch (err) {
  console.error("PostgreSQL connection failed:", err.message);
  console.error(err.stack);
}

// Setup scheduled tasks for notifications
import { checkLateArrivals } from "./controllers/notificationController.js";
import { checkContractExpiration, notifyBirthdays, notifyWorkAnniversaries } from "./services/notificationService.js";
import { performAutoCheckout } from "./services/autoCheckoutService.js";
// Check for late arrivals every hour
setInterval(async () => {
  try {
    await checkLateArrivals();
  } catch (err) {
    console.error("Error checking late arrivals:", err);
  }
}, 60 * 60 * 1000); // Every hour

// Check contract expiration daily at 9 AM
setInterval(async () => {
  try {
    await checkContractExpiration();
  } catch (err) {
    console.error("Error checking contract expiration:", err);
  }
}, 24 * 60 * 60 * 1000); // Every 24 hours

// Check birthdays and anniversaries daily at 8 AM
setInterval(async () => {
  try {
    await notifyBirthdays();
    await notifyWorkAnniversaries();
  } catch (err) {
    console.error("Error notifying birthdays/anniversaries:", err);
  }
}, 24 * 60 * 60 * 1000); // Every 24 hours

// Perform auto checkout every minute for near-real-time auto check-out handling
setInterval(async () => {
  try {
    await performAutoCheckout();
  } catch (err) {
    console.error("Error performing auto checkout:", err);
  }
}, 60 * 1000); // Every 1 minute

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
app.use("/api/work-experiences", workExperienceRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/overtime-requests", overtimeRoutes);
app.use("/api/business-trip-requests", businessTripRoutes);
app.use("/api/salary-advances", salaryAdvanceRoutes);
app.use("/api/salary-grades", salaryGradeRoutes);
app.use("/api/seniority-salary", senioritySalaryRoutes);
app.use("/api/insurance-configs", insuranceConfigRoutes);
app.use("/api/insurance", insuranceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/export", excelExportRoutes);
app.use("/api/insurance-forms", insuranceFormRoutes);
app.use("/api", debugRoutes);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.get("/", (req, res) => res.send("Face Attendance Backend Running"));
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "face-attendance-backend",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Another backend instance may already be running.`);
    console.error("   Stop the existing process or set PORT to a different value before starting this server.");
    process.exit(0);
  }

  console.error("❌ HTTP server failed to start:", error);
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Backend trên http://localhost:${PORT} (Socket.io enabled)`);
});