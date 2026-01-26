import sequelize from './src/db/sequelize.js';
import ShiftSetting from './src/models/pg/ShiftSetting.js';

async function createShiftSetting() {
  try {
    console.log('Creating shift setting...');
    
    // Check if active shift setting exists
    const existingShift = await ShiftSetting.findOne({ where: { active: true } });
    if (existingShift) {
      console.log('Active shift setting already exists');
      process.exit(0);
    }

    // Create default shift setting
    const shift = await ShiftSetting.create({
      name: 'Default 8-Hour Shift',
      startTime: '08:00:00',
      endTime: '17:00:00',
      breakDuration: 60, // 1 hour break
      workingHoursPerDay: 8,
      active: true,
      description: 'Standard 8-hour working day with 1-hour break'
    });

    console.log('✅ Shift setting created:', shift.toJSON());
    process.exit(0);
  } catch (err) {
    console.error('Error creating shift setting:', err);
    process.exit(1);
  }
}

createShiftSetting();
