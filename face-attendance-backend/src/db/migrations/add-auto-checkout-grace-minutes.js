import sequelize from "../sequelize.js";
import { DataTypes } from "sequelize";

const queryInterface = sequelize.getQueryInterface();

async function addAutoCheckoutGraceMinutes() {
  try {
    console.log("🚀 Adding autoCheckoutGraceMinutes column to shift_settings...");

    const tableDescription = await queryInterface.describeTable('shift_settings');
    
    if (!tableDescription.autoCheckoutGraceMinutes) {
      console.log("Adding autoCheckoutGraceMinutes column...");
      await queryInterface.addColumn('shift_settings', 'autoCheckoutGraceMinutes', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
        comment: 'Grace period in minutes after shift end time before auto checkout triggers'
      });
      console.log("✅ autoCheckoutGraceMinutes column added successfully!");
    } else {
      console.log("⚠️  autoCheckoutGraceMinutes column already exists");
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

addAutoCheckoutGraceMinutes();