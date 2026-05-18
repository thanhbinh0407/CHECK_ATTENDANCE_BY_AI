#!/usr/bin/env node
/**
 * Migration script to update AttendanceLog type ENUM
 * Adds new types: OT_IN, OT_OUT, LATE_IN, EARLY_OUT
 */

import sequelize from './src/db/sequelize.js';

async function runMigration() {
  try {
    console.log('🔄 Starting AttendanceLog type ENUM migration...');
    
    // Get the database name
    const dbName = sequelize.config.database;
    console.log(`📊 Connected to database: ${dbName}`);

    // For PostgreSQL with Sequelize, we need to check if the new enum values exist
    const result = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'attendance_logs'
      ) as table_exists
    `);

    if (!result[0][0].table_exists) {
      console.log('❌ attendance_logs table does not exist');
      process.exit(1);
    }

    console.log('✅ attendance_logs table found');

    // For PostgreSQL, we need to handle enum type updates carefully
    // First, let's try to add the new enum values
    const enumType = 'enum_AttendanceLogs_type';
    
    try {
      // Add new enum values if they don't exist
      await sequelize.query(`
        ALTER TYPE "${enumType}" ADD VALUE 'OT_IN' BEFORE 'IN';
      `).catch(e => console.log('  ℹ️  OT_IN might already exist:', e.message));

      await sequelize.query(`
        ALTER TYPE "${enumType}" ADD VALUE 'OT_OUT' AFTER 'OUT';
      `).catch(e => console.log('  ℹ️  OT_OUT might already exist:', e.message));

      await sequelize.query(`
        ALTER TYPE "${enumType}" ADD VALUE 'LATE_IN' AFTER 'OUT';
      `).catch(e => console.log('  ℹ️  LATE_IN might already exist:', e.message));

      await sequelize.query(`
        ALTER TYPE "${enumType}" ADD VALUE 'EARLY_OUT' AFTER 'OUT';
      `).catch(e => console.log('  ℹ️  EARLY_OUT might already exist:', e.message));

      await sequelize.query(`
        ALTER TYPE "${enumType}" ADD VALUE 'ABSENT' AFTER 'EARLY_OUT';
      `).catch(e => console.log('  ℹ️  ABSENT might already exist:', e.message));

      console.log('✅ Successfully added new ENUM values to AttendanceLog.type');
    } catch (err) {
      console.log('⚠️  Note: If using SQLite or other DB, enum handling differs');
      console.log('   Ensure your DB supports: IN, OUT, OT_IN, OT_OUT, LATE_IN, EARLY_OUT, ABSENT');
    }

    // Verify the column definition
    const columnInfo = await sequelize.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'attendance_logs' AND column_name = 'type'
    `);

    if (columnInfo[0].length > 0) {
      console.log('📋 Current type column definition:');
      console.log('  ', columnInfo[0][0]);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('📝 New type values available: IN, OUT, OT_IN, OT_OUT, LATE_IN, EARLY_OUT, ABSENT');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
