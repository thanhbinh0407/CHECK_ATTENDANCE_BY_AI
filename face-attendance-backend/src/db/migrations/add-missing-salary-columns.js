import sequelize from "../sequelize.js";
import { DataTypes } from "sequelize";

const queryInterface = sequelize.getQueryInterface();

async function addMissingSalaryColumns() {
  try {
    console.log("🚀 Adding missing columns to salaries table...");

    // Check if salaries table exists
    try {
      await queryInterface.describeTable('salaries');
      console.log("✅ salaries table exists");
    } catch (err) {
      console.log("❌ salaries table does not exist. Please run add-salary-tables.js first");
      process.exit(1);
    }

    const tableDescription = await queryInterface.describeTable('salaries');

    // Add grossSalary column if it doesn't exist
    if (!tableDescription.grossSalary) {
      console.log("Adding grossSalary column to salaries table...");
      await queryInterface.addColumn('salaries', 'grossSalary', {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        allowNull: true
      });
      console.log("✅ grossSalary column added");
    } else {
      console.log("⚠️  grossSalary column already exists");
    }

    // Add advanceDeduction column if it doesn't exist
    if (!tableDescription.advanceDeduction) {
      console.log("Adding advanceDeduction column to salaries table...");
      await queryInterface.addColumn('salaries', 'advanceDeduction', {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        allowNull: true
      });
      console.log("✅ advanceDeduction column added");
    } else {
      console.log("⚠️  advanceDeduction column already exists");
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

addMissingSalaryColumns();