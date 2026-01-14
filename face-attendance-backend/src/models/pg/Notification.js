import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const Notification = sequelize.define('Notification', {
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
    allowNull: true, // null = broadcast to all
    comment: 'User ID, null for broadcast'
  },
  type: {
    type: DataTypes.ENUM('attendance', 'late', 'leave', 'salary', 'system', 'alert'),
    allowNull: false,
    comment: 'Loại thông báo'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Tiêu đề'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Nội dung thông báo'
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Đã đọc'
  },
  readAt: {
    type: DataTypes.DATE,
    comment: 'Thời điểm đọc'
  },
  metadata: {
    type: DataTypes.JSONB,
    comment: 'Dữ liệu bổ sung (JSON)'
  }
}, {
  timestamps: true,
  tableName: 'notifications',
  indexes: [
    {
      fields: ['userId', 'read']
    },
    {
      fields: ['type', 'createdAt']
    }
  ]
});

// Associations are defined in index.js

export default Notification;

