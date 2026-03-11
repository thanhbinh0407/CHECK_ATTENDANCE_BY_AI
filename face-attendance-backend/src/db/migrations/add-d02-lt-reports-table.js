import sequelize from '../sequelize.js';
import { QueryInterface, DataTypes } from 'sequelize';

const queryInterface = sequelize.getQueryInterface();

async function addD02LTReportsTable() {
  try {
    console.log('Creating d02_lt_reports table...');

    // Check if table exists
    const tableExists = await queryInterface.describeTable('d02_lt_reports').catch(() => null);

    if (tableExists) {
      console.log('⚠️  d02_lt_reports table already exists');
      return;
    }

    // Create table
    await queryInterface.createTable('d02_lt_reports', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      tenDonVi: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      maDonVi: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      maSoThue: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      diaChi: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      soDienThoai: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ngay: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      thang: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      nam: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      }
    });

    console.log('✅ d02_lt_reports table created successfully');
  } catch (error) {
    console.error('❌ Error creating d02_lt_reports table:', error);
    throw error;
  }
}

// Run migration
addD02LTReportsTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });