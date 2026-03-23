import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const SalaryHistory = sequelize.define('SalaryHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  },
  previousBaseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Luong co ban truoc thay doi'
  },
  newBaseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Luong co ban sau thay doi'
  },
  previousTotalAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Tong phu cap truoc thay doi'
  },
  newTotalAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Tong phu cap sau thay doi'
  },
  changeType: {
    type: DataTypes.ENUM('initial_salary', 'increase', 'decrease', 'correction', 'other'),
    allowNull: false,
    defaultValue: 'other'
  },
  effectiveDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngay co hieu luc cua muc luong'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Nguoi cap nhat luong'
  }
}, {
  timestamps: true,
  tableName: 'salary_history',
  indexes: [
    { fields: ['userId', 'effectiveDate'] }
  ]
});

export default SalaryHistory;
