import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const AttendanceLog = sequelize.define('AttendanceLog', {
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
    }
  },
  detectedName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  confidence: {
    type: DataTypes.FLOAT,
  },
  matchDistance: {
    type: DataTypes.FLOAT,
  },
  type: {
    type: DataTypes.ENUM('IN','OUT'),
    allowNull: false,
    defaultValue: 'IN'
  },
  note: {
    type: DataTypes.TEXT,
  },
  shiftId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isLate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isEarlyLeave: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isOvertime: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deviceId: {
    type: DataTypes.STRING,
  },
  imageBase64: {
    type: DataTypes.TEXT
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  timestamps: true,
  tableName: 'attendance_logs'
});

// Associations are defined in index.js

export default AttendanceLog;
