import sequelize from '../sequelize.js';

/**
 * Add 'salary_advance' to enum_notifications_type so Notification.create({ type: 'salary_advance' }) works.
 * Run once; safe to re-run (ignores if value already exists).
 */
export const up = async () => {
  try {
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_notifications_type" ADD VALUE 'salary_advance';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  } catch (err) {
    if (!err.message?.includes('duplicate_object') && !err.message?.includes('already exists')) {
      throw err;
    }
  }
};

export const down = async () => {
  // PostgreSQL does not support removing a value from an enum easily; leave as no-op.
};

// Run migration if called directly
const isMain = process.argv[1]?.endsWith('add-notification-type-salary-advance.js');
if (isMain) {
  up()
    .then(() => {
      console.log('✅ Notification type salary_advance added.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err.message);
      process.exit(1);
    });
}
