import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const SalaryGrade = sequelize.define('SalaryGrade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  baseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'salary_grades',
  indexes: [
    {
      unique: true,
      fields: ['code']
    },
    {
      fields: ['level', 'isActive']
    }
  ]
});

export default SalaryGrade;
