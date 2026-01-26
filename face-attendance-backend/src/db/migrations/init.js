import sequelize from "../sequelize.js";
import { User, FaceProfile, AttendanceLog, ShiftSetting, Salary, SalaryRule } from "../../models/pg/index.js";

async function migrate() {
  try {
    console.log("🚀 Running migrations (sync)...");

    // Ensure all models are loaded
    void User && void FaceProfile && void AttendanceLog && void ShiftSetting && void Salary && void SalaryRule;

    await sequelize.sync({ alter: true });
    console.log("✅ Migrations completed (schema synced)");
    console.log("📊 Models included:");
    console.log("   - User");
    console.log("   - FaceProfile");
    console.log("   - AttendanceLog");
    console.log("   - ShiftSetting");
    console.log("   - Salary");
    console.log("   - SalaryRule");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();



