import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
  process.env.PG_DATABASE || "facedb",
  process.env.PG_USER || "postgres",
  process.env.PG_PASSWORD || "123456",
  {
    host: process.env.PG_HOST || "127.0.0.1",
    port: process.env.PG_PORT || 5432,
    dialect: "postgres",
    logging: false,
  }
);

export default sequelize;
