#!/usr/bin/env node
/**
 * Test script to verify Attendance Logs fetching
 */

import { AttendanceLog, User } from './face-attendance-backend/src/models/pg/index.js';
import sequelize from './face-attendance-backend/src/db/sequelize.js';

async function testAttendanceLogs() {
  try {
    console.log('🔍 Testing Attendance Logs fetch...\n');

    // Test 1: Get today's attendance logs
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Testing today: ${todayStart.toISOString()} → ${todayEnd.toISOString()}\n`);

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
      order: [['timestamp', 'DESC']],
      limit: 10
    });

    console.log(`✅ Found ${todayLogs.length} attendance logs for today:\n`);
    todayLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.User?.name || 'Unknown'} (${log.User?.employeeCode || 'N/A'})`);
      console.log(`   Time: ${new Date(log.timestamp).toLocaleString('vi-VN')}`);
      console.log(`   Type: ${log.type}, IsLate: ${log.isLate}, IsOvertime: ${log.isOvertime}\n`);
    });

    // Test 2: Get logs from last 31 days
    console.log('\n📊 Testing last 31 days...\n');
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 31);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const monthLogs = await AttendanceLog.findAll({
      where: {
        timestamp: {
          [sequelize.Op.between]: [thirtyDaysAgo, todayEnd]
        }
      },
      order: [['timestamp', 'DESC']],
      limit: 5
    });

    console.log(`✅ Found ${monthLogs.length} attendance logs in last 31 days`);
    console.log(`Latest 5 records:\n`);
    monthLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.detectedName || 'Unknown'} - ${new Date(log.timestamp).toLocaleString('vi-VN')} (Type: ${log.type})`);
    });

    // Test 3: Get total count
    console.log('\n📈 Overall statistics:\n');
    const totalLogs = await AttendanceLog.count();
    console.log(`Total attendance logs in database: ${totalLogs}`);

    const countByType = await sequelize.query(`
      SELECT type, COUNT(*) as count 
      FROM attendance_logs 
      GROUP BY type 
      ORDER BY count DESC
    `, { raw: true });

    console.log('\nLogs by type:');
    countByType[0].forEach(row => {
      console.log(`  ${row.type}: ${row.count}`);
    });

    console.log('\n✅ Test completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testAttendanceLogs();
