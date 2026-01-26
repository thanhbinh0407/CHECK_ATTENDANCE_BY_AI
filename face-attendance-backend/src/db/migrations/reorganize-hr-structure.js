import sequelize from '../sequelize.js';
import { DataTypes } from 'sequelize';

export const up = async () => {
  const transaction = await sequelize.transaction();

  try {
    // 1. CREATE DEPARTMENT TABLE
    await sequelize.define('Department', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      managerId: {
        type: DataTypes.INTEGER,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      }
    }, { tableName: 'departments', timestamps: true });

    await sequelize.models.Department.sync({ alter: true, transaction });

    // 2. CREATE JOB TITLE TABLE
    await sequelize.define('JobTitle', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      level: {
        type: DataTypes.STRING,
      },
      permissions: {
        type: DataTypes.JSONB,
        defaultValue: [],
      },
      baseSalaryMin: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      baseSalaryMax: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      }
    }, { tableName: 'job_titles', timestamps: true });

    await sequelize.models.JobTitle.sync({ alter: true, transaction });

    // 3. CREATE SALARY GRADE TABLE
    await sequelize.define('SalaryGrade', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      baseSalary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      description: {
        type: DataTypes.TEXT,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      }
    }, { tableName: 'salary_grades', timestamps: true });

    await sequelize.models.SalaryGrade.sync({ alter: true, transaction });

    // 4. ADD NEW COLUMNS TO USERS TABLE
    await sequelize.queryInterface.addColumn(
      'users',
      'departmentId',
      {
        type: DataTypes.INTEGER,
        references: {
          model: 'departments',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        allowNull: true,
      },
      { transaction }
    ).catch(() => { }); // Ignore if column already exists

    await sequelize.queryInterface.addColumn(
      'users',
      'jobTitleId',
      {
        type: DataTypes.INTEGER,
        references: {
          model: 'job_titles',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'salaryGradeId',
      {
        type: DataTypes.INTEGER,
        references: {
          model: 'salary_grades',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'startDate',
      {
        type: DataTypes.DATE,
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'probationStartDate',
      {
        type: DataTypes.DATE,
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'probationEndDate',
      {
        type: DataTypes.DATE,
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'phoneNumber',
      {
        type: DataTypes.STRING,
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'address',
      {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'bankAccount',
      {
        type: DataTypes.STRING,
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'bankName',
      {
        type: DataTypes.STRING,
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'taxCode',
      {
        type: DataTypes.STRING,
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'idNumber',
      {
        type: DataTypes.STRING,
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'dateOfBirth',
      {
        type: DataTypes.DATE,
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    await sequelize.queryInterface.addColumn(
      'users',
      'gender',
      {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: true,
      },
      { transaction }
    ).catch(() => { });

    // 5. CREATE QUALIFICATION TABLE
    await sequelize.define('Qualification', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('certificate', 'degree', 'license', 'training'),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      issuedBy: {
        type: DataTypes.STRING,
      },
      issuedDate: {
        type: DataTypes.DATE,
      },
      expiryDate: {
        type: DataTypes.DATE,
      },
      certificateNumber: {
        type: DataTypes.STRING,
      },
      documentPath: {
        type: DataTypes.STRING,
      },
      description: {
        type: DataTypes.TEXT,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      }
    }, { tableName: 'qualifications', timestamps: true });

    await sequelize.models.Qualification.sync({ alter: true, transaction });

    // 6. CREATE DEPENDENT TABLE
    await sequelize.define('Dependent', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        allowNull: false,
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      relationship: {
        type: DataTypes.ENUM('spouse', 'child', 'parent', 'grandparent', 'sibling', 'other'),
        allowNull: false,
      },
      dateOfBirth: {
        type: DataTypes.DATE,
      },
      gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
      },
      idNumber: {
        type: DataTypes.STRING,
      },
      address: {
        type: DataTypes.TEXT,
      },
      phoneNumber: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
      },
      occupation: {
        type: DataTypes.STRING,
      },
      isDependent: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      notes: {
        type: DataTypes.TEXT,
      }
    }, { tableName: 'dependents', timestamps: true });

    await sequelize.models.Dependent.sync({ alter: true, transaction });

    // 7. REMOVE OLD COLUMNS FROM USERS (if they exist)
    const tableDescription = await sequelize.queryInterface.describeTable('users', { transaction });

    if (tableDescription.jobTitle) {
      await sequelize.queryInterface.removeColumn('users', 'jobTitle', { transaction }).catch(() => { });
    }

    if (tableDescription.educationLevel) {
      await sequelize.queryInterface.removeColumn('users', 'educationLevel', { transaction }).catch(() => { });
    }

    if (tableDescription.certificates) {
      await sequelize.queryInterface.removeColumn('users', 'certificates', { transaction }).catch(() => { });
    }

    if (tableDescription.dependents) {
      await sequelize.queryInterface.removeColumn('users', 'dependents', { transaction }).catch(() => { });
    }

    await transaction.commit();
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

export const down = async () => {
  const transaction = await sequelize.transaction();

  try {
    // Remove new columns from users
    await sequelize.queryInterface.removeColumn('users', 'departmentId', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'jobTitleId', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'salaryGradeId', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'startDate', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'probationStartDate', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'probationEndDate', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'phoneNumber', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'address', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'bankAccount', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'bankName', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'taxCode', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'idNumber', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'dateOfBirth', { transaction }).catch(() => { });
    await sequelize.queryInterface.removeColumn('users', 'gender', { transaction }).catch(() => { });

    // Drop new tables
    await sequelize.queryInterface.dropTable('dependents', { transaction }).catch(() => { });
    await sequelize.queryInterface.dropTable('qualifications', { transaction }).catch(() => { });
    await sequelize.queryInterface.dropTable('salary_grades', { transaction }).catch(() => { });
    await sequelize.queryInterface.dropTable('job_titles', { transaction }).catch(() => { });
    await sequelize.queryInterface.dropTable('departments', { transaction }).catch(() => { });

    await transaction.commit();
    console.log('✅ Rollback completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
};
