/**
 * DATA CONFLICT RESOLVER
 * Xử lý xung đột dữ liệu cũ, trùng lặp profiles
 * 
 * Chạy: node clean-conflicts.js
 * 
 * Phát hiện:
 * - Profiles trùng lặp (cùng email/username)
 * - Embeddings cũ không được cập nhật
 * - Dữ liệu NULL/undefined
 * - Conflict giữa MongoDB và PostgreSQL
 */

import Sequelize from 'sequelize';
import sequelize from './src/db/sequelize.js';
import FaceProfile from './src/models/pg/FaceProfile.js';
import User from './src/models/pg/User.js';
import AttendanceLog from './src/models/pg/AttendanceLog.js';

console.log('\n🔧 DATA CONFLICT RESOLVER - AGGRESSIVE MODE\n');

async function cleanConflicts() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL 17');

    // ====================
    // 1. FIND DUPLICATES
    // ====================
    console.log('\n1️⃣  Finding duplicate profiles...');
    
    const duplicates = await sequelize.query(`
      SELECT 
        "userId", 
        COUNT(*) as count,
        array_agg("id") as ids,
        array_agg("createdAt") as createdAts
      FROM "FaceProfiles"
      GROUP BY "userId"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} users with duplicate profiles:`);
      
      for (const dup of duplicates) {
        console.log(`\n   User ID: ${dup.userId} (${dup.count} profiles)`);
        
        // Keep newest, delete others (AGGRESSIVE)
        const sortedIds = dup.ids.sort((a, b) => {
          const idxA = dup.ids.indexOf(a);
          const idxB = dup.ids.indexOf(b);
          const timeA = dup.createdAts[idxA];
          const timeB = dup.createdAts[idxB];
          return new Date(timeB) - new Date(timeA);
        });

        const keepId = sortedIds[0];
        const deleteIds = sortedIds.slice(1);

        console.log(`   ✓ Keeping: ${keepId}`);
        console.log(`   ✗ Deleting: ${deleteIds.join(', ')}`);

        await FaceProfile.destroy({ where: { id: deleteIds } });
        console.log(`   ✅ Deleted ${deleteIds.length} old profiles`);
      }
    } else {
      console.log('✅ No duplicate profiles found');
    }

    // ====================
    // 2. FIND NULL EMBEDDINGS
    // ====================
    console.log('\n2️⃣  Finding profiles with NULL embeddings...');

    const nullEmbeddings = await FaceProfile.count({
      where: { embedding: null }
    });

    if (nullEmbeddings > 0) {
      console.log(`⚠️  Found ${nullEmbeddings} profiles with NULL embeddings`);
      
      // Delete NULL embeddings (AGGRESSIVE - they're useless)
      await FaceProfile.destroy({ where: { embedding: null } });
      console.log(`✅ Deleted ${nullEmbeddings} profiles with NULL embeddings`);
    } else {
      console.log('✅ All profiles have embeddings');
    }

    // ====================
    // 3. FIND INVALID EMBEDDINGS
    // ====================
    console.log('\n3️⃣  Validating embedding format...');

    const allProfiles = await FaceProfile.findAll({
      attributes: ['id', 'userId', 'embedding']
    });

    let invalidCount = 0;
    const invalidIds = [];

    for (const profile of allProfiles) {
      if (profile.embedding) {
        try {
          const emb = Array.isArray(profile.embedding) ? profile.embedding : JSON.parse(profile.embedding);
          
          // Check if valid (array of 128 numbers)
          if (!Array.isArray(emb) || emb.length !== 128 || !emb.every(n => typeof n === 'number')) {
            invalidCount++;
            invalidIds.push(profile.id);
            console.log(`   ❌ Profile ${profile.id} (User ${profile.userId}): Invalid format`);
          }
        } catch (e) {
          invalidCount++;
          invalidIds.push(profile.id);
          console.log(`   ❌ Profile ${profile.id} (User ${profile.userId}): Parse error`);
        }
      }
    }

    if (invalidCount > 0) {
      console.log(`\n⚠️  Found ${invalidCount} profiles with invalid embeddings`);
      
      // Delete invalid embeddings (AGGRESSIVE)
      await FaceProfile.destroy({ where: { id: invalidIds } });
      console.log(`✅ Deleted ${invalidCount} invalid profiles`);
    } else {
      console.log(`✅ All ${allProfiles.length} embeddings are valid (128-dim vectors)`);
    }

    // ====================
    // 4. FIND ORPHAN PROFILES
    // ====================
    console.log('\n4️⃣  Finding orphan profiles (user deleted but profile exists)...');

    const orphans = await sequelize.query(`
      SELECT fp.id, fp."userId", fp."createdAt"
      FROM "FaceProfiles" fp
      LEFT JOIN "Users" u ON fp."userId" = u.id
      WHERE u.id IS NULL
    `, { type: Sequelize.QueryTypes.SELECT });

    if (orphans.length > 0) {
      console.log(`⚠️  Found ${orphans.length} orphan profiles:`);
      
      for (const orphan of orphans) {
        console.log(`   ❌ Profile ${orphan.id} → User ${orphan.userId} (deleted)`);
      }

      // Delete orphan profiles (AGGRESSIVE)
      const orphanIds = orphans.map(o => o.id);
      await FaceProfile.destroy({ where: { id: orphanIds } });
      console.log(`✅ Deleted ${orphanIds.length} orphan profiles`);
    } else {
      console.log('✅ No orphan profiles found');
    }

    // ====================
    // 5. FIX OLD ATTENDANCE LOGS
    // ====================
    console.log('\n5️⃣  Cleaning up attendance logs...');

    const oldLogsCount = await AttendanceLog.count({
      where: { createdAt: { [Sequelize.Op.lt]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
    });

    if (oldLogsCount > 0) {
      console.log(`⚠️  Found ${oldLogsCount} attendance logs older than 90 days`);
      console.log('   (Keeping for audit, can manually archive)');
    }

    // ====================
    // 6. SUMMARY REPORT
    // ====================
    console.log('\n📊 FINAL DATA INTEGRITY CHECK:');

    const totalUsers = await User.count();
    const totalProfiles = await FaceProfile.count();
    const usersWithProfiles = await sequelize.query(`
      SELECT COUNT(DISTINCT "userId") as count
      FROM "FaceProfiles"
    `, { type: Sequelize.QueryTypes.SELECT });
    const avgProfilesPerUser = (totalProfiles / usersWithProfiles[0].count).toFixed(2);

    const validEmbeddings = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM "FaceProfiles"
      WHERE embedding IS NOT NULL
        AND jsonb_typeof(embedding) = 'array'
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`   ✅ Total Users: ${totalUsers}`);
    console.log(`   ✅ Total Face Profiles: ${totalProfiles}`);
    console.log(`   ✅ Users with Profiles: ${usersWithProfiles[0].count}`);
    console.log(`   ✅ Valid Embeddings: ${validEmbeddings[0].count}`);
    console.log(`   ✅ Avg Profiles/User: ${avgProfilesPerUser}`);

    // ====================
    // 7. REBUILD INDEX
    // ====================
    console.log('\n7️⃣  Rebuilding database indexes...');

    await sequelize.query('VACUUM ANALYZE "FaceProfiles"');
    console.log('   ✅ Vacuumed and analyzed FaceProfiles table');

    await sequelize.query('REINDEX TABLE "FaceProfiles"');
    console.log('   ✅ Reindexed FaceProfiles table');

    console.log('\n✅ DATA CONFLICT RESOLUTION COMPLETE!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

cleanConflicts();
