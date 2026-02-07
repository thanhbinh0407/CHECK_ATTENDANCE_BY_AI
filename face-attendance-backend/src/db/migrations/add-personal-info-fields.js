import sequelize from '../sequelize.js';
import { DataTypes } from 'sequelize';

export const up = async () => {
  const transaction = await sequelize.transaction();

  try {
    // Add new personal identification fields to users table
    await sequelize.queryInterface.addColumn(
      'users',
      'idIssueDate',
      {
        type: DataTypes.DATE,
        allowNull: true
      },
      { transaction }
    ).catch(() => {});

    await sequelize.queryInterface.addColumn(
      'users',
      'idIssuePlace',
      {
        type: DataTypes.STRING,
        allowNull: true
      },
      { transaction }
    ).catch(() => {});

    // Split address into permanent and temporary
    await sequelize.queryInterface.addColumn(
      'users',
      'permanentAddress',
      {
        type: DataTypes.TEXT,
        allowNull: true
      },
      { transaction }
    ).catch(() => {});

    await sequelize.queryInterface.addColumn(
      'users',
      'temporaryAddress',
      {
        type: DataTypes.TEXT,
        allowNull: true
      },
      { transaction }
    ).catch(() => {});

    // Personal and company emails
    await sequelize.queryInterface.addColumn(
      'users',
      'personalEmail',
      {
        type: DataTypes.STRING,
        allowNull: true
      },
      { transaction }
    ).catch(() => {});

    await sequelize.queryInterface.addColumn(
      'users',
      'companyEmail',
      {
        type: DataTypes.STRING,
        allowNull: true
      },
      { transaction }
    ).catch(() => {});

    console.log('✅ Migration add-personal-info-fields completed');
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration add-personal-info-fields failed:', error.message);
    throw error;
  }
};

export const down = async () => {
  const transaction = await sequelize.transaction();

  try {
    await sequelize.queryInterface.removeColumn('users', 'idIssueDate', { transaction }).catch(() => {});
    await sequelize.queryInterface.removeColumn('users', 'idIssuePlace', { transaction }).catch(() => {});
    await sequelize.queryInterface.removeColumn('users', 'permanentAddress', { transaction }).catch(() => {});
    await sequelize.queryInterface.removeColumn('users', 'temporaryAddress', { transaction }).catch(() => {});
    await sequelize.queryInterface.removeColumn('users', 'personalEmail', { transaction }).catch(() => {});
    await sequelize.queryInterface.removeColumn('users', 'companyEmail', { transaction }).catch(() => {});

    console.log('✅ Rollback add-personal-info-fields completed');
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback add-personal-info-fields failed:', error.message);
    throw error;
  }
};


