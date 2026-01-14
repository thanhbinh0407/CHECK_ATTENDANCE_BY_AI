#!/usr/bin/env node
/**
 * Debug: Kiểm tra embeddings được lưu như thế nào trong DB
 */

import { FaceProfile, User } from "./src/models/pg/index.js";

console.log(`
╔════════════════════════════════════════════════════════════╗
║     DEBUG: Kiểm Tra Embeddings Trong Database             ║
╚════════════════════════════════════════════════════════════╝
`);

try {
  const profiles = await FaceProfile.findAll({
    include: [{ model: User, attributes: ['id', 'name'] }],
    limit: 5
  });

  if (profiles.length === 0) {
    console.log('❌ Không có profiles trong database');
    process.exit(0);
  }

  profiles.forEach((p, idx) => {
    console.log(`\n[Profile ${idx + 1}] User: ${p.User?.name || 'Unknown'}`);
    console.log(`  ID: ${p.id}, User ID: ${p.userId}`);
    console.log(`  Embeddings Type: ${typeof p.embeddings}`);
    console.log(`  Is Array: ${Array.isArray(p.embeddings)}`);
    
    if (Array.isArray(p.embeddings)) {
      console.log(`  Length: ${p.embeddings.length}`);
      console.log(`  First 5 values: [${p.embeddings.slice(0, 5).map(v => v.toFixed(3)).join(', ')}]`);
      console.log(`  All numbers: ${p.embeddings.every(v => typeof v === 'number') ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`  🚨 NOT AN ARRAY! Structure: ${JSON.stringify(p.embeddings).substring(0, 100)}...`);
    }
  });

  console.log(`\n[SUMMARY]`);
  const allValid = profiles.every(p => Array.isArray(p.embeddings) && p.embeddings.length === 128);
  if (allValid) {
    console.log('✅ Tất cả embeddings đều hợp lệ (arrays, length=128)');
  } else {
    console.log('❌ CÓ VẤN ĐỀ VỚI EMBEDDINGS!');
    console.log('   Kiểm tra xem embeddings có bị lưu sai format hay không');
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  process.exit(1);
}
