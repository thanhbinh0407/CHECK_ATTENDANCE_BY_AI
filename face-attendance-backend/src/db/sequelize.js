import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT) || 5432,
  username: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD ? String(process.env.PG_PASSWORD) : '12345',
  database: process.env.PG_DATABASE || 'facedb',
  dialect: 'postgres',
  logging: false
});

export default sequelize;