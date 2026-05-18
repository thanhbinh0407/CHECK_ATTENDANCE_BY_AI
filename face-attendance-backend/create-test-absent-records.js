#!/usr/bin/env node
/**
 * Create test ABSENT attendance records
 * For testing the ABSENT type functionality
 */

import sequelize from './src/db/sequelize.js';
import { AttendanceLog, User } from './src/models/pg/index.js';
import { Op } from 'sequelize';

async function createTestAbsentRecords() {
  try {
    console.log('ðŸ” Creating test ABSENT records...\n');

    // Get first employee
    const employee = await User.findOne({
      where: { isActive: true },
      attributes: ['id', 'name', 'employeeCode']
    });

    if (!employee) {
      console.log('âŒ No active employee found');
      process.exit(1);
    }

    console.log(`ðŸ“ Using employee: ${employee.name} (${employee.employeeCode})\n`);

    // Get today's date
    const today = new Date('2026-05-18');
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    // Delete existing test records for this employee today
    await AttendanceLog.destroy({
      where: {
        userId: employee.id,
        timestamp: {
          [Op.gte]: todayStart
        }
      }
    });
    console.log('ðŸ—‘ï¸  Cleared existing records for today');

    // Test 1: ABSENT IN (check-in at 08:30, scheduled 08:00, threshold 15 min)
    // So 30 min > 15 min = ABSENT
    const absentInTime = new Date(today);
    absentInTime.setHours(8, 30, 0, 0); // 30 min late

    const log1 = await AttendanceLog.create({
      userId: employee.id,
      detectedName: employee.name,
      timestamp: absentInTime,
      confidence: 0.95,
      deviceId: 'test-device-01',
      matchDistance: 0.12,
      type: 'ABSENT',
      note: 'Test ABSENT check-in (30 min late)',
      isAbsent: true,
      isLate: false,
      isEarlyLeave: false,
      isOvertime: false,
      shiftId: null
    });
    console.log(`âœ… Created ABSENT IN record at ${absentInTime.toLocaleTimeString('vi-VN')}`);
    console.log(`   ID: ${log1.id}`);

    // Test 2: LATE_IN (check-in at 08:08, scheduled 08:00, 8 min late < 15 threshold)
    const lateInTime = new Date(today);
    lateInTime.setHours(8, 8, 0, 0);

    const log2 = await AttendanceLog.create({
      userId: employee.id,
      detectedName: employee.name,
      timestamp: lateInTime,
      confidence: 0.96,
      deviceId: 'test-device-01',
      matchDistance: 0.11,
      type: 'LATE_IN',
      note: 'Test LATE_IN check-in (8 min late)',
      isAbsent: false,
      isLate: true,
      isEarlyLeave: false,
      isOvertime: false,
      shiftId: null
    });
    console.log(`âœ… Created LATE_IN record at ${lateInTime.toLocaleTimeString('vi-VN')}`);
    console.log(`   ID: ${log2.id}`);

    // Test 3: Normal IN
    const normalInTime = new Date(today);
    normalInTime.setHours(8, 5, 0, 0);

    const log3 = await AttendanceLog.create({
      userId: employee.id,
      detectedName: employee.name,
      timestamp: normalInTime,
      confidence: 0.99,
      deviceId: 'test-device-01',
      matchDistance: 0.08,
      type: 'IN',
      note: 'Test normal check-in',
      isAbsent: false,
      isLate: false,
      isEarlyLeave: false,
      isOvertime: false,
      shiftId: null
    });
    console.log(`âœ… Created IN record at ${normalInTime.toLocaleTimeString('vi-VN')}`);
    console.log(`   ID: ${log3.id}`);

    // Fetch and display
    console.log('\nðŸ“Š Verification - All test records created:');
    const testLogs = await AttendanceLog.findAll({
      where: {
        userId: employee.id,
        timestamp: { [Op.gte]: todayStart }
      },
      order: [['timestamp', 'ASC']]
    });

    testLogs.forEach((log, idx) => {
      const time = new Date(log.timestamp).toLocaleTimeString('vi-VN');
      const flags = [];
      if (log.isAbsent) flags.push('ABSENT');
      if (log.isLate) flags.push('LATE');
      if (log.isEarlyLeave) flags.push('EARLY');
      if (log.isOvertime) flags.push('OT');
      const flagStr = flags.length > 0 ? ` [${flags.join(',')}]` : '';
      console.log(`  ${idx + 1}. ${time} - Type: ${log.type}${flagStr}`);
    });

    console.log('\nâœ… Test records created successfully!');
    console.log('\nðŸ“± Next steps:');
    console.log('1. Open Attendance Logs in accountant portal (localhost:5175)');
    console.log('2. Click "Today" button OR set date range: 18/05/2026 to 18/05/2026');
    console.log('3. Filter by Type = "Absent" - should see the ABSENT record');
    console.log('4. Filter by Type = "Late Check-in" - should see the LATE_IN record');
    console.log('5. Check colors: ABSENT = red badge, LATE = orange badge\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('âŒ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

createTestAbsentRecords();


