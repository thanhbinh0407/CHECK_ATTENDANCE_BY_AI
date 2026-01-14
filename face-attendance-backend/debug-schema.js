import sequelize from "./src/db/sequelize.js";

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log("Database connected\n");

    // Check face_profiles table
    const profilesResult = await sequelize.query(`
      SELECT fp.id, fp."userId", u.id as user_id, u.name, u.email, u.role
      FROM face_profiles fp
      LEFT JOIN users u ON fp."userId" = u.id
      ORDER BY fp.id
    `);

    console.log("📋 Face Profiles:");
    profilesResult[0].forEach((row, idx) => {
      console.log(`  ${idx+1}. Profile ID ${row.id}: userId=${row.userId}, User=${row.name || 'NULL'}`);
    });

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sequelize.close();
  }
}

checkSchema();
