import sequelize from './src/db/sequelize.js';
import { DataTypes } from 'sequelize';

const queryInterface = sequelize.getQueryInterface();

async function addJobFields() {
  try {
    console.log("🚀 Adding job-related fields to users table...");

    // Check if columns exist before adding
    const tableDescription = await queryInterface.describeTable('users');

    // Add jobTitle column
    if (!tableDescription.jobTitle) {
      console.log("Adding jobTitle column...");
      await queryInterface.addColumn('users', 'jobTitle', {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Chức vụ (Nhân viên CNTT, Chuyên viên CNTT, ...)'
      });
      console.log("✅ jobTitle column added");
    } else {
      console.log("⚠️  jobTitle column already exists");
    }

    // Add educationLevel column
    if (!tableDescription.educationLevel) {
      console.log("Adding educationLevel column...");
      await queryInterface.addColumn('users', 'educationLevel', {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Trình độ (Trung cấp, Cao đẳng, Đại học, Sau đại học)'
      });
      console.log("✅ educationLevel column added");
    } else {
      console.log("⚠️  educationLevel column already exists");
    }

    // Add certificates column (JSONB for PostgreSQL)
    if (!tableDescription.certificates) {
      console.log("Adding certificates column...");
      await queryInterface.addColumn('users', 'certificates', {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: true,
        comment: 'Mảng chứng chỉ (ví dụ: ["CCASP"])'
      });
      console.log("✅ certificates column added");
    } else {
      console.log("⚠️  certificates column already exists");
    }

    // Add dependents column
    if (!tableDescription.dependents) {
      console.log("Adding dependents column...");
      await queryInterface.addColumn('users', 'dependents', {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true,
        comment: 'Số người phụ thuộc'
      });
      console.log("✅ dependents column added");
    } else {
      console.log("⚠️  dependents column already exists");
    }

    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err.message);
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

addJobFields();

