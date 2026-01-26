import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

/**
 * Payroll Model
 * Bảng lương tổng hợp theo tháng
 * Chứa thông tin tổng quan lương của nhân viên cho mỗi tháng
 */

const Payroll = sequelize.define(
  'Payroll',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      salaryPolicyId: {
        type: DataTypes.INTEGER,
      },
      // Thông tin công
      workingDaysBase: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      workingDaysHoliday: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      workingDaysSunday: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      overtimeDaysBase: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      overtimeDaysHoliday: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      overtimeDaysSunday: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      annualLeaveDays: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Tổng cộng
      totalIncome: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalDeduction: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      netSalary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Trạng thái
      status: {
        type: DataTypes.ENUM('draft', 'pending_approval', 'approved', 'paid', 'rejected'),
        allowNull: false,
        defaultValue: 'draft',
      },
      approvedBy: {
        type: DataTypes.INTEGER,
      },
      approvedAt: {
        type: DataTypes.DATE,
      },
      paidAt: {
        type: DataTypes.DATE,
      },
      rejectionReason: {
        type: DataTypes.TEXT,
      },

      // Ghi chú
      notes: {
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
      tableName: 'payrolls',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { fields: ['year', 'month'] },
        { fields: ['userId', 'year', 'month'], unique: true },
        { fields: ['status'] },
        { fields: ['approvedBy'] },
      ],
    }
  );

export default Payroll;
