import sequelize from "../sequelize.js";
import { User, FaceProfile, AttendanceLog, ShiftSetting, Salary, SalaryRule } from "../../models/pg/index.js";

const DROP_DB = process.env.DROP_DB === 'true' || process.argv.includes('--drop');

async function resetDatabase() {
  try {
    console.log("🚀 Starting database reset...");
    await sequelize.authenticate();
    console.log("✅ Database connection OK");

    // Ensure all models are loaded
    void User && void FaceProfile && void AttendanceLog && void ShiftSetting && void Salary && void SalaryRule;

    if (DROP_DB) {
      console.log("⚠️  DROP_DB=true — xóa toàn bộ schema public (mọi bảng/type)...");
      await sequelize.query("DROP SCHEMA IF EXISTS public CASCADE");
      await sequelize.query("CREATE SCHEMA public");
      // Quyền mặc định cho user kết nối (tránh lỗi permission sau khi tạo schema)
      const user = sequelize.config.username;
      if (user) {
        await sequelize.query(`GRANT ALL ON SCHEMA public TO "${user.replace(/"/g, '""')}"`);
        await sequelize.query(`GRANT ALL ON SCHEMA public TO public`);
      }
      console.log("✅ Schema public trống — tạo lại bảng từ model");
    }

    console.log("🔄 Syncing database schema...");
    // Sau khi drop schema chỉ cần sync tạo bảng (không dùng force/alter để tránh lỗi ENUM USING trên PG)
    await sequelize.sync({ force: false, alter: !DROP_DB });
    
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

