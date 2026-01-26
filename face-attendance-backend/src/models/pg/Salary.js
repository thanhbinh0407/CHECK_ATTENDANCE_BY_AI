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
    defaultValue: 0
  },
  bonus: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  deduction: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  finalSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12
    }
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'paid'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT
  },
  calculatedAt: {
    type: DataTypes.DATE
  },
  paidAt: {
    type: DataTypes.DATE
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

