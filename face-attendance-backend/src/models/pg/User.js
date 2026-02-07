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

  contractType: {
    type: DataTypes.ENUM('probation', '1_year', '3_year', 'indefinite', 'other'),
    allowNull: true,
    comment: 'Loại hợp đồng: Thử việc, 1 năm, 3 năm, Không xác định thời hạn, Khác'
  },

  employmentStatus: {
    type: DataTypes.ENUM('active', 'maternity_leave', 'unpaid_leave', 'suspended', 'terminated', 'resigned'),
    allowNull: true,
    defaultValue: 'active',
    comment: 'Trạng thái lao động: Đang làm việc, Nghỉ thai sản, Nghỉ không lương, Tạm nghỉ, Đã nghỉ việc, Đã từ chức'
  },

  managerId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    allowNull: true,
    comment: 'Quản lý trực tiếp - Người duyệt đơn từ, chấm công, nghỉ phép'
  },

  branchName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Chi nhánh/Office - Tên chi nhánh nơi nhân viên làm việc'
  },

  // SALARY INFORMATION
  baseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  // Allowances (Các khoản phụ cấp)
  lunchAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Phụ cấp ăn trưa'
  },

  transportAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Phụ cấp xăng xe'
  },

  phoneAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Phụ cấp điện thoại'
  },

  responsibilityAllowance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Phụ cấp trách nhiệm'
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
    allowNull: true,
    comment: 'Chi nhánh ngân hàng - Để thực hiện chuyển khoản lương hàng loạt'
  },

  taxCode: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Social Insurance & Health Insurance (Bảo hiểm)
  socialInsuranceNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Số sổ Bảo hiểm xã hội - Để theo dõi quá trình đóng bảo hiểm'
  },

  healthInsuranceProvider: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nơi đăng ký khám chữa bệnh ban đầu - Thông tin trên thẻ BHYT'
  },

  dependentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Số người phụ thuộc - Để tính giảm trừ gia cảnh khi kê khai thuế TNCN'
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
    allowNull: true,
    comment: 'Trình độ học vấn: Trung học, Trung cấp, Cao đẳng, Đại học, Thạc sĩ, Tiến sĩ, Khác'
  },

  major: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Chuyên ngành đào tạo'
  },

  // EMERGENCY CONTACT INFORMATION
  emergencyContactName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Tên người liên hệ khẩn cấp - Dùng trong trường hợp tai nạn lao động hoặc sự cố'
  },

  emergencyContactRelationship: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Mối quan hệ với người liên hệ khẩn cấp: Vợ/Chồng, Bố/Mẹ, Anh/Chị/Em, Bạn bè, Đồng nghiệp, Khác'
  },

  emergencyContactPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Số điện thoại liên hệ khẩn cấp - BẮT BUỘC trong trường hợp khẩn cấp'
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
