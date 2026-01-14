import sequelize from './src/db/sequelize.js';

const queryInterface = sequelize.getQueryInterface();

try {
  console.log("Adding password column...");
  await queryInterface.addColumn('users', 'password', {
    type: sequelize.Sequelize.STRING,
    allowNull: true
  });
  console.log("password column added");

  console.log("Adding isActive column...");
  await queryInterface.addColumn('users', 'isActive', {
    type: sequelize.Sequelize.BOOLEAN,
    defaultValue: true
  });
  console.log("isActive column added");

  console.log("Migration completed successfully!");
} catch (err) {
  console.error("Migration error:", err.message);
} finally {
  await sequelize.close();
}
