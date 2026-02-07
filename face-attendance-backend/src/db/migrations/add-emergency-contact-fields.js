import sequelize from '../sequelize.js';
import { DataTypes } from 'sequelize';

export const up = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🚀 Adding emergency contact fields to users table...');

    // Add emergency contact fields
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergencyContactName" VARCHAR(255);`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ emergencyContactName column may already exist:', err.message);
      }
    });

    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergencyContactRelationship" VARCHAR(100);`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ emergencyContactRelationship column may already exist:', err.message);
      }
    });

    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" VARCHAR(50);`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ emergencyContactPhone column may already exist:', err.message);
      }
    });

    await transaction.commit();
    console.log('✅ Emergency contact fields migration completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Emergency contact fields migration failed:', error.message);
    throw error;
  }
};

export const down = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🔄 Rolling back emergency contact fields...');

    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "emergencyContactName";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "emergencyContactRelationship";`,
      { transaction }
    ).catch(() => {});

    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "emergencyContactPhone";`,
      { transaction }
    ).catch(() => {});

    await transaction.commit();
    console.log('✅ Rollback completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('add-emergency-contact-fields')) {
  up()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

