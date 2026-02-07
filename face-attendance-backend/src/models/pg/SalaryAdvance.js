import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const SalaryAdvance = sequelize.define('SalaryAdvance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    allowNull: false
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12
    },
    comment: 'Tháng tạm ứng'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Năm tạm ứng'
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Số tiền tạm ứng'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Lý do tạm ứng'
  },
  requestDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Ngày yêu cầu'
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    comment: 'Trạng thái duyệt'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    },
    allowNull: true,
    comment: 'Người duyệt'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian duyệt'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Lý do từ chối'
  },
  isDeducted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Đã trừ vào lương chưa'
  },
  deductedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian trừ vào lương'
  },
  salaryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID bảng lương đã trừ tạm ứng'
  }
}, {
  timestamps: true,
  tableName: 'salary_advances',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'month', 'year']
    },
    {
      fields: ['approvalStatus']
    }
  ]
});

export default SalaryAdvance;

