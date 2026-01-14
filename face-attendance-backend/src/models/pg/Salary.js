import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const Salary = sequelize.define('Salary', {
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
  baseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Lương cơ bản'
  },
  bonus: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Thưởng'
  },
  deduction: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Khấu trừ'
  },
  finalSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Lương thực nhận'
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12
    },
    comment: 'Tháng'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Năm'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'paid'),
    defaultValue: 'pending',
    comment: 'Trạng thái: chờ duyệt, đã duyệt, đã thanh toán'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'Ghi chú'
  },
  calculatedAt: {
    type: DataTypes.DATE,
    comment: 'Thời điểm tính toán'
  },
  paidAt: {
    type: DataTypes.DATE,
    comment: 'Thời điểm thanh toán'
  }
}, {
  timestamps: true,
  tableName: 'salaries',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'month', 'year']
    }
  ]
});

Salary.belongsTo(User, { foreignKey: 'userId' });

export default Salary;

