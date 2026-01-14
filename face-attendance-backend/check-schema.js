import sequelize from './src/db/sequelize.js';
import { QueryTypes } from 'sequelize';

const result = await sequelize.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position",
  {type: QueryTypes.SELECT}
);

console.log("Users table columns:");
result.forEach(r => console.log(`  - ${r.column_name}`));

await sequelize.close();
