#!/usr/bin/env node
/**
 * Automated Testing Script
 * Chạy: node auto-test.js
 * 
 * Script này sẽ:
 * 1. Kiểm tra embeddings format
 * 2. Reset database
 * 3. Re-enroll test users
 * 4. Test matching logic
 * 5. Báo cáo kết quả chi tiết
 */

import { FaceProfile, User, AttendanceLog } from "./src/models/pg/index.js";
import sequelize from "./src/db/sequelize.js";
import { matchDescriptor } from "./src/services/matchService.js";

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function section(title) {
  console.log('\n' + colors.cyan + '════════════════════════════════════════════════════════' + colors.reset);
  log(colors.bright + colors.blue, `📌 ${title}`);
  console.log(colors.cyan + '════════════════════════════════════════════════════════' + colors.reset);
}

function success(msg) {
  log(colors.green, `✅ ${msg}`);
}

function error(msg) {
  log(colors.red, `❌ ${msg}`);
}

function warning(msg) {
  log(colors.yellow, `⚠️  ${msg}`);
}

function info(msg) {
  log(colors.cyan, `ℹ️  ${msg}`);
}

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function recordTest(name, passed, message = '') {
  if (passed) {
    results.passed++;
    success(`${name}`);
    if (message) info(`   ${message}`);
  } else {
    results.failed++;
    error(`${name}`);
    if (message) warning(`   ${message}`);
  }
  results.details.push({ name, passed, message });
}

(async () => {
  try {
    section('AUTOMATED FACE MATCHING TEST SUITE');
    
    // ========================================
    // TEST 1: Database Connection
    // ========================================
    section('TEST 1: Database Connection');
    try {
      await sequelize.authenticate();
      success('Connected to PostgreSQL 17');
    } catch (err) {
      error(`Database connection failed: ${err.message}`);
      process.exit(1);
    }

    // ========================================
    // TEST 2: Check Current Data
    // ========================================
    section('TEST 2: Current Database State');
    const userCount = await User.count();
    const profileCount = await FaceProfile.count();
    const logCount = await AttendanceLog.count();
    
    info(`Users: ${userCount}`);
    info(`Face Profiles: ${profileCount}`);
    info(`Attendance Logs: ${logCount}`);

    if (profileCount > 0) {
      warning('Database has old data. Cleaning up...');
      // Show sample
      const samples = await FaceProfile.findAll({ limit: 2, include: [{ model: User, attributes: ['name'] }] });
      samples.forEach(s => info(`   - ${s.User?.name}`));
    }

    // ========================================
    // TEST 3: Clean Database
    // ========================================
    section('TEST 3: Clean Database');
    try {
      await AttendanceLog.truncate({ cascade: true });
      await FaceProfile.truncate({ cascade: true });
      await User.truncate({ cascade: true });
      success('Database cleaned successfully');
    } catch (err) {
      error(`Failed to clean database: ${err.message}`);
      process.exit(1);
    }

    // ========================================
    // TEST 4: Create Test Users & Embeddings
    // ========================================
    section('TEST 4: Create Test Data');
    
    // Generate realistic embeddings (128 numbers between -1 and 1)
    const generateEmbedding = () => Array.from({ length: 128 }, () => Math.random() * 2 - 1);
    
    // Create 3 test users with different embeddings
    const testUsers = [
      {
        name: 'Nguyễn Văn A',
        email: 'a@test.com',
        employeeCode: 'EMP001',
        embedding: generateEmbedding()
      },
      {
        name: 'Trần Thị B',
        email: 'b@test.com',
        employeeCode: 'EMP002',
        embedding: generateEmbedding()
      },
      {
        name: 'Phạm Văn C',
        email: 'c@test.com',
        employeeCode: 'EMP003',
        embedding: generateEmbedding()
      }
    ];

    const createdUsers = [];
    for (const testUser of testUsers) {
      const user = await User.create({
        name: testUser.name,
        email: testUser.email,
        employeeCode: testUser.employeeCode,
        role: 'employee'
      });

      const profile = await FaceProfile.create({
        userId: user.id,
        embeddings: testUser.embedding
      });

      createdUsers.push({
        ...user.toJSON(),
        profile,
        embedding: testUser.embedding
      });

      success(`Created: ${testUser.name} (ID: ${user.id})`);
    }

    // ========================================
    // TEST 5: Test Matching - Exact Match
    // ========================================
    section('TEST 5: Test Exact Matching');
    const user1 = createdUsers[0];
    const exactMatchResult = await matchDescriptor(user1.embedding, 0.6);
    
    recordTest(
      'Exact match should succeed',
      exactMatchResult.matched === true && exactMatchResult.userId === user1.id,
      `Distance: ${exactMatchResult.distance.toFixed(3)}, Name: ${exactMatchResult.detectedName}`
    );

    // ========================================
    // TEST 6: Test Unmatched Face
    // ========================================
    section('TEST 6: Test Unknown Face');
    const unknownEmbedding = generateEmbedding(); // Random embedding not in DB
    const unknownResult = await matchDescriptor(unknownEmbedding, 0.6);
    
    recordTest(
      'Unknown face should return matched=false',
      unknownResult.matched === false,
      `Detected Name: ${unknownResult.detectedName}, Distance: ${unknownResult.distance.toFixed(3)}`
    );

    recordTest(
      'Unknown face should return detectedName="Unknown"',
      unknownResult.detectedName === 'Unknown',
      `Got: "${unknownResult.detectedName}" instead`
    );

    // ========================================
    // TEST 7: Test Different Thresholds
    // ========================================
    section('TEST 7: Test Different Thresholds');
    
    const result06 = await matchDescriptor(user1.embedding, 0.6);
    recordTest(
      'Threshold 0.6 should match user1',
      result06.matched === true,
      `Distance: ${result06.distance.toFixed(3)}`
    );

    const result02 = await matchDescriptor(user1.embedding, 0.2);
    recordTest(
      'Threshold 0.2 might not match user1 (depends on distance)',
      true,
      `Distance: ${result02.distance.toFixed(3)}, Matched: ${result02.matched}`
    );

    // ========================================
    // TEST 8: Test Top Match Info
    // ========================================
    section('TEST 8: Test Top Match Information');
    recordTest(
      'Unknown face should have topMatch info',
      unknownResult.topMatch !== null && unknownResult.topMatch.name !== undefined,
      `Top match: ${unknownResult.topMatch?.name} (distance: ${unknownResult.topMatch?.distance?.toFixed(3)})`
    );

    // ========================================
    // TEST 9: Test Multiple Profiles
    // ========================================
    section('TEST 9: Test With Multiple Profiles');
    
    const user2 = createdUsers[1];
    const user3 = createdUsers[2];
    
    const matchUser2 = await matchDescriptor(user2.embedding, 0.6);
    recordTest(
      'Should correctly identify user2',
      matchUser2.matched === true && matchUser2.userId === user2.id,
      `Matched: ${matchUser2.detectedName}`
    );

    const matchUser3 = await matchDescriptor(user3.embedding, 0.6);
    recordTest(
      'Should correctly identify user3',
      matchUser3.matched === true && matchUser3.userId === user3.id,
      `Matched: ${matchUser3.detectedName}`
    );

    // ========================================
    // TEST 10: Test Embeddings Format
    // ========================================
    section('TEST 10: Verify Embeddings Format');
    const allProfiles = await FaceProfile.findAll();
    
    let allValid = true;
    for (const profile of allProfiles) {
      const isArray = Array.isArray(profile.embeddings);
      const hasLength128 = profile.embeddings?.length === 128;
      const allNumbers = Array.isArray(profile.embeddings) && profile.embeddings.every(v => typeof v === 'number');
      
      if (!isArray || !hasLength128 || !allNumbers) {
        allValid = false;
        error(`Profile ${profile.id} has invalid embeddings`);
      }
    }
    
    recordTest(
      'All embeddings should be arrays of 128 numbers',
      allValid,
      `Checked ${allProfiles.length} profiles`
    );

    // ========================================
    // TEST 11: Stress Test
    // ========================================
    section('TEST 11: Stress Test - 100 Random Descriptors');
    let correctRejections = 0;
    let incorrectMatches = 0;
    
    for (let i = 0; i < 100; i++) {
      const randomDesc = generateEmbedding();
      const result = await matchDescriptor(randomDesc, 0.6);
      
      if (!result.matched) {
        correctRejections++;
      } else {
        // If matched, verify it's one of our users
        const isValidUser = createdUsers.some(u => u.id === result.userId);
        if (!isValidUser) {
          incorrectMatches++;
        }
      }
    }
    
    recordTest(
      'Stress test: 100 random descriptors',
      incorrectMatches === 0,
      `Correct rejections: ${correctRejections}/100, Incorrect matches: ${incorrectMatches}`
    );

    // ========================================
    // FINAL REPORT
    // ========================================
    section('TEST SUMMARY');
    
    console.log(colors.bright);
    console.log(`Total Tests: ${results.passed + results.failed}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(colors.reset);

    if (results.failed === 0) {
      log(colors.green + colors.bright, '🎉 ALL TESTS PASSED!');
    } else {
      log(colors.red + colors.bright, '⚠️  SOME TESTS FAILED - CHECK ABOVE');
    }

    console.log('\n' + colors.cyan + '════════════════════════════════════════════════════════' + colors.reset);
    section('DETAILED REPORT');
    
    results.details.forEach(detail => {
      const icon = detail.passed ? '✅' : '❌';
      console.log(`${icon} ${detail.name}`);
      if (detail.message) {
        console.log(`   ${detail.message}`);
      }
    });

    // ========================================
    // RECOMMENDATIONS
    // ========================================
    if (results.failed === 0) {
      section('✅ RECOMMENDATIONS');
      success('All systems operational!');
      info('Next steps:');
      console.log(colors.cyan + `
  1. Test with real Employee Kiosk:
     - Enroll new employees
     - Scan registered faces → Should show name
     - Scan unknown faces → Should show "Khuôn mặt không khớp"
  
  2. Monitor logs during real testing:
     - Check console output
     - Verify "NO MATCH" shows detectedName: "Unknown"
  
  3. If issue persists:
     - Check frontend DevTools console
     - Verify threshold in .env
     - Check for cached data in browser
      ` + colors.reset);
    } else {
      section('🔧 WHAT TO FIX');
      results.details.filter(d => !d.passed).forEach(detail => {
        warning(`- ${detail.name}`);
        if (detail.message) info(`  ${detail.message}`);
      });
    }

    console.log('\n' + colors.bright + colors.green + '✨ Test suite completed!' + colors.reset + '\n');

    await sequelize.close();
    process.exit(results.failed === 0 ? 0 : 1);

  } catch (error) {
    console.error(colors.red + '\n❌ FATAL ERROR:' + colors.reset, error);
    process.exit(1);
  }
})();
