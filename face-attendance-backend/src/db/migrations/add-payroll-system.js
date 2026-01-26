/**
 * Migration Script: Add Pre-built Payroll System
 * 
 * Thêm hệ thống tính lương được cấu hình sẵn dựa trên quy trình:
 * - SalaryPolicy: Chính sách lương theo ca làm và loại hợp đồng
 * - PayrollComponent: Định nghĩa các thành phần thu nhập và khấu trừ
 * - Payroll: Bảng lương tổng hợp theo tháng
 * - PayrollDetail: Chi tiết từng thành phần lương
 * 
 * Thay thế SalaryRule bằng hệ thống pre-built nhưng vẫn cho phép admin chỉnh sửa
 * 
 * Migration Date: January 25, 2026
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("\n=== Creating Payroll System Tables ===\n");

      // 1. Create salary_policies table
      console.log("Creating salary_policies table...");
      await queryInterface.createTable(
        "salary_policies",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          code: {
            type: Sequelize.STRING(50),
            allowNull: false,
            unique: true,
          },
          name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          shiftType: {
            type: Sequelize.ENUM("day", "night"),
            allowNull: false,
          },
          contractType: {
            type: Sequelize.ENUM("probation", "official"),
            allowNull: false,
          },
          baseSalaryPerDay: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },
          overtimeRate: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: false,
            defaultValue: 1.5,
          },
          holidayRate: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: false,
            defaultValue: 2.0,
          },
          holidayOvertimeRate: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: false,
            defaultValue: 3.0,
          },
          sundayRate: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: false,
            defaultValue: 1.5,
          },
          sundayOvertimeRate: {
            type: Sequelize.DECIMAL(4, 2),
            allowNull: false,
            defaultValue: 2.0,
          },
          nightShiftBonus: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          description: {
            type: Sequelize.TEXT,
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
        },
        { transaction }
      );

      // Create indexes for salary_policies
      await queryInterface.addIndex(
        "salary_policies",
        ["code"],
        { transaction }
      );
      await queryInterface.addIndex(
        "salary_policies",
        ["shiftType", "contractType"],
        { transaction }
      );
      await queryInterface.addIndex(
        "salary_policies",
        ["isActive"],
        { transaction }
      );

      // 2. Create payroll_components table
      console.log("Creating payroll_components table...");
      await queryInterface.createTable(
        "payroll_components",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          code: {
            type: Sequelize.STRING(100),
            allowNull: false,
            unique: true,
          },
          name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          type: {
            type: Sequelize.ENUM("income", "deduction"),
            allowNull: false,
          },
          category: {
            type: Sequelize.ENUM(
              "base_salary",
              "overtime",
              "annual_leave",
              "allowance",
              "bonus",
              "insurance",
              "tax",
              "union_fee",
              "uniform",
              "advance_deduction",
              "other"
            ),
            allowNull: false,
          },
          calculationMethod: {
            type: Sequelize.ENUM(
              "fixed_amount",
              "percentage_base_salary",
              "percentage_income",
              "multiplier_daily_rate",
              "multiplier_hourly_rate",
              "custom"
            ),
            allowNull: false,
            defaultValue: "fixed_amount",
          },
          defaultValue: {
            type: Sequelize.DECIMAL(12, 2),
          },
          isRequired: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          isEditable: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          description: {
            type: Sequelize.TEXT,
          },
          displayOrder: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
        },
        { transaction }
      );

      // Create indexes for payroll_components
      await queryInterface.addIndex(
        "payroll_components",
        ["code"],
        { transaction }
      );
      await queryInterface.addIndex(
        "payroll_components",
        ["type", "category"],
        { transaction }
      );
      await queryInterface.addIndex(
        "payroll_components",
        ["isActive"],
        { transaction }
      );
      await queryInterface.addIndex(
        "payroll_components",
        ["displayOrder"],
        { transaction }
      );

      // 3. Create payrolls table
      console.log("Creating payrolls table...");
      await queryInterface.createTable(
        "payrolls",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
          year: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          month: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          salaryPolicyId: {
            type: Sequelize.INTEGER,
            references: {
              model: "salary_policies",
              key: "id",
            },
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
          },
          workingDaysBase: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
          },
          workingDaysHoliday: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
          },
          workingDaysSunday: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
          },
          overtimeDaysBase: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
          },
          overtimeDaysHoliday: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
          },
          overtimeDaysSunday: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
          },
          annualLeaveDays: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
          },
          totalIncome: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          totalDeduction: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          netSalary: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          status: {
            type: Sequelize.ENUM(
              "draft",
              "pending_approval",
              "approved",
              "paid",
              "rejected"
            ),
            allowNull: false,
            defaultValue: "draft",
          },
          approvedBy: {
            type: Sequelize.INTEGER,
            references: {
              model: "users",
              key: "id",
            },
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
          },
          approvedAt: {
            type: Sequelize.DATE,
          },
          paidAt: {
            type: Sequelize.DATE,
          },
          rejectionReason: {
            type: Sequelize.TEXT,
          },
          notes: {
            type: Sequelize.TEXT,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
        },
        { transaction }
      );

      // Create indexes for payrolls
      await queryInterface.addIndex("payrolls", ["userId"], { transaction });
      await queryInterface.addIndex(
        "payrolls",
        ["year", "month"],
        { transaction }
      );
      await queryInterface.addIndex(
        "payrolls",
        ["userId", "year", "month"],
        { transaction, unique: true }
      );
      await queryInterface.addIndex("payrolls", ["status"], { transaction });
      await queryInterface.addIndex("payrolls", ["approvedBy"], { transaction });

      // 4. Create payroll_details table
      console.log("Creating payroll_details table...");
      await queryInterface.createTable(
        "payroll_details",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          payrollId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "payrolls",
              key: "id",
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
          payrollComponentId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "payroll_components",
              key: "id",
            },
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
          },
          quantity: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
          },
          unitAmount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          calculationFormula: {
            type: Sequelize.STRING(500),
          },
          notes: {
            type: Sequelize.TEXT,
          },
          isEdited: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          editedReason: {
            type: Sequelize.TEXT,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
        },
        { transaction }
      );

      // Create indexes for payroll_details
      await queryInterface.addIndex(
        "payroll_details",
        ["payrollId"],
        { transaction }
      );
      await queryInterface.addIndex(
        "payroll_details",
        ["payrollComponentId"],
        { transaction }
      );
      await queryInterface.addIndex(
        "payroll_details",
        ["payrollId", "payrollComponentId"],
        { transaction }
      );

      await transaction.commit();

      console.log("\n✅ Payroll system tables created successfully!\n");
      console.log("Created tables:");
      console.log("  - salary_policies (Chính sách lương)");
      console.log("  - payroll_components (Thành phần lương)");
      console.log("  - payrolls (Bảng lương tổng hợp)");
      console.log("  - payroll_details (Chi tiết lương)\n");
    } catch (error) {
      await transaction.rollback();
      console.error("\n❌ Migration failed:", error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("\n=== Removing Payroll System Tables ===\n");

      // Drop tables in reverse order (respecting foreign keys)
      await queryInterface.dropTable("payroll_details", { transaction });
      console.log("Dropped payroll_details table");

      await queryInterface.dropTable("payrolls", { transaction });
      console.log("Dropped payrolls table");

      await queryInterface.dropTable("payroll_components", { transaction });
      console.log("Dropped payroll_components table");

      await queryInterface.dropTable("salary_policies", { transaction });
      console.log("Dropped salary_policies table");

      await transaction.commit();

      console.log("\n✅ Payroll system tables removed successfully!\n");
    } catch (error) {
      await transaction.rollback();
      console.error("\n❌ Rollback failed:", error.message);
      throw error;
    }
  },
};
