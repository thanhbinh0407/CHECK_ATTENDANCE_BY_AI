import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

/**
 * PayrollDetail Model
 * Chi tiết từng thành phần thu nhập và khấu trừ trong bảng lương
 * 
 * Ví dụ:
 * - PayrollId: 1, ComponentId: INCOME_BASE_SALARY, Quantity: 20, Amount: 8,000,000
 * - PayrollId: 1, ComponentId: INCOME_OVERTIME_BASE, Quantity: 4, Amount: 800,000
 * - PayrollId: 1, ComponentId: DEDUCTION_INSURANCE_SOCIAL, Quantity: 1, Amount: 640,000
 */

const PayrollDetail = sequelize.define(
  'PayrollDetail',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      payrollId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      payrollComponentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Thông tin tính toán
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      unitAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Công thức/Ghi chú
      calculationFormula: {
        type: DataTypes.STRING(500),
      },
      notes: {
        type: DataTypes.TEXT,
      },

      // Chỉnh sửa
      isEdited: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      editedReason: {
        type: DataTypes.TEXT,
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
      },
    },
    {
      tableName: 'payroll_details',
      timestamps: true,
      indexes: [
        { fields: ['payrollId'] },
        { fields: ['payrollComponentId'] },
        { fields: ['payrollId', 'payrollComponentId'] },
      ],
    }
  );

export default PayrollDetail;
