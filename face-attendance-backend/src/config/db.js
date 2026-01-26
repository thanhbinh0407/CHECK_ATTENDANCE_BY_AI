import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  "face_attendance_db",   // DB name
  "face_user",            // username
  "123",               // password
  {
    host: "localhost",
    dialect: "postgres",
    logging: false,
  }
);

export default sequelize;
