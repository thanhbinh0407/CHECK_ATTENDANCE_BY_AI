import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const OvertimeRequest = sequelize.define('OvertimeRequest', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngày làm thêm giờ'
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: 'Giờ bắt đầu làm thêm'
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: 'Giờ kết thúc làm thêm'
  },
  totalHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'Tổng số giờ làm thêm'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Lý do làm thêm giờ'
  },
  projectName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Tên dự án/công việc'
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
  approvalLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Cấp độ duyệt hiện tại (1: Trưởng phòng, 2: HR, 3: Giám đốc)'
  },
  currentApproverId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    },
    allowNull: true,
    comment: 'Người duyệt hiện tại'
  }
}, {
  timestamps: true,
  tableName: 'overtime_requests',
  indexes: [
    {
      fields: ['userId', 'date']
    },
    {
      fields: ['approvalStatus']
    }
  ]
});

export default OvertimeRequest;

