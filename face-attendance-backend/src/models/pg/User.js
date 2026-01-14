import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  employeeCode: {
    type: DataTypes.STRING,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'employee',
    validate: {
      isIn: [['admin', 'employee', 'accountant']]
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  baseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Lương cơ bản'
  },
  jobTitle: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Chức vụ (Nhân viên CNTT, Chuyên viên CNTT, ...)'
  },
  educationLevel: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Trình độ (Trung cấp, Cao đẳng, Đại học, Sau đại học)'
  },
  certificates: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Mảng chứng chỉ (ví dụ: ["CCASP"])'
  },
  dependents: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Số người phụ thuộc'
  }
}, {
  timestamps: true,
  tableName: 'users'
});

export default User;
