import sequelize from './src/db/sequelize.js';
import User from './src/models/pg/User.js';
import bcrypt from 'bcryptjs';

async function resetAdminAccount() {
  try {
    console.log('🚀 Resetting admin account...');

    // Connect to DB
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');

    // Admin credentials
    const adminEmail = 'admin@company.com';
    const adminPassword = 'Admin@12345';
    const adminName = 'Admin';

    // Check if admin exists
    let admin = await User.findOne({ where: { email: adminEmail } });

    if (admin) {
      // Update existing admin
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await admin.update({
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      console.log(`✅ Admin account updated: ${adminEmail}`);
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        employeeCode: 'ADMIN001',
        role: 'admin',
        isActive: true
      });
      console.log(`✅ Admin account created: ${adminEmail}`);
    }

    console.log('\n📋 Admin Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: admin`);
    console.log(`   ID: ${admin.id}`);
    console.log('\n💡 Tip: Thay đổi password sau khi đăng nhập lần đầu!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetAdminAccount();
