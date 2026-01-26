import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import Department from './Department.js';
import JobTitle from './JobTitle.js';
import SalaryGrade from './SalaryGrade.js';

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
    allowNull: false,
  },
  employeeCode: {
    type: DataTypes.STRING,
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

  // ORGANIZATIONAL STRUCTURE
  departmentId: {
    type: DataTypes.INTEGER,
    references: {
      model: Department,
      key: 'id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    allowNull: true
  },

  jobTitleId: {
    type: DataTypes.INTEGER,
    references: {
      model: JobTitle,
      key: 'id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    allowNull: true
  },

  salaryGradeId: {
    type: DataTypes.INTEGER,
    references: {
      model: SalaryGrade,
      key: 'id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    allowNull: true
  },

  // EMPLOYMENT INFORMATION
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },

  probationStartDate: {
    type: DataTypes.DATE,
    allowNull: true
  },

  probationEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // SALARY INFORMATION
  baseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  // PERSONAL INFORMATION
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },

  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  bankAccount: {
    type: DataTypes.STRING,
    allowNull: true
  },

  bankName: {
    type: DataTypes.STRING,
    allowNull: true
  },

  taxCode: {
    type: DataTypes.STRING,
    allowNull: true
  },

  idNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },

  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true
  },

  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'users',
  indexes: [
    { unique: true, fields: ['email'] },
    { unique: true, fields: ['employeeCode'] }
  ]
});

export default User;
