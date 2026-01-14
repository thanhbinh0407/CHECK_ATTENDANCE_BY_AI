import sequelize from "./src/db/sequelize.js";
import { FaceProfile, User } from "./src/models/pg/index.js";
import { matchDescriptor } from "./src/services/matchService.js";

async function testMatching() {
  try {
    await sequelize.authenticate();
    console.log("Database connected\n");

    // Get first profile as test descriptor
    const profile = await FaceProfile.findOne({
      include: [{ model: User, attributes: ['name', 'email'] }]
    });

    if (!profile) {
      console.log("No profiles found");
      await sequelize.close();
      return;
    }

    console.log(`🧪 Testing match with: ${profile.User?.name}\n`);
    console.log(`📊 Descriptor length: ${Array.isArray(profile.embeddings) ? profile.embeddings.length : 'Invalid'}`);
    
    // Test exact match
    const result = await matchDescriptor(profile.embeddings, 0.65);
    
    console.log(`\nMatch result:`);
    console.log(`   - Matched: ${result.matched}`);
    console.log(`   - Name: ${result.detectedName}`);
    console.log(`   - Distance: ${result.distance.toFixed(3)}`);
    console.log(`   - Threshold: 0.65`);

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sequelize.close();
  }
}

testMatching();
