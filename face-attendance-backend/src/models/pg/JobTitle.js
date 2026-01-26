import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const JobTitle = sequelize.define('JobTitle', {
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
  description: {
    type: DataTypes.TEXT
  },
  level: {
    type: DataTypes.STRING,
    allowNull: true
  },
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  baseSalaryMin: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  baseSalaryMax: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'job_titles',
  indexes: [
    {
      unique: true,
      fields: ['code']
    }
  ]
});

export default JobTitle;
