#!/usr/bin/env node
/**
 * Test script để kiểm tra matching logic
 * Sử dụng: node test-matching-debug.js
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test data
const testDataPath = path.join(__dirname, 'test-match.js');

console.log(`
╔════════════════════════════════════════════════════════════╗
║         FACE MATCHING DEBUG TEST                          ║
║  Kiểm tra xem matching logic có hoạt động đúng không      ║
╚════════════════════════════════════════════════════════════╝
`);

// Test 1: Kiểm tra số lượng profiles
console.log('\n[TEST 1] Kiểm tra số lượng Face Profiles trong DB...');
try {
  const response = await fetch('http://localhost:5000/api/attendance/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      descriptor: new Array(128).fill(0.5) // Random descriptor
    })
  });
  
  const data = await response.json();
  console.log(`✅ Tổng profiles: ${data.allProfiles}`);
  console.log(`   Closest match: ${data.topMatch?.name || 'N/A'} (distance: ${data.topMatch?.distance?.toFixed(3) || 'N/A'})`);
  console.log(`   Matched: ${data.matched}`);
  console.log(`   Detected Name: ${data.detectedName}`);
  
  if (data.matched === false && data.detectedName !== 'Unknown') {
    console.error('\n❌ LỖI: Khi matched=false, detectedName phải là "Unknown" chứ không phải:', data.detectedName);
  }
} catch (error) {
  console.error('❌ Lỗi kết nối:', error.message);
}

// Test 2: Tạo descriptor test từ một profile thực
console.log('\n[TEST 2] Tạo test descriptors từ real profiles...');
try {
  // Giả sử chúng ta có profile user ID 1
  const response = await fetch('http://localhost:5000/api/attendance/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      descriptor: new Array(128).fill(0.3) // Random khác
    })
  });
  
  const data = await response.json();
  console.log(`✅ Test random descriptor 2:`);
  console.log(`   Distance: ${data.distance?.toFixed(3)}`);
  console.log(`   Threshold: ${data.threshold}`);
  console.log(`   Matched: ${data.matched}`);
  console.log(`   Detected Name: ${data.detectedName}`);
  
  if (data.matched === false && data.detectedName !== 'Unknown') {
    console.error('\n❌ LỖI: Khi matched=false, detectedName phải là "Unknown" chứ không phải:', data.detectedName);
  }
} catch (error) {
  console.error('❌ Lỗi kết nối:', error.message);
}

// Test 3: Kiểm tra threshold logic
console.log('\n[TEST 3] Kiểm tra Threshold Logic...');
console.log(`
Threshold Logic:
- Nếu distance <= threshold → matched = true ✅
- Nếu distance > threshold → matched = false ❌

Các test trên sử dụng random descriptors nên distance sẽ rất cao (> threshold).
Nếu vẫn thấy matched = true → BUG!
`);

console.log('\n[KẾT LUẬN]');
console.log(`
Nếu tất cả các test đều:
✅ matched = false khi distance > threshold
✅ detectedName = "Unknown" khi matched = false
✅ Không hiển thị tên nhân viên khi matched = false

Thì backend ĐÚNG, vấn đề là:
1. Frontend cache → Xóa cache browser
2. Frontend logic → Kiểm tra AttendanceScanner.jsx
3. Threshold quá cao → Hạ threshold
4. Database issue → Check db profiles

Chi tiết xem DEBUG_GUIDE.md
`);
