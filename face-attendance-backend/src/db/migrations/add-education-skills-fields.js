import sequelize from '../sequelize.js';
import { DataTypes } from 'sequelize';

export const up = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🚀 Adding education & skills fields to users table...');

    // 1. Create ENUM type for education level
    await sequelize.query(
      `DO $$ BEGIN
        CREATE TYPE "enum_users_educationLevel" AS ENUM ('high_school', 'vocational', 'college', 'university', 'master', 'phd', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      { transaction }
    ).catch((err) => {
      console.warn('⚠️ educationLevel ENUM may already exist:', err.message);
    });

    // 2. Add educationLevel (Trình độ học vấn)
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "educationLevel" "enum_users_educationLevel";`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ educationLevel column may already exist:', err.message);
      }
    });

    // 3. Add major (Chuyên ngành đào tạo)
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "major" VARCHAR(255);`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ major column may already exist:', err.message);
      }
    });

    // 4. Create work_experiences table
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS "work_experiences" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "companyName" VARCHAR(255) NOT NULL,
        "position" VARCHAR(255) NOT NULL,
        "startDate" DATE,
        "endDate" DATE,
        "description" TEXT,
        "responsibilities" TEXT,
        "achievements" TEXT,
        "isCurrent" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ work_experiences table may already exist:', err.message);
      }
    });

    // 5. Create index for work_experiences
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "work_experiences_userId_idx" ON "work_experiences"("userId");`,
      { transaction }
    ).catch((err) => {
      console.warn('⚠️ Index may already exist:', err.message);
    });

    await transaction.commit();
    console.log('✅ Education & skills fields migration completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Education & skills fields migration failed:', error.message);
    throw error;
  }
};

export const down = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🔄 Rolling back education & skills fields...');

    await sequelize.query(
      `DROP TABLE IF EXISTS "work_experiences";`,
      { transaction }
    ).catch(() => {});

    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "educationLevel";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "major";`,
      { transaction }
    ).catch(() => {});

    await sequelize.query(
      `DROP TYPE IF EXISTS "enum_users_educationLevel";`,
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('add-education-skills-fields')) {
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

