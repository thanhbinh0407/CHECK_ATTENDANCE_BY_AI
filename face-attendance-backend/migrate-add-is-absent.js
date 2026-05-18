#!/usr/bin/env node
/**
 * Migration script to add isAbsent column to AttendanceLog
 * Run: node migrate-add-is-absent.js
 */

import sequelize from './src/db/sequelize.js';
import { DataTypes } from 'sequelize';

async function runMigration() {
  try {
    console.log('🔄 Starting migration to add isAbsent column...\n');

    const queryInterface = sequelize.getQueryInterface();

    // Check if column already exists
    const columns = await queryInterface.describeTable('attendance_logs');
    
    if (columns.isAbsent) {
      console.log('✅ Column isAbsent already exists, skipping creation');
    } else {
      console.log('📝 Adding isAbsent column to attendance_logs table...');
      
      await queryInterface.addColumn('attendance_logs', 'isAbsent', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });

      console.log('✅ Successfully added isAbsent column');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 AttendanceLogs table now includes: isLate, isEarlyLeave, isAbsent, isOvertime');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

runMigration();
