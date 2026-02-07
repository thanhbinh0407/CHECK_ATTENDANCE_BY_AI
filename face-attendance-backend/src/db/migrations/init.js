import sequelize from "../sequelize.js";
import { User, FaceProfile, AttendanceLog, ShiftSetting, Salary, SalaryRule } from "../../models/pg/index.js";

async function migrate() {
  try {
    console.log("🚀 Running migrations (sync)...");

    // Ensure all models are loaded
    void User && void FaceProfile && void AttendanceLog && void ShiftSetting && void Salary && void SalaryRule;

    // Create ENUM types first (if not exists) to avoid "syntax error at or near USING"
    console.log("📝 Creating ENUM types...");
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_contractType" AS ENUM ('probation', '1_year', '3_year', 'indefinite', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch((err) => {
      if (!err.message.includes('duplicate_object')) {
        console.warn('⚠️ contractType ENUM:', err.message);
      }
    });

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_employmentStatus" AS ENUM ('active', 'maternity_leave', 'unpaid_leave', 'suspended', 'terminated', 'resigned');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch((err) => {
      if (!err.message.includes('duplicate_object')) {
        console.warn('⚠️ employmentStatus ENUM:', err.message);
      }
    });

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_gender" AS ENUM ('male', 'female', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch((err) => {
      if (!err.message.includes('duplicate_object')) {
        console.warn('⚠️ gender ENUM:', err.message);
      }
    });

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_educationLevel" AS ENUM ('high_school', 'vocational', 'college', 'university', 'master', 'phd', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch((err) => {
      if (!err.message.includes('duplicate_object')) {
        console.warn('⚠️ educationLevel ENUM:', err.message);
      }
    });

    console.log("✅ ENUM types created/verified");

    // Now sync models
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
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();



