import sequelize from "../sequelize.js";
import { User, FaceProfile, AttendanceLog, ShiftSetting, Salary, SalaryRule } from "../../models/pg/index.js";

const DROP_DB = process.env.DROP_DB === 'true' || process.argv.includes('--drop');

async function resetDatabase() {
  try {
    console.log("🚀 Starting database reset...");
    
    if (DROP_DB) {
      console.log("⚠️  DROP_DB=true detected - Dropping all tables...");
      await sequelize.drop();
      console.log("✅ All tables dropped");
    }

    console.log("🔄 Syncing database schema...");
    
    // Ensure all models are loaded
    void User && void FaceProfile && void AttendanceLog && void ShiftSetting && void Salary && void SalaryRule;

    // Sync with force: true to drop and recreate
    await sequelize.sync({ force: DROP_DB, alter: !DROP_DB });
    
    console.log("✅ Database schema synced successfully");
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
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

resetDatabase();

