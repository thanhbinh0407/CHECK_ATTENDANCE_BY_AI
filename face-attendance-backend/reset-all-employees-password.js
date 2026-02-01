import sequelize from './src/db/sequelize.js';
import User from './src/models/pg/User.js';
import bcrypt from 'bcryptjs';

async function resetAllEmployeesPassword() {
  try {
    console.log('🚀 Resetting passwords for all employees...\n');

    // Connect to DB
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected\n');

    // Default password for all employees
    const defaultPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Find all employees
    const employees = await User.findAll({
      where: { role: 'employee' }
    });

    if (employees.length === 0) {
      console.log('⚠️  No employees found in database.');
      process.exit(0);
    }

    console.log(`📋 Found ${employees.length} employees\n`);

    // Reset password for each employee
    let successCount = 0;
    let failCount = 0;

    for (const employee of employees) {
      try {
        await employee.update({ password: hashedPassword });
        console.log(`✅ Reset password for: ${employee.name} (${employee.email}) - ${employee.employeeCode}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to reset password for: ${employee.name} (${employee.email}) - ${error.message}`);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Total employees: ${employees.length}`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('='.repeat(60));
    console.log('\n🔑 Default password for all employees:');
    console.log(`   Password: ${defaultPassword}`);
    console.log('\n💡 Tip: Employees should change their password after first login!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

resetAllEmployeesPassword();

