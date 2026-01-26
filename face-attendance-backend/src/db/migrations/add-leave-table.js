import sequelize from "../sequelize.js";
import { DataTypes } from "sequelize";
import LeaveRequest from "../../models/pg/LeaveRequest.js";

const queryInterface = sequelize.getQueryInterface();

async function addLeaveTable() {
  try {
    console.log("🚀 Adding leave_requests table...");

    // Check if table exists
    const tableExists = await queryInterface.tableExists('leave_requests');
    
    if (!tableExists) {
      console.log("Creating leave_requests table...");
      await LeaveRequest.sync({ alter: true });
      console.log("✅ leave_requests table created");
    } else {
      console.log("⚠️  leave_requests table already exists");
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

addLeaveTable();

