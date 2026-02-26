import sequelize from '../sequelize.js';
import { QueryInterface, DataTypes } from 'sequelize';

const queryInterface = sequelize.getQueryInterface();

async function addInsuranceFormsTable() {
  try {
    console.log('Creating insurance_forms table...');

    // Create enum type for formType
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_insurance_forms_formType" AS ENUM ('TK1_TS', 'D02_LT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(() => {});

    // Check if table exists
    const tableExists = await queryInterface.describeTable('insurance_forms').catch(() => null);
    
    if (tableExists) {
      console.log('⚠️  insurance_forms table already exists');
      return;
    }

    // Create table
    await queryInterface.createTable('insurance_forms', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      formType: {
        type: DataTypes.ENUM('TK1_TS', 'D02_LT'),
        allowNull: false,
      },
      formData: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
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

    // Create unique index
    await queryInterface.addIndex('insurance_forms', ['userId', 'formType'], {
      unique: true,
      name: 'unique_user_form_type'
    });

    console.log('✅ insurance_forms table created');
  } catch (error) {
    console.error('❌ Error creating insurance_forms table:', error);
    throw error;
  }
}

addInsuranceFormsTable()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

