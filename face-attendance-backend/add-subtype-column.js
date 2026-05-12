import sequelize from './src/db/sequelize.js';

async function addSubTypeColumn() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Add the subType column to leave_requests table
    await sequelize.query(`
      ALTER TABLE "leave_requests"
      ADD COLUMN IF NOT EXISTS "subType" VARCHAR(255);
    `);

    console.log('✅ subType column added successfully');
  } catch (error) {
    console.error('❌ Error adding subType column:', error);
  } finally {
    await sequelize.close();
  }
}

addSubTypeColumn();