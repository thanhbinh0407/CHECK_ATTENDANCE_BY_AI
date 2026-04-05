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
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  documentPath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  uploadDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    },
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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


