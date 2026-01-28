import dotenv from 'dotenv';
dotenv.config();

import sequelize from './src/db/sequelize.js';
import './src/models/pg/index.js';

async function resetDatabase() {
  try {
    console.log('🔄 Dropping all tables...');
    await sequelize.drop({ cascade: true });
    console.log('✅ All tables dropped');
    
    console.log('🔄 Dropping all ENUM types...');
    
    // Drop all enum types that might exist
    const enums = ['enum_users_gender', 'enum_salaries_status', 'enum_payrolls_status', 'enum_salaries_status_backup', 'enum_users_role'];
    for (const enumName of enums) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "public"."${enumName}" CASCADE;`);
        console.log(`  ✓ Dropped enum: ${enumName}`);
      } catch (e) {
        // Ignore if doesn't exist
      }
    }
    
    console.log('🔄 Creating fresh tables from scratch...');
    // Delete all models to clear Sequelize cache
    Object.keys(sequelize.models).forEach(modelName => {
      delete sequelize.models[modelName];
    });
    
    // Re-import models
    await import('./src/models/pg/index.js');
    
    // Now sync with fresh state
    await sequelize.sync({ alter: true });
    console.log('✅ Schema synced successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resetDatabase();
