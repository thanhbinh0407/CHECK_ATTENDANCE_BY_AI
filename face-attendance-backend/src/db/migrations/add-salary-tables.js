import sequelize from "../sequelize.js";
import { DataTypes } from "sequelize";

const queryInterface = sequelize.getQueryInterface();

async function addSalaryTables() {
  try {
    console.log("🚀 Adding salary-related tables and columns...");

    // Add baseSalary column to users table if it doesn't exist
    try {
      await queryInterface.describeTable('users');
      const tableDescription = await queryInterface.describeTable('users');
      
      if (!tableDescription.baseSalary) {
        console.log("Adding baseSalary column to users table...");
        await queryInterface.addColumn('users', 'baseSalary', {
          type: DataTypes.DECIMAL(12, 2),
          defaultValue: 0,
          allowNull: true
        });
        console.log("✅ baseSalary column added");
      } else {
        console.log("⚠️  baseSalary column already exists");
      }
    } catch (err) {
      console.log("⚠️  Error checking/adding baseSalary:", err.message);
    }

    // Create salary_rules table
    try {
      await queryInterface.describeTable('salary_rules');
      console.log("⚠️  salary_rules table already exists");
    } catch (err) {
      console.log("Creating salary_rules table...");
      await queryInterface.createTable('salary_rules', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM('bonus', 'deduction'),
          allowNull: false,
        },
        triggerType: {
          type: DataTypes.ENUM('late', 'early_leave', 'absent', 'overtime', 'full_attendance', 'custom'),
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        amountType: {
          type: DataTypes.ENUM('fixed', 'percentage'),
          defaultValue: 'fixed',
        },
        threshold: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        priority: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
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
      console.log("✅ salary_rules table created");
    }

    // Create salaries table
    try {
      await queryInterface.describeTable('salaries');
      console.log("⚠️  salaries table already exists");
    } catch (err) {
      console.log("Creating salaries table...");
      await queryInterface.createTable('salaries', {
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
        baseSalary: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        bonus: {
          type: DataTypes.DECIMAL(12, 2),
          defaultValue: 0,
        },
        deduction: {
          type: DataTypes.DECIMAL(12, 2),
          defaultValue: 0,
        },
        finalSalary: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        month: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        year: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('pending', 'approved', 'paid'),
          defaultValue: 'pending',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        calculatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        paidAt: {
          type: DataTypes.DATE,
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

      // Add unique index
      await queryInterface.addIndex('salaries', ['userId', 'month', 'year'], {
        unique: true,
        name: 'salaries_user_month_year_unique'
      });

      console.log("✅ salaries table created");
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

addSalaryTables();

