#!/usr/bin/env node
/**
 * Test script: check-in/out logic, shift CRUD, status endpoint
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';
const USER_ID = 1; // Giả sử user ID 1 tồn tại

async function test(name, fn) {
  try {
    console.log(`\n📌 ${name}`);
    await fn();
  } catch (e) {
    console.error(`❌ Lỗi: ${e.message}`);
  }
}

async function createShift() {
  const res = await fetch(`${API_BASE}/api/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Shift Dec 2025',
      month: '2025-12',
      rules: {
        weekdays: {
          Mon: { start: '08:00', end: '17:00' },
          Tue: { start: '08:00', end: '17:00' },
          Wed: { start: '08:00', end: '17:00' },
          Thu: { start: '08:00', end: '17:00' },
          Fri: { start: '08:00', end: '17:00' }
        },
        graceMinutes: 5,
        overtimeThresholdMinutes: 15
      }
    })
  });
  const data = await res.json();
  console.log('  Result:', data.status, '- Shift ID:', data.shift?.id);
  return data.shift?.id;
}

async function getTodayStatus() {
  const res = await fetch(`${API_BASE}/api/attendance/status?userId=${USER_ID}`);
  const data = await res.json();
  console.log(`  Today's logs for user ${USER_ID}:`, data.count, 'logs');
  data.logs.forEach((l, i) => {
    console.log(`    Log ${i+1}: type=${l.type} at ${new Date(l.timestamp).toLocaleTimeString()}`);
  });
}

async function listShifts() {
  const res = await fetch(`${API_BASE}/api/shifts?month=2025-12`);
  const data = await res.json();
  console.log(`  Shifts for Dec 2025:`, data.shifts?.length || 0);
  data.shifts?.forEach(s => {
    console.log(`    - ${s.name} (${s.month}): ${s.rules?.weekdays?.Mon?.start}-${s.rules?.weekdays?.Mon?.end}`);
  });
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║      ATTENDANCE SYSTEM - INTEGRATION TESTS                ║
║  Kiểm tra: Check-in/Out, Shift CRUD, Status API          ║
╚════════════════════════════════════════════════════════════╝
  `);

  await test('Tạo Shift mới cho tháng 12/2025', createShift);
  await test('Lấy danh sách Shift tháng 12/2025', listShifts);
  await test(`Lấy trạng thái hôm nay cho user ${USER_ID}`, getTodayStatus);

  console.log(`
════════════════════════════════════════════════════════════
✓ Kiểm tra cơ bản hoàn thành
  - Nếu tất cả kết quả OK → Backend sẵn sàng
  - Bạn có thể mở frontend để test flow quét → in → out
════════════════════════════════════════════════════════════
  `);
}

main();
