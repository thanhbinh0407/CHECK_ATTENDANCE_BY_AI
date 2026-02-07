import sequelize from '../sequelize.js';
import { DataTypes } from 'sequelize';

export const up = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🚀 Adding payroll & compliance fields to users table...');

    // 1. Add allowances (Các khoản phụ cấp)
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lunchAllowance" DECIMAL(12, 2) DEFAULT 0;`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ lunchAllowance column may already exist:', err.message);
      }
    });

    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "transportAllowance" DECIMAL(12, 2) DEFAULT 0;`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ transportAllowance column may already exist:', err.message);
      }
    });

    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneAllowance" DECIMAL(12, 2) DEFAULT 0;`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ phoneAllowance column may already exist:', err.message);
      }
    });

    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "responsibilityAllowance" DECIMAL(12, 2) DEFAULT 0;`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ responsibilityAllowance column may already exist:', err.message);
      }
    });

    // 2. Add social insurance number (Số sổ BHXH)
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "socialInsuranceNumber" VARCHAR(50);`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ socialInsuranceNumber column may already exist:', err.message);
      }
    });

    // 3. Add health insurance provider (Nơi đăng ký KCB ban đầu)
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "healthInsuranceProvider" VARCHAR(255);`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ healthInsuranceProvider column may already exist:', err.message);
      }
    });

    // 4. Add bank branch (Chi nhánh ngân hàng)
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bankBranch" VARCHAR(255);`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ bankBranch column may already exist:', err.message);
      }
    });

    // 5. Add dependent count (Số người phụ thuộc) - Có thể tính động nhưng lưu để tối ưu
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dependentCount" INTEGER DEFAULT 0;`,
      { transaction }
    ).catch((err) => {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.warn('⚠️ dependentCount column may already exist:', err.message);
      }
    });

    // 6. Update dependentCount from dependents table
    await sequelize.query(
      `UPDATE "users" SET "dependentCount" = (
        SELECT COUNT(*) FROM "dependents" 
        WHERE "dependents"."userId" = "users"."id" 
        AND "dependents"."isDependent" = true
        AND "dependents"."approvalStatus" = 'approved'
      );`,
      { transaction }
    ).catch((err) => {
      console.warn('⚠️ Could not update dependentCount:', err.message);
    });

    await transaction.commit();
    console.log('✅ Payroll & compliance fields migration completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Payroll & compliance fields migration failed:', error.message);
    throw error;
  }
};

export const down = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🔄 Rolling back payroll & compliance fields...');

    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "lunchAllowance";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "transportAllowance";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "phoneAllowance";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "responsibilityAllowance";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "socialInsuranceNumber";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "healthInsuranceProvider";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "bankBranch";`,
      { transaction }
    ).catch(() => {});
    
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "dependentCount";`,
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('add-payroll-compliance-fields')) {
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

