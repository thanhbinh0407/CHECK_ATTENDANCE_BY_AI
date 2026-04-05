import sequelize from '../sequelize.js';
import { DataTypes } from 'sequelize';

export const up = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🚀 Adding employment info fields to users table...');

    // 1. Create ENUM types first (if not exists)
    await sequelize.query(
      `DO $$ BEGIN
        CREATE TYPE "enum_users_contractType" AS ENUM ('probation', '1_year', '3_year', 'indefinite', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      { transaction }
    ).catch((err) => {
      console.warn('⚠️ contractType ENUM may already exist:', err.message);
    });

    await sequelize.query(
      `DO $$ BEGIN
        CREATE TYPE "enum_users_employmentStatus" AS ENUM ('active', 'maternity_leave', 'unpaid_leave', 'suspended', 'terminated', 'resigned');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      { transaction }
    ).catch((err) => {
      console.warn('⚠️ employmentStatus ENUM may already exist:', err.message);
    });

    // 2. Add contractType column (Loại hợp đồng)
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "contractType" "enum_users_contractType";`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ contractType column may already exist:', err.message);
      }
    });

    // 3. Add employmentStatus column (Trạng thái lao động chi tiết)
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employmentStatus" "enum_users_employmentStatus" DEFAULT 'active';`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ employmentStatus column may already exist:', err.message);
      }
    });

    // 4. Add managerId (Quản lý trực tiếp)
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "managerId" INTEGER;`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ managerId column may already exist:', err.message);
      }
    });

    // Add foreign key constraint for managerId
    await sequelize.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_managerId_fkey'
        ) THEN
          ALTER TABLE "users" ADD CONSTRAINT "users_managerId_fkey" 
            FOREIGN KEY ("managerId") REFERENCES "users"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;`,
      { transaction }
    ).catch((err) => {
      console.warn('⚠️ managerId foreign key may already exist:', err.message);
    });

    // 5. Add branchName (Chi nhánh) - Dùng STRING đơn giản, có thể nâng cấp thành model riêng sau
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "branchName" VARCHAR(255);`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ branchName column may already exist:', err.message);
      }
    });

    // 6. Update existing records: Set employmentStatus = 'active' for all active employees
    await sequelize.query(
      `UPDATE "users" SET "employmentStatus" = 'active' WHERE "isActive" = true AND "employmentStatus" IS NULL`,
      { transaction }
    ).catch((err) => {
      console.warn('⚠️ Could not update existing records:', err.message);
    });

    // 7. Update existing records: Set employmentStatus = 'terminated' for inactive employees
    await sequelize.query(
      `UPDATE "users" SET "employmentStatus" = 'terminated' WHERE "isActive" = false AND "employmentStatus" IS NULL`,
      { transaction }
    ).catch((err) => {
      console.warn('⚠️ Could not update existing records:', err.message);
    });

    await transaction.commit();
    console.log('✅ Employment info fields migration completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Employment info fields migration failed:', error.message);
    throw error;
  }
};

export const down = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🔄 Rolling back employment info fields...');

    // Remove foreign key constraint first
    await sequelize.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_managerId_fkey";`,
      { transaction }
    ).catch(() => {});

    // Remove columns
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "contractType";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "employmentStatus";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "managerId";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "branchName";`,
      { transaction }
    ).catch(() => {});

    // Drop ENUM types
    await sequelize.query(
      `DROP TYPE IF EXISTS "enum_users_contractType";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `DROP TYPE IF EXISTS "enum_users_employmentStatus";`,
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('add-employment-info-fields')) {
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

