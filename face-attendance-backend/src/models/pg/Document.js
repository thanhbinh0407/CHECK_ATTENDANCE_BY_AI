import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const Document = sequelize.define('Document', {
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
  documentType: {
    type: DataTypes.ENUM('id_card', 'contract', 'certificate', 'appointment_decision', 'salary_decision', 'other'),
    allowNull: false,
    comment: 'Loại tài liệu: CCCD, Hợp đồng, Chứng chỉ, Quyết định bổ nhiệm, Quyết định tăng lương, Khác'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Tiêu đề tài liệu'
  },
  documentPath: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Đường dẫn file scan'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Tên file gốc'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Kích thước file (bytes)'
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Loại file (image/jpeg, application/pdf, etc.)'
  },
  uploadDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Ngày upload'
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Ngày hết hạn (nếu có, ví dụ: CCCD, chứng chỉ)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mô tả tài liệu'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Tài liệu còn hiệu lực'
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    },
    allowNull: true,
    comment: 'Người upload (admin/HR)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Ghi chú'
  }
}, {
  timestamps: true,
  tableName: 'documents',
  indexes: [
    {
      fields: ['userId', 'documentType']
    },
    {
      fields: ['expiryDate']
    }
  ]
});

Document.belongsTo(User, { foreignKey: 'userId' });

export default Document;


