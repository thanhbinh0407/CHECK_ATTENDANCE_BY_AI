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
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE
  },
  metadata: {
    type: DataTypes.JSONB
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

