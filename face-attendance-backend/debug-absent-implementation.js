#!/usr/bin/env node
/**
 * Comprehensive debug script for ABSENT type implementation
 * Usage: node debug-absent-implementation.js
 */

import sequelize from './src/db/sequelize.js';
import { AttendanceLog, User } from './src/models/pg/index.js';

async function debugDatabase() {
  try {
    console.log('🔍 DEBUGGING ABSENT TYPE IMPLEMENTATION\n');
    console.log('=' .repeat(60));

    // 1. Check database connection
    console.log('\n1️⃣  DATABASE CONNECTION');
    console.log('-'.repeat(60));
    try {
      await sequelize.authenticate();
      console.log('✅ Connected to database:', sequelize.config.database);
    } catch (e) {
      console.log('❌ Database connection failed:', e.message);
      process.exit(1);
    }

    // 2. Check AttendanceLogs table schema
    console.log('\n2️⃣  TABLE SCHEMA');
    console.log('-'.repeat(60));
    try {
      const queryInterface = sequelize.getQueryInterface();
      const columns = await queryInterface.describeTable('attendance_logs');
      
      console.log('Columns in AttendanceLogs:');
      Object.keys(columns).forEach(col => {
        const info = columns[col];
        console.log(`  • ${col}: ${info.type}${info.allowNull ? ' (nullable)' : ''}`);
      });

      if (columns.type) {
        console.log(`\n✅ Type column exists: ${columns.type.type}`);
        if (columns.type.type && columns.type.type.includes('ABSENT')) {
          console.log('   ✅ ABSENT value is in ENUM');
        } else if (columns.type.type && columns.type.type.includes('IN')) {
          console.log('   ⚠️  ABSENT value NOT in ENUM - need to run migration');
        }
      }

      if (columns.isAbsent) {
        console.log('✅ isAbsent column exists');
      } else {
        console.log('⚠️  isAbsent column NOT found - need to run migration');
      }
    } catch (e) {
      console.log('❌ Schema check failed:', e.message);
    }

    // 3. Check enum type values
    console.log('\n3️⃣  ENUM TYPE VALUES');
    console.log('-'.repeat(60));
    try {
      const result = await sequelize.query(`
        SELECT enum_range(NULL::enum_AttendanceLogs_type) as types
      `);
      if (result[0]?.length > 0) {
        console.log('Current ENUM values:', result[0][0].types);
      }
    } catch (e) {
      console.log('⚠️  Could not fetch enum values (may not exist yet):', e.message);
    }

    // 4. Check total attendance logs
    console.log('\n4️⃣  ATTENDANCE LOGS COUNT');
    console.log('-'.repeat(60));
    try {
      const total = await AttendanceLog.count();
      console.log(`Total attendance logs in database: ${total}`);
    } catch (e) {
      console.log('❌ Failed to count logs:', e.message);
    }

    // 5. Count logs by type
    console.log('\n5️⃣  LOGS BY TYPE');
    console.log('-'.repeat(60));
    try {
      const countByType = await sequelize.query(`
        SELECT type, COUNT(*) as count 
        FROM attendance_logs 
        GROUP BY type 
        ORDER BY count DESC
      `, { raw: true });

      console.log('Type distribution:');
      if (countByType[0]?.length > 0) {
        countByType[0].forEach(row => {
          console.log(`  ${row.type}: ${row.count} records`);
        });
      } else {
        console.log('  (no logs found)');
      }
    } catch (e) {
      console.log('⚠️  Could not fetch type distribution:', e.message);
    }

    // 6. Check today's logs
    console.log('\n6️⃣  TODAY\'S LOGS (2026-05-18)');
    console.log('-'.repeat(60));
    try {
      const todayStart = new Date('2026-05-18');
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date('2026-05-18');
      todayEnd.setHours(23, 59, 59, 999);

      const todayLogs = await AttendanceLog.findAll({
        where: {
          timestamp: {
            [sequelize.Op.between]: [todayStart, todayEnd]
          }
        },
        include: [{
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'employeeCode']
        }],
        order: [['timestamp', 'ASC']],
        raw: false
      });

      console.log(`Found ${todayLogs.length} logs for today:`);
      if (todayLogs.length > 0) {
        todayLogs.forEach((log, idx) => {
          const empName = log.User?.name || 'Unknown';
          const time = new Date(log.timestamp).toLocaleTimeString('vi-VN');
          console.log(`  ${idx + 1}. ${empName} - ${time} - Type: ${log.type}`);
        });
      }
    } catch (e) {
      console.log('❌ Failed to fetch today\'s logs:', e.message);
    }

    // 7. Check latest logs
    console.log('\n7️⃣  LATEST 5 LOGS (any date)');
    console.log('-'.repeat(60));
    try {
      const latestLogs = await AttendanceLog.findAll({
        order: [['timestamp', 'DESC']],
        limit: 5,
        include: [{
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'employeeCode']
        }]
      });

      if (latestLogs.length > 0) {
        latestLogs.forEach((log, idx) => {
          const empName = log.User?.name || 'Unknown';
          const time = new Date(log.timestamp).toLocaleString('vi-VN');
          const flags = [];
          if (log.isLate) flags.push('LATE');
          if (log.isEarlyLeave) flags.push('EARLY');
          if (log.isAbsent) flags.push('ABSENT');
          if (log.isOvertime) flags.push('OT');
          const flagStr = flags.length > 0 ? ` [${flags.join(',')}]` : '';
          console.log(`  ${idx + 1}. ${empName} - ${time} - ${log.type}${flagStr}`);
        });
      }
    } catch (e) {
      console.log('❌ Failed to fetch latest logs:', e.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 MIGRATION STATUS:');
    console.log('-'.repeat(60));
    console.log('If ENUM doesn\'t include ABSENT, run:');
    console.log('  npm run db:migrate:attendance-types');
    console.log('  OR');
    console.log('  node migrate-attendance-types.js\n');
    console.log('If isAbsent column is missing, run:');
    console.log('  npm run db:migrate:is-absent');
    console.log('  OR');
    console.log('  node migrate-add-is-absent.js\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Debug script failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

debugDatabase();
