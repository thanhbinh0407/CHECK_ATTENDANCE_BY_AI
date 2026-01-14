import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const SalaryRule = sequelize.define('SalaryRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Tên rule'
  },
  type: {
    type: DataTypes.ENUM('bonus', 'deduction'),
    allowNull: false,
    comment: 'Loại: thưởng hoặc khấu trừ'
  },
  triggerType: {
    type: DataTypes.ENUM('late', 'early_leave', 'absent', 'overtime', 'full_attendance', 'custom'),
    allowNull: false,
    comment: 'Loại trigger: muộn, về sớm, vắng, tăng ca, chuyên cần, tùy chỉnh'
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Số tiền (dương cho bonus, âm cho deduction)'
  },
  amountType: {
    type: DataTypes.ENUM('fixed', 'percentage'),
    defaultValue: 'fixed',
    comment: 'Loại số tiền: cố định hoặc phần trăm'
  },
  threshold: {
    type: DataTypes.INTEGER,
    comment: 'Ngưỡng kích hoạt (ví dụ: số lần muộn, số giờ OT)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Trạng thái kích hoạt'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Mô tả chi tiết'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Độ ưu tiên khi tính toán (số càng cao càng được tính trước)'
  }
}, {
  timestamps: true,
  tableName: 'salary_rules',
  indexes: [
    {
      fields: ['type', 'triggerType', 'isActive']
    }
  ]
});

export default SalaryRule;

