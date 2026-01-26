import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const SalaryRule = sequelize.define('SalaryRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('bonus', 'deduction'),
    allowNull: false
  },
  triggerType: {
    type: DataTypes.ENUM('late', 'early_leave', 'absent', 'overtime', 'full_attendance', 'custom'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  amountType: {
    type: DataTypes.ENUM('fixed', 'percentage'),
    defaultValue: 'fixed'
  },
  threshold: {
    type: DataTypes.INTEGER
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  description: {
    type: DataTypes.TEXT
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  tableName: 'salary_rules',
  indexes: [
    {
      fields: ['type', 'triggerType', 'isActive']
    }
  ]
});

export default SalaryRule;

