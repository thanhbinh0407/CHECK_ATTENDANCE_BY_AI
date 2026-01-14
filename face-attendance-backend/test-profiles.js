import sequelize from "./src/db/sequelize.js";
import { User, FaceProfile } from "./src/models/pg/index.js";

async function checkProfiles() {
  try {
    await sequelize.authenticate();
    console.log("Database connected\n");

    const users = await User.findAll();
    console.log(`📊 Total users: ${users.length}`);
    users.forEach(u => console.log(`  - ${u.name} (${u.email}) [${u.role}]`));

    const profiles = await FaceProfile.findAll({ 
      include: [{ 
        model: User, 
        attributes: ['id', 'name', 'email', 'employeeCode'] 
      }] 
    });
    console.log(`\n📊 Face profiles: ${profiles.length}`);
    
    profiles.forEach(p => {
      const embedLen = Array.isArray(p.embeddings) ? p.embeddings.length : 0;
      const userName = p.User?.name || "Unknown";
      console.log(`  - ${userName} (ID ${p.userId}): ${embedLen} dims`);
    });

    if (profiles.length === 0) {
      console.log("\nNo face profiles found! Please enroll users in Admin Frontend first.");
    } else {
      console.log("\nProfiles ready for face matching");
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sequelize.close();
  }
}

checkProfiles();
