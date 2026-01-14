import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import User from './User.js';

const FaceProfile = sequelize.define('FaceProfile', {
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
  modelVersion: {
    type: DataTypes.STRING,
    defaultValue: 'faceapi-tiny'
  },
  embeddings: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
  }
}, {
  timestamps: true,
  tableName: 'face_profiles'
});

FaceProfile.belongsTo(User, { foreignKey: 'userId' });

export default FaceProfile;
