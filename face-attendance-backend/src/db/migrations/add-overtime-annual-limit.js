import sequelize from '../sequelize.js';

export const up = async () => {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "overtimeAnnualLimit" DECIMAL(5,2) DEFAULT 200;`,
      { transaction }
    );

    await transaction.commit();
    console.log('✅ Added overtimeAnnualLimit to users table');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Failed to add overtimeAnnualLimit to users table:', error.message);
    throw error;
  }
};

export const down = async () => {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "overtimeAnnualLimit";`,
      { transaction }
    );

    await transaction.commit();
    console.log('✅ Removed overtimeAnnualLimit from users table');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Failed to remove overtimeAnnualLimit from users table:', error.message);
    throw error;
  }
};
