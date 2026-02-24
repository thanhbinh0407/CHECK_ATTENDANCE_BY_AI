import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

/**
 * InsuranceForm Model
 * Lưu trữ dữ liệu form BHXH/BHYT (TK1-TS và D02-LT)
 */
const InsuranceForm = sequelize.define('InsuranceForm', {
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
    allowNull: false,
  },
  formType: {
    type: DataTypes.ENUM('TK1_TS', 'D02_LT'),
    allowNull: false,
    comment: 'Loại form: TK1-TS hoặc D02-LT'
  },
  formData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Dữ liệu form dạng JSON'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Phiên bản form (để theo dõi thay đổi)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Trạng thái hoạt động'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'Ghi chú'
  }
}, {
  timestamps: true,
  tableName: 'insurance_forms',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'formType'],
      name: 'unique_user_form_type'
    }
  ]
});

InsuranceForm.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(InsuranceForm, { foreignKey: 'userId', as: 'InsuranceForms' });

export default InsuranceForm;

