import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const BusinessTripRequest = sequelize.define('BusinessTripRequest', {
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
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngày bắt đầu công tác'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngày kết thúc công tác'
  },
  destination: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Địa điểm công tác'
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Mục đích công tác'
  },
  estimatedCost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Chi phí dự kiến'
  },
  transportType: {
    type: DataTypes.ENUM('plane', 'train', 'bus', 'car', 'other'),
    allowNull: true,
    comment: 'Phương tiện di chuyển'
  },
  accommodation: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nơi ở'
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
    comment: 'Cấp độ duyệt hiện tại'
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
  tableName: 'business_trip_requests',
  indexes: [
    {
      fields: ['userId', 'startDate']
    },
    {
      fields: ['approvalStatus']
    }
  ]
});

export default BusinessTripRequest;

