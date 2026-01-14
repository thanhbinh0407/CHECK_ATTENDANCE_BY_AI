#!/usr/bin/env node
/**
 * CLEAN SLATE: Xóa tất cả old profiles với invalid data
 * Run: node clean-profiles.js
 */

import { FaceProfile, User, AttendanceLog } from "./src/models/pg/index.js";
import sequelize from "./src/db/sequelize.js";

console.log(`
╔════════════════════════════════════════════════════════════╗
║     CLEANING: Xóa Profiles & Logs Cũ                     ║
║     ⚠️  THIS WILL DELETE ALL DATA IN DB!                 ║
╚════════════════════════════════════════════════════════════╝
`);

try {
  // Check current state
  console.log('\n📋 Current state:');
  const userCount = await User.count();
  const profileCount = await FaceProfile.count();
  const logCount = await AttendanceLog.count();
  
  console.log(`  Users: ${userCount}`);
  console.log(`  Face Profiles: ${profileCount}`);
  console.log(`  Attendance Logs: ${logCount}`);

  // Delete all
  console.log('\n🗑️  Deleting...');
  await AttendanceLog.truncate({ cascade: true });
  console.log('   ✓ Attendance logs deleted');
  
  await FaceProfile.truncate({ cascade: true });
  console.log('   ✓ Face profiles deleted');
  
  await User.truncate({ cascade: true });
  console.log('   ✓ Users deleted');

  // Verify
  const newUserCount = await User.count();
  const newProfileCount = await FaceProfile.count();
  const newLogCount = await AttendanceLog.count();
  
  console.log('\n✅ After cleanup:');
  console.log(`  Users: ${newUserCount}`);
  console.log(`  Face Profiles: ${newProfileCount}`);
  console.log(`  Attendance Logs: ${newLogCount}`);

  console.log('\n✅ Database cleaned successfully!');
  console.log('   Now you can test with fresh data.');
  console.log('\n💡 Tip: Re-enroll employees through the frontend.');

  await sequelize.close();
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
