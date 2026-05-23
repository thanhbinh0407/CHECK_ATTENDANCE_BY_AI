import sequelize from "./src/db/sequelize.js";

(async () => {
  try {
    console.log("🔄 Adding formal_6_month to contractType enum...");
    
    // PostgreSQL requires dropping and recreating the enum type to add new values
    await sequelize.query(`
      ALTER TYPE enum_users_contracttype ADD VALUE 'formal_6_month' BEFORE 'formal_1_year';
    `);
    
    console.log("✅ Contract type enum updated successfully!");
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    await sequelize.close();
    process.exit(1);
  }
})();
