import sequelize from "../sequelize.js";
import { DataTypes } from "sequelize";

const queryInterface = sequelize.getQueryInterface();

async function migrate() {
  try {
    console.log("Adding disbursedAt / disbursedBy to salary_advances...");

    let tableDescription;
    try {
      tableDescription = await queryInterface.describeTable("salary_advances");
    } catch (err) {
      console.log("salary_advances table missing, skip:", err.message);
      process.exit(0);
    }

    if (!tableDescription.disbursedAt) {
      await queryInterface.addColumn("salary_advances", "disbursedAt", {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log("✅ disbursedAt added");
    } else {
      console.log("⚠️ disbursedAt already exists");
    }

    if (!tableDescription.disbursedBy) {
      await queryInterface.addColumn("salary_advances", "disbursedBy", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
      console.log("✅ disbursedBy added");
    } else {
      console.log("⚠️ disbursedBy already exists");
    }

    console.log("✅ Migration completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
