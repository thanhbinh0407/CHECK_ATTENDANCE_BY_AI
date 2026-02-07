import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const ApprovalWorkflow = sequelize.define('ApprovalWorkflow', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  requestType: {
    type: DataTypes.ENUM('leave', 'overtime', 'business_trip', 'salary_advance', 'other'),
    allowNull: false,
    comment: 'Loại đơn từ'
  },
  requestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID của đơn từ (foreign key động)'
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Cấp độ duyệt (1: Trưởng phòng, 2: HR, 3: Giám đốc)'
  },
  approverId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    },
    allowNull: false,
    comment: 'Người duyệt ở cấp này'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'skipped'),
    defaultValue: 'pending',
    comment: 'Trạng thái duyệt ở cấp này'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian duyệt'
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Nhận xét của người duyệt'
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Cấp này có bắt buộc không'
  }
}, {
  timestamps: true,
  tableName: 'approval_workflows',
  indexes: [
    {
      fields: ['requestType', 'requestId', 'level']
    },
    {
      fields: ['approverId', 'status']
    }
  ]
});

export default ApprovalWorkflow;

