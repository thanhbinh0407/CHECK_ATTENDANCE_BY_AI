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
      isIn: [['manager', 'hr', 'accountant', 'supervisor', 'employee']]
    },
    comment: 'manager=Giám đốc/Quản trị, hr=Nhân sự, accountant=Kế toán, supervisor=Quản lý, employee=Nhân viên'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  /** Timestamp when the account was deactivated (soft-deleted). */
  deactivatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  /**
   * Increment this value to invalidate all existing JWTs for the user.
   * Used to force logout when role changes or security-sensitive updates occur.
   */
  tokenVersion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
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

  contractType: {
    type: DataTypes.ENUM('probation', '1_year', '3_year', 'indefinite', 'other'),
    allowNull: true
  },

  employmentStatus: {
    type: DataTypes.ENUM('active', 'maternity_leave', 'unpaid_leave', 'suspended', 'terminated', 'resigned'),
    allowNull: true,
    defaultValue: 'active'
  },

  managerId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    allowNull: true
  },

  branchName: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // SALARY INFORMATION
  baseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  insuranceBaseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  // Allowances (Các khoản phụ cấp)
  lunchAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  transportAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  phoneAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  responsibilityAllowance: {
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

  // More detailed address information
  permanentAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  temporaryAddress: {
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

  bankBranch: {
    type: DataTypes.STRING,
    allowNull: true
  },

  taxCode: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Social Insurance & Health Insurance (Bảo hiểm)
  socialInsuranceNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },

  healthInsuranceProvider: {
    type: DataTypes.STRING,
    allowNull: true
  },

  dependentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  idNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },

  idIssueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },

  idIssuePlace: {
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
  },

  // Emails
  personalEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },

  companyEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // EDUCATION & SKILLS INFORMATION
  educationLevel: {
    type: DataTypes.ENUM('high_school', 'vocational', 'college', 'university', 'master', 'phd', 'other'),
    allowNull: true
  },

  major: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // EMERGENCY CONTACT INFORMATION
  emergencyContactName: {
    type: DataTypes.STRING,
    allowNull: true
  },

  emergencyContactRelationship: {
    type: DataTypes.STRING,
    allowNull: true
  },

  emergencyContactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },

  /** Public path under /uploads/avatars/ — served as static file */
  avatarUrl: {
    type: DataTypes.STRING,
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
