import 'dotenv/config';
import sequelize from '../sequelize.js';

const statements = [
  `DO $$
  BEGIN
    CREATE TYPE "enum_job_history_changeType" AS ENUM ('hire', 'initial_assignment', 'transfer', 'promotion', 'demotion', 'correction', 'other');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$
  BEGIN
    CREATE TYPE "enum_salary_history_changeType" AS ENUM ('initial_salary', 'increase', 'decrease', 'correction', 'other');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS job_history (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    "fromDepartmentId" INTEGER REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE,
    "toDepartmentId" INTEGER REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE,
    "fromJobTitleId" INTEGER REFERENCES job_titles(id) ON DELETE SET NULL ON UPDATE CASCADE,
    "toJobTitleId" INTEGER REFERENCES job_titles(id) ON DELETE SET NULL ON UPDATE CASCADE,
    "changeType" "enum_job_history_changeType" NOT NULL DEFAULT 'other',
    "effectiveDate" DATE NOT NULL,
    notes TEXT,
    "changedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS salary_history (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    "previousBaseSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "newBaseSalary" DECIMAL(12,2) NOT NULL,
    "previousTotalAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "newTotalAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "changeType" "enum_salary_history_changeType" NOT NULL DEFAULT 'other',
    "effectiveDate" DATE NOT NULL,
    reason TEXT,
    "changedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `ALTER TABLE job_history
      ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      ADD COLUMN IF NOT EXISTS "fromDepartmentId" INTEGER REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD COLUMN IF NOT EXISTS "toDepartmentId" INTEGER REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD COLUMN IF NOT EXISTS "fromJobTitleId" INTEGER REFERENCES job_titles(id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD COLUMN IF NOT EXISTS "toJobTitleId" INTEGER REFERENCES job_titles(id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD COLUMN IF NOT EXISTS "changeType" "enum_job_history_changeType",
      ADD COLUMN IF NOT EXISTS "effectiveDate" DATE,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS "changedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();`,
  `ALTER TABLE salary_history
      ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      ADD COLUMN IF NOT EXISTS "previousBaseSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "newBaseSalary" DECIMAL(12,2),
      ADD COLUMN IF NOT EXISTS "previousTotalAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "newTotalAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "changeType" "enum_salary_history_changeType",
      ADD COLUMN IF NOT EXISTS "effectiveDate" DATE,
      ADD COLUMN IF NOT EXISTS reason TEXT,
      ADD COLUMN IF NOT EXISTS "changedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();`,
  `UPDATE job_history SET "changeType" = 'other' WHERE "changeType" IS NULL;`,
  `UPDATE salary_history SET "changeType" = 'other' WHERE "changeType" IS NULL;`,
  `ALTER TABLE job_history ALTER COLUMN "userId" SET NOT NULL;`,
  `ALTER TABLE job_history ALTER COLUMN "changeType" SET NOT NULL;`,
  `ALTER TABLE job_history ALTER COLUMN "changeType" SET DEFAULT 'other';`,
  `ALTER TABLE job_history ALTER COLUMN "effectiveDate" SET NOT NULL;`,
  `ALTER TABLE salary_history ALTER COLUMN "userId" SET NOT NULL;`,
  `ALTER TABLE salary_history ALTER COLUMN "newBaseSalary" SET NOT NULL;`,
  `ALTER TABLE salary_history ALTER COLUMN "changeType" SET NOT NULL;`,
  `ALTER TABLE salary_history ALTER COLUMN "changeType" SET DEFAULT 'other';`,
  `ALTER TABLE salary_history ALTER COLUMN "effectiveDate" SET NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_job_history_user_effective_date ON job_history("userId", "effectiveDate");`,
  `CREATE INDEX IF NOT EXISTS idx_job_history_to_department_id ON job_history("toDepartmentId");`,
  `CREATE INDEX IF NOT EXISTS idx_job_history_to_job_title_id ON job_history("toJobTitleId");`,
  `CREATE INDEX IF NOT EXISTS idx_salary_history_user_effective_date ON salary_history("userId", "effectiveDate");`
];

try {
  await sequelize.authenticate();
  console.log('DB_AUTH_OK');

  for (const statement of statements) {
    await sequelize.query(statement);
  }

  const [tables] = await sequelize.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('job_history','salary_history') ORDER BY table_name`
  );

  console.log('HISTORY_TABLES_READY');
  console.log(JSON.stringify(tables, null, 2));
} catch (error) {
  console.error('HISTORY_TABLES_MIGRATION_ERROR');
  console.error(error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
