import sequelize from './src/db/sequelize.js';
import ShiftSetting from './src/models/pg/ShiftSetting.js';
import SalaryRule from './src/models/pg/SalaryRule.js';
import AttendanceLog from './src/models/pg/AttendanceLog.js';
import User from './src/models/pg/User.js';

(async () => {
  try {
    await sequelize.authenticate();
    
    console.log('📊 === SHIFT SETTINGS ===');
    const shifts = await ShiftSetting.findAll();
    if (shifts.length === 0) {
      console.log('❌ NO SHIFT SETTINGS FOUND!');
    } else {
      shifts.forEach(s => console.log(`  Active: ${s.active}, Start: ${s.startTime}, End: ${s.endTime}`));
    }
    
    console.log('\n📊 === SALARY RULES ===');
    const rules = await SalaryRule.findAll();
    console.log(`Total rules: ${rules.length}`);
    console.log(`Active rules: ${rules.filter(r => r.isActive).length}`);
    rules.slice(0, 3).forEach(r => console.log(`  ${r.name} (${r.triggerType}) - Active: ${r.isActive}`));
    
    console.log('\n📊 === ATTENDANCE LOGS ===');
    const totalLogs = await AttendanceLog.count();
    console.log(`Total attendance logs: ${totalLogs}`);
    
    console.log('\n📊 === EMPLOYEE DATA ===');
    const employees = await User.findAll({ where: { role: 'employee' }, limit: 3 });
    for (const emp of employees) {
      const empLogs = await AttendanceLog.count({ where: { userId: emp.id } });
      console.log(`  ${emp.name}: ${empLogs} logs, baseSalary: ${emp.baseSalary}`);
    }
    
    await sequelize.close();
    process.exit(0);
  } catch(e) { 
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
