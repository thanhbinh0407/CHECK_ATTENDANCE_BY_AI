import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const InsuranceConfig = sequelize.define('InsuranceConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  effectiveDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // Tỷ lệ đóng bảo hiểm (theo quy định hiện hành)
  employeeSocialInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 8
  },
  employerSocialInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 21.5
  },
  employeeHealthInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.5
  },
  employerHealthInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 3.0
  },
  employeeUnemploymentInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.0
  },
  employerUnemploymentInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.0
  },
  // Mức lương tối đa đóng bảo hiểm
  maxInsuranceSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  // Mức lương tối thiểu đóng bảo hiểm
  minInsuranceSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'insurance_configs',
  indexes: [
    {
      fields: ['effectiveDate', 'isActive']
    }
  ]
});

export default InsuranceConfig;



