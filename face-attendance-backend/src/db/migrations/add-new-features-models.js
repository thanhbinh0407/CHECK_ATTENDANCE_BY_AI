import sequelize from '../sequelize.js';
import { DataTypes } from 'sequelize';

export const up = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🚀 Adding new features models...');

    // 1. Create ENUM types
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_documents_documentType" AS ENUM ('id_card', 'contract', 'certificate', 'appointment_decision', 'salary_decision', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `, { transaction }).catch(() => {});

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_overtime_requests_approvalStatus" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `, { transaction }).catch(() => {});

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_business_trip_requests_transportType" AS ENUM ('plane', 'train', 'bus', 'car', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `, { transaction }).catch(() => {});

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_approval_workflows_requestType" AS ENUM ('leave', 'overtime', 'business_trip', 'salary_advance', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `, { transaction }).catch(() => {});

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_approval_workflows_status" AS ENUM ('pending', 'approved', 'rejected', 'skipped');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `, { transaction }).catch(() => {});

    // 2. Create documents table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "documentType" "enum_documents_documentType" NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "documentPath" VARCHAR(255) NOT NULL,
        "fileName" VARCHAR(255),
        "fileSize" INTEGER,
        "mimeType" VARCHAR(100),
        "uploadDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "expiryDate" DATE,
        "description" TEXT,
        "isActive" BOOLEAN DEFAULT true,
        "uploadedBy" INTEGER REFERENCES "users"("id"),
        "notes" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `, { transaction }).catch((err) => {
      if (!err.message.includes('already exists')) console.warn('⚠️ documents table:', err.message);
    });

    // 3. Create overtime_requests table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "overtime_requests" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "date" DATE NOT NULL,
        "startTime" TIME NOT NULL,
        "endTime" TIME NOT NULL,
        "totalHours" DECIMAL(5,2) NOT NULL,
        "reason" TEXT NOT NULL,
        "projectName" VARCHAR(255),
        "approvalStatus" "enum_overtime_requests_approvalStatus" DEFAULT 'pending',
        "approvedBy" INTEGER REFERENCES "users"("id"),
        "approvedAt" TIMESTAMP WITH TIME ZONE,
        "rejectionReason" TEXT,
        "approvalLevel" INTEGER DEFAULT 1,
        "currentApproverId" INTEGER REFERENCES "users"("id"),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `, { transaction }).catch((err) => {
      if (!err.message.includes('already exists')) console.warn('⚠️ overtime_requests table:', err.message);
    });

    // 4. Create business_trip_requests table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "business_trip_requests" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "startDate" DATE NOT NULL,
        "endDate" DATE NOT NULL,
        "destination" VARCHAR(255) NOT NULL,
        "purpose" TEXT NOT NULL,
        "estimatedCost" DECIMAL(12,2),
        "transportType" "enum_business_trip_requests_transportType",
        "accommodation" VARCHAR(255),
        "approvalStatus" "enum_overtime_requests_approvalStatus" DEFAULT 'pending',
        "approvedBy" INTEGER REFERENCES "users"("id"),
        "approvedAt" TIMESTAMP WITH TIME ZONE,
        "rejectionReason" TEXT,
        "approvalLevel" INTEGER DEFAULT 1,
        "currentApproverId" INTEGER REFERENCES "users"("id"),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `, { transaction }).catch((err) => {
      if (!err.message.includes('already exists')) console.warn('⚠️ business_trip_requests table:', err.message);
    });

    // 5. Create salary_advances table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "salary_advances" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "month" INTEGER NOT NULL CHECK ("month" >= 1 AND "month" <= 12),
        "year" INTEGER NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "reason" TEXT,
        "requestDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "approvalStatus" "enum_overtime_requests_approvalStatus" DEFAULT 'pending',
        "approvedBy" INTEGER REFERENCES "users"("id"),
        "approvedAt" TIMESTAMP WITH TIME ZONE,
        "rejectionReason" TEXT,
        "isDeducted" BOOLEAN DEFAULT false,
        "deductedAt" TIMESTAMP WITH TIME ZONE,
        "salaryId" INTEGER,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE("userId", "month", "year")
      );
    `, { transaction }).catch((err) => {
      if (!err.message.includes('already exists')) console.warn('⚠️ salary_advances table:', err.message);
    });

    // 6. Create approval_workflows table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "approval_workflows" (
        "id" SERIAL PRIMARY KEY,
        "requestType" "enum_approval_workflows_requestType" NOT NULL,
        "requestId" INTEGER NOT NULL,
        "level" INTEGER NOT NULL,
        "approverId" INTEGER NOT NULL REFERENCES "users"("id"),
        "status" "enum_approval_workflows_status" DEFAULT 'pending',
        "approvedAt" TIMESTAMP WITH TIME ZONE,
        "comments" TEXT,
        "isRequired" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `, { transaction }).catch((err) => {
      if (!err.message.includes('already exists')) console.warn('⚠️ approval_workflows table:', err.message);
    });

    // 7. Create insurance_configs table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "insurance_configs" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL UNIQUE,
        "effectiveDate" DATE NOT NULL,
        "expiryDate" DATE,
        "employeeSocialInsuranceRate" DECIMAL(5,2) DEFAULT 10.5,
        "employerSocialInsuranceRate" DECIMAL(5,2) DEFAULT 21.5,
        "employeeHealthInsuranceRate" DECIMAL(5,2) DEFAULT 1.5,
        "employerHealthInsuranceRate" DECIMAL(5,2) DEFAULT 3.0,
        "employeeUnemploymentInsuranceRate" DECIMAL(5,2) DEFAULT 1.0,
        "employerUnemploymentInsuranceRate" DECIMAL(5,2) DEFAULT 1.0,
        "maxInsuranceSalary" DECIMAL(12,2),
        "minInsuranceSalary" DECIMAL(12,2),
        "isActive" BOOLEAN DEFAULT true,
        "description" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `, { transaction }).catch((err) => {
      if (!err.message.includes('already exists')) console.warn('⚠️ insurance_configs table:', err.message);
    });

    // 8. Add insuranceBaseSalary to users table
    await sequelize.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "insuranceBaseSalary" DECIMAL(12,2);
    `, { transaction }).catch(() => {});

    // 9. Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "documents_userId_documentType_idx" ON "documents"("userId", "documentType");
      CREATE INDEX IF NOT EXISTS "documents_expiryDate_idx" ON "documents"("expiryDate");
      CREATE INDEX IF NOT EXISTS "overtime_requests_userId_date_idx" ON "overtime_requests"("userId", "date");
      CREATE INDEX IF NOT EXISTS "overtime_requests_approvalStatus_idx" ON "overtime_requests"("approvalStatus");
      CREATE INDEX IF NOT EXISTS "business_trip_requests_userId_startDate_idx" ON "business_trip_requests"("userId", "startDate");
      CREATE INDEX IF NOT EXISTS "business_trip_requests_approvalStatus_idx" ON "business_trip_requests"("approvalStatus");
      CREATE INDEX IF NOT EXISTS "salary_advances_approvalStatus_idx" ON "salary_advances"("approvalStatus");
      CREATE INDEX IF NOT EXISTS "approval_workflows_requestType_requestId_level_idx" ON "approval_workflows"("requestType", "requestId", "level");
      CREATE INDEX IF NOT EXISTS "approval_workflows_approverId_status_idx" ON "approval_workflows"("approverId", "status");
      CREATE INDEX IF NOT EXISTS "insurance_configs_effectiveDate_isActive_idx" ON "insurance_configs"("effectiveDate", "isActive");
    `, { transaction }).catch(() => {});

    await transaction.commit();
    console.log('✅ New features models migration completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ New features models migration failed:', error.message);
    throw error;
  }
};

export const down = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🔄 Rolling back new features models...');

    await sequelize.query(`DROP TABLE IF EXISTS "insurance_configs";`, { transaction }).catch(() => {});
    await sequelize.query(`DROP TABLE IF EXISTS "approval_workflows";`, { transaction }).catch(() => {});
    await sequelize.query(`DROP TABLE IF EXISTS "salary_advances";`, { transaction }).catch(() => {});
    await sequelize.query(`DROP TABLE IF EXISTS "business_trip_requests";`, { transaction }).catch(() => {});
    await sequelize.query(`DROP TABLE IF EXISTS "overtime_requests";`, { transaction }).catch(() => {});
    await sequelize.query(`DROP TABLE IF EXISTS "documents";`, { transaction }).catch(() => {});
    
    await sequelize.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "insuranceBaseSalary";`, { transaction }).catch(() => {});

    await sequelize.query(`DROP TYPE IF EXISTS "enum_approval_workflows_status";`, { transaction }).catch(() => {});
    await sequelize.query(`DROP TYPE IF EXISTS "enum_approval_workflows_requestType";`, { transaction }).catch(() => {});
    await sequelize.query(`DROP TYPE IF EXISTS "enum_business_trip_requests_transportType";`, { transaction }).catch(() => {});
    await sequelize.query(`DROP TYPE IF EXISTS "enum_overtime_requests_approvalStatus";`, { transaction }).catch(() => {});
    await sequelize.query(`DROP TYPE IF EXISTS "enum_documents_documentType";`, { transaction }).catch(() => {});

    await transaction.commit();
    console.log('✅ Rollback completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('add-new-features-models')) {
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



