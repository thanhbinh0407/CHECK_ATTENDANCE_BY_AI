import 'dotenv/config';
import sequelize from '../src/db/sequelize.js';
import '../src/models/pg/index.js';

try {
  await sequelize.authenticate();
  console.log('DB_AUTH_OK');

  await sequelize.sync({ alter: true });
  console.log('DB_SYNC_OK');

  const [tables] = await sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('job_history','salary_history') ORDER BY table_name"
  );

  console.log(JSON.stringify(tables, null, 2));
} catch (error) {
  console.error('DB_SYNC_ERROR');
  console.error(error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
