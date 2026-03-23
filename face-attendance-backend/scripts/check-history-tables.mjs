import 'dotenv/config';
import sequelize from '../src/db/sequelize.js';

try {
  await sequelize.authenticate();

  const [tables] = await sequelize.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('job_history', 'salary_history')
    ORDER BY table_name;
  `);

  const [jobColumns] = await sequelize.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_history'
    ORDER BY ordinal_position;
  `);

  const [salaryColumns] = await sequelize.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'salary_history'
    ORDER BY ordinal_position;
  `);

  console.log(JSON.stringify({ tables, jobColumns, salaryColumns }, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
