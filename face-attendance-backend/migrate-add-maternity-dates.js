import sequelize from "./src/db/sequelize.js";
import { DataTypes } from "sequelize";

(async () => {
  try {
    console.log("🔄 Adding maternityStartDate and maternityEndDate columns to users table...");
    
    await sequelize.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "maternityStartDate" TIMESTAMP WITH TIME ZONE;
    `);
    
    await sequelize.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "maternityEndDate" TIMESTAMP WITH TIME ZONE;
    `);
    
    console.log("✅ Columns added successfully!");
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    await sequelize.close();
    process.exit(1);
  }
})();
