import sequelize from "../sequelize.js";
import { DataTypes } from "sequelize";
import { AttendanceLog } from "../../models/pg/index.js";

const queryInterface = sequelize.getQueryInterface();

async function addImageColumn() {
  try {
    console.log("🚀 Adding imageBase64 column to attendance_logs...");

    // Check if column exists
    const tableDescription = await queryInterface.describeTable('attendance_logs');
    
    if (!tableDescription.imageBase64) {
      console.log("Adding imageBase64 column...");
      await queryInterface.addColumn('attendance_logs', 'imageBase64', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Base64 encoded image captured at attendance time'
      });
      console.log("✅ imageBase64 column added successfully!");
    } else {
      console.log("⚠️  imageBase64 column already exists");
    }

    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addImageColumn();

