import "dotenv/config";
import sequelize from "../sequelize.js";

const statements = [
  `CREATE TABLE IF NOT EXISTS role_change_audits (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    "changedBy" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    "oldRole" VARCHAR(64) NOT NULL,
    "newRole" VARCHAR(64) NOT NULL,
    reason TEXT,
    "ipAddress" VARCHAR(128),
    "userAgent" VARCHAR(512),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_role_change_audits_user_created ON role_change_audits("userId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS idx_role_change_audits_changed_by_created ON role_change_audits("changedBy", "createdAt");`,
  `ALTER TABLE salary_advances
     ADD COLUMN IF NOT EXISTS "approvalLevel" INTEGER NOT NULL DEFAULT 1,
     ADD COLUMN IF NOT EXISTS "currentApproverId" INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;`,
  `CREATE INDEX IF NOT EXISTS idx_salary_advances_current_approver ON salary_advances("currentApproverId", "approvalStatus");`,
];

try {
  await sequelize.authenticate();
  console.log("DB_AUTH_OK");
  for (const statement of statements) {
    await sequelize.query(statement);
  }
  console.log("ROLE_AUDIT_AND_APPROVAL_COLUMNS_READY");
} catch (error) {
  console.error("ROLE_AUDIT_AND_APPROVAL_COLUMNS_ERROR");
  console.error(error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
