import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const ShiftSetting = sequelize.define('ShiftSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Company Working Hours'
  },
  startTime: {
    type: DataTypes.STRING, // format HH:MM (e.g., "08:00")
    allowNull: false,
    defaultValue: '08:00'
  },
  endTime: {
    type: DataTypes.STRING, // format HH:MM (e.g., "17:00")
    allowNull: false,
    defaultValue: '17:00'
  },
  gracePeriodMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5 // default 5 minutes grace period
  },
  overtimeThresholdMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15 // default 15 minutes overtime threshold
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  note: {
    type: DataTypes.TEXT,
    defaultValue: 'Company-wide working hours configuration'
  }
}, {
  timestamps: true,
  tableName: 'shift_settings'
});

export default ShiftSetting;
