import sequelize from "../sequelize.js";
import { DataTypes } from "sequelize";

const queryInterface = sequelize.getQueryInterface();

async function addAutoCheckoutFlag() {
  try {
    console.log("🚀 Adding isAuto column to attendance_logs...");

    const tableDescription = await queryInterface.describeTable('attendance_logs');
    if (!tableDescription.isAuto) {
      console.log("Adding isAuto column...");
      await queryInterface.addColumn('attendance_logs', 'isAuto', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flags an attendance record created automatically by the auto-checkout scheduler'
      });
      console.log("✅ isAuto column added successfully!");
    } else {
      console.log("⚠️  isAuto column already exists");
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

addAutoCheckoutFlag();