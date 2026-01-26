import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

/**
 * SalaryPolicy Model
 * Định nghĩa chính sách lương cơ bản theo ca làm và loại hợp đồng
 * 
 * Các trường hợp:
 * 1. Ca ngày + Thử việc
 * 2. Ca ngày + Hợp đồng chính thức
 * 3. Ca đêm + Thử việc
 * 4. Ca đêm + Hợp đồng chính thức
 */

const SalaryPolicy = sequelize.define(
  'SalaryPolicy',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      shiftType: {
        type: DataTypes.ENUM('day', 'night'),
        allowNull: false,
      },
      contractType: {
        type: DataTypes.ENUM('probation', 'official'),
        allowNull: false,
      },
      baseSalaryPerDay: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      overtimeRate: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 1.5,
      },
      holidayRate: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 2.0,
      },
      holidayOvertimeRate: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 3.0,
      },
      sundayRate: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 1.5,
      },
      sundayOvertimeRate: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 2.0,
      },
      nightShiftBonus: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      description: {
        type: DataTypes.TEXT,
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
      tableName: 'salary_policies',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['code'] },
        { fields: ['shiftType', 'contractType'] },
        { fields: ['isActive'] },
      ],
    }
  );

export default SalaryPolicy;
