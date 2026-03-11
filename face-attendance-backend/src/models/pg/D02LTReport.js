import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const D02LTReport = sequelize.define('D02LTReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tenDonVi: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  maDonVi: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  maSoThue: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  diaChi: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  soDienThoai: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  ngay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 31
    }
  },
  thang: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12
    }
  },
  nam: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 2000,
      max: 2100
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'd02_lt_reports',
  timestamps: true,
});

export default D02LTReport;