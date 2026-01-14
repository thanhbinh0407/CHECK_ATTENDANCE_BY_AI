import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const LeaveRequest = sequelize.define('LeaveRequest', {
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
  type: {
    type: DataTypes.ENUM('paid', 'unpaid', 'sick', 'maternity', 'personal', 'other'),
    allowNull: false,
    defaultValue: 'paid',
    comment: 'Loại nghỉ phép'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngày bắt đầu nghỉ'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngày kết thúc nghỉ'
  },
  days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Số ngày nghỉ'
  },
  reason: {
    type: DataTypes.TEXT,
    comment: 'Lý do nghỉ phép'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    comment: 'Trạng thái: chờ duyệt, đã duyệt, từ chối'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'Người duyệt'
  },
  approvedAt: {
    type: DataTypes.DATE,
    comment: 'Thời điểm duyệt'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    comment: 'Lý do từ chối'
  }
}, {
  timestamps: true,
  tableName: 'leave_requests',
  indexes: [
    {
      fields: ['userId', 'status']
    },
    {
      fields: ['startDate', 'endDate']
    }
  ]
});

// Associations are defined in index.js

export default LeaveRequest;

