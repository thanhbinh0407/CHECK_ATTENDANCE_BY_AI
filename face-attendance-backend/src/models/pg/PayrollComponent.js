import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

/**
 * PayrollComponent Model
 * Định nghĩa các thành phần thu nhập và khấu trừ trong lương
 * 
 * Ví dụ:
 * - Type: income, Component: baseSalary
 * - Type: income, Component: annualLeave
 * - Type: income, Component: allowance_responsibility
 * - Type: deduction, Component: insurance_social
 * - Type: deduction, Component: tax_personal
 */

const PayrollComponent = sequelize.define(
  'PayrollComponent',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('income', 'deduction'),
        allowNull: false,
      },
      category: {
        type: DataTypes.ENUM(
          'base_salary',
          'overtime',
          'annual_leave',
          'allowance',
          'bonus',
          'insurance',
          'tax',
          'union_fee',
          'uniform',
          'advance_deduction',
          'other'
        ),
        allowNull: false,
      },
      calculationMethod: {
        type: DataTypes.ENUM(
          'fixed_amount',
          'percentage_base_salary',
          'percentage_income',
          'multiplier_daily_rate',
          'multiplier_hourly_rate',
          'custom'
        ),
        allowNull: false,
        defaultValue: 'fixed_amount',
      },
      defaultValue: {
        type: DataTypes.DECIMAL(12, 2),
      },
      isRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      isEditable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      description: {
        type: DataTypes.TEXT,
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: 'payroll_components',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['code'] },
        { fields: ['type', 'category'] },
        { fields: ['isActive'] },
        { fields: ['displayOrder'] },
      ],
    }
  );

export default PayrollComponent;
