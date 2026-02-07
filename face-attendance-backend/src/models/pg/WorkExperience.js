import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const WorkExperience = sequelize.define('WorkExperience', {
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
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Tên công ty'
  },
  position: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Vị trí công việc'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Ngày bắt đầu làm việc'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Ngày kết thúc (null nếu đang làm)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mô tả công việc'
  },
  responsibilities: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Trách nhiệm chính'
  },
  achievements: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Thành tựu đạt được'
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Đang làm việc tại đây'
  }
}, {
  timestamps: true,
  tableName: 'work_experiences',
  indexes: [
    {
      fields: ['userId']
    }
  ]
});

WorkExperience.belongsTo(User, { foreignKey: 'userId' });

export default WorkExperience;

