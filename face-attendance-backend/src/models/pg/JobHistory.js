import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const JobHistory = sequelize.define('JobHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  },
  fromDepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Phòng ban trước khi thay đổi'
  },
  toDepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Phòng ban sau khi thay đổi'
  },
  fromJobTitleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Chuc danh truoc khi thay doi'
  },
  toJobTitleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Chuc danh sau khi thay doi'
  },
  changeType: {
    type: DataTypes.ENUM('hire', 'initial_assignment', 'transfer', 'promotion', 'demotion', 'correction', 'other'),
    allowNull: false,
    defaultValue: 'other',
    comment: 'Loai thay doi cong viec'
  },
  effectiveDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Ngay co hieu luc cua thay doi'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Nguoi cap nhat (manager/hr)'
  }
}, {
  timestamps: true,
  tableName: 'job_history',
  indexes: [
    { fields: ['userId', 'effectiveDate'] },
    { fields: ['toDepartmentId'] },
    { fields: ['toJobTitleId'] }
  ]
});

export default JobHistory;
