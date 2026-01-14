import sequelize from './src/db/sequelize.js';
import User from './src/models/pg/User.js';
import bcrypt from 'bcryptjs';

const ACCOUNTANT_EMAIL = 'accountant@company.com';
const ACCOUNTANT_PASSWORD = 'Accountant@12345';
const ACCOUNTANT_NAME = 'Kế toán viên';

async function createAccountant() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Check if accountant already exists
    const existing = await User.findOne({ where: { email: ACCOUNTANT_EMAIL } });
    if (existing) {
      if (existing.role === 'accountant') {
        console.log('ℹ️  Accountant account already exists');
        // Reset password
        const hashedPassword = await bcrypt.hash(ACCOUNTANT_PASSWORD, 10);
        await existing.update({ password: hashedPassword });
        console.log(`✅ Accountant password reset: ${ACCOUNTANT_EMAIL}`);
        console.log(`   Password: ${ACCOUNTANT_PASSWORD}`);
        await sequelize.close();
        return;
      } else {
        console.log('⚠️  Email exists but with different role. Updating to accountant...');
        const hashedPassword = await bcrypt.hash(ACCOUNTANT_PASSWORD, 10);
        await existing.update({ 
          role: 'accountant',
          password: hashedPassword,
          name: ACCOUNTANT_NAME
        });
        console.log(`✅ Accountant account updated: ${ACCOUNTANT_EMAIL}`);
        console.log(`   Password: ${ACCOUNTANT_PASSWORD}`);
        await sequelize.close();
        return;
      }
    }

    // Create new accountant
    const hashedPassword = await bcrypt.hash(ACCOUNTANT_PASSWORD, 10);
    const accountant = await User.create({
      name: ACCOUNTANT_NAME,
      email: ACCOUNTANT_EMAIL,
      password: hashedPassword,
      role: 'accountant',
      employeeCode: 'ACC001',
      isActive: true
    });

    console.log('✅ Accountant account created successfully!');
    console.log(`   Email: ${ACCOUNTANT_EMAIL}`);
    console.log(`   Password: ${ACCOUNTANT_PASSWORD}`);
    console.log(`   Name: ${accountant.name}`);
    console.log(`   Role: ${accountant.role}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating accountant:', error);
    await sequelize.close();
    process.exit(1);
  }
}

createAccountant();

