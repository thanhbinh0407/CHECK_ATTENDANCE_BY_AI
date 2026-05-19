#!/usr/bin/env node
import sequelize from './src/db/sequelize.js';

async function verifySchema() {
  try {
    const result = await sequelize.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'attendance_logs' ORDER BY column_name
    `);
    
    console.log('✅ Attendance Logs Table Schema:');
    console.log('─'.repeat(50));
    result[0].forEach(col => {
      console.log(`  ${col.column_name.padEnd(20)} : ${col.data_type}`);
    });
    
    // Check for isAbsent column
    const hasIsAbsent = result[0].some(col => col.column_name === 'isAbsent');
    console.log('\n✅ isAbsent column exists:', hasIsAbsent);
    
    // Check enum type
    const enumResult = await sequelize.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_attendance_logs_type')
      ORDER BY enumlabel
    `);
    
    console.log('\n✅ Attendance Type ENUM values:');
    console.log('─'.repeat(50));
    enumResult[0].forEach(e => console.log(`  - ${e.enumlabel}`));
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

verifySchema();
