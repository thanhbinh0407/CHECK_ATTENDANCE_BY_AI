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
    unique: true,
    comment: 'Tên cấu hình (ví dụ: "BHXH 2024")'
  },
  effectiveDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngày có hiệu lực'
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Ngày hết hiệu lực'
  },
  // Tỷ lệ đóng bảo hiểm (theo quy định hiện hành)
  employeeSocialInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 10.5,
    comment: 'Tỷ lệ đóng BHXH nhân viên (%)'
  },
  employerSocialInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 21.5,
    comment: 'Tỷ lệ đóng BHXH doanh nghiệp (%)'
  },
  employeeHealthInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.5,
    comment: 'Tỷ lệ đóng BHYT nhân viên (%)'
  },
  employerHealthInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 3.0,
    comment: 'Tỷ lệ đóng BHYT doanh nghiệp (%)'
  },
  employeeUnemploymentInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.0,
    comment: 'Tỷ lệ đóng BHTN nhân viên (%)'
  },
  employerUnemploymentInsuranceRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.0,
    comment: 'Tỷ lệ đóng BHTN doanh nghiệp (%)'
  },
  // Mức lương tối đa đóng bảo hiểm
  maxInsuranceSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Mức lương tối đa đóng BHXH (theo quy định)'
  },
  // Mức lương tối thiểu đóng bảo hiểm
  minInsuranceSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Mức lương tối thiểu đóng BHXH (theo quy định)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Cấu hình đang áp dụng'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mô tả cấu hình'
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



