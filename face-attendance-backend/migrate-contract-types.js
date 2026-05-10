import sequelize from './src/db/sequelize.js';
import User from './src/models/pg/User.js';

async function migrateContractTypes() {
  try {
    console.log('Starting contract types migration...');

    // Update enum values for contractType
    await sequelize.query(`
      ALTER TYPE "enum_users_contractType" RENAME TO "enum_users_contractType_old";
    `).catch(() => console.log('Old enum might not exist'));

    await sequelize.query(`
      CREATE TYPE "enum_users_contractType" AS ENUM('probation_1_month', 'probation_2_month', 'probation_3_month', 'formal_1_year', 'formal_3_year', 'formal_indefinite', 'other');
    `);

    // Update existing values
    await sequelize.query(`
      UPDATE users SET "contractType" = 'probation_3_month' WHERE "contractType" = 'probation';
    `);

    await sequelize.query(`
      UPDATE users SET "contractType" = 'formal_1_year' WHERE "contractType" = '1_year';
    `);

    await sequelize.query(`
      UPDATE users SET "contractType" = 'formal_3_year' WHERE "contractType" = '3_year';
    `);

    await sequelize.query(`
      UPDATE users SET "contractType" = 'formal_indefinite' WHERE "contractType" = 'indefinite';
    `);

    // Drop old enum
    await sequelize.query(`
      DROP TYPE "enum_users_contractType_old";
    `).catch(() => console.log('Old enum dropped'));

    // Add retirementAge column
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "retirementAge" INTEGER DEFAULT 60;
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

migrateContractTypes();