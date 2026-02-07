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
import workExperienceRoutes from "./routes/workExperienceRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import overtimeRoutes from "./routes/overtimeRoutes.js";
import businessTripRoutes from "./routes/businessTripRoutes.js";
import salaryAdvanceRoutes from "./routes/salaryAdvanceRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import taxRoutes from "./routes/taxRoutes.js";
import excelExportRoutes from "./routes/excelExportRoutes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerDoc } from "./swagger.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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
    `).catch(() => {});

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_overtime_requests_approvalStatus" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => {});

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_business_trip_requests_transportType" AS ENUM ('plane', 'train', 'bus', 'car', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => {});

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_approval_workflows_requestType" AS ENUM ('leave', 'overtime', 'business_trip', 'salary_advance', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => {});

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_approval_workflows_status" AS ENUM ('pending', 'approved', 'rejected', 'skipped');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => {});
    
    console.log("✅ ENUM types created/verified");
  } catch (enumErr) {
    console.warn("⚠️ ENUM types creation warning:", enumErr.message);
  }
  
  // Use sync without alter to avoid "USING" syntax errors with ENUM types
  // Migrations should handle schema changes instead
  try {
    await sequelize.sync({ alter: false });
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
app.use("/api/reports", reportRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/export", excelExportRoutes);
app.use("/api", debugRoutes);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.get("/", (req, res) => res.send("Face Attendance Backend Running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend trên http://localhost:${PORT}`));
