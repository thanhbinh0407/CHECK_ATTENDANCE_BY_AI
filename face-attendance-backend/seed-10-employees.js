import sequelize from './src/db/sequelize.js';
import { User, Salary, FaceProfile } from './src/models/pg/index.js';
import bcrypt from 'bcryptjs';

// Job titles and their data
const JOB_TITLES = [
  "Nhân viên CNTT",
  "Chuyên viên CNTT",
  "Chuyên viên chính",
  "Phó phòng CNTT",
  "Trưởng phòng CNTT",
  "Nhân viên",
  "Chuyên viên",
  "Phó phòng",
  "Trưởng phòng",
  "Phó giám đốc"
];

const EDUCATION_LEVELS = [
  "Trung cấp",
  "Cao đẳng",
  "Đại học",
  "Sau đại học (ThS/TS)"
];

const NAMES = [
  "Nguyễn Văn An",
  "Trần Thị Bình",
  "Lê Minh Cường",
  "Phạm Thị Dung",
  "Hoàng Văn Đức",
  "Vũ Thị Hương",
  "Đặng Văn Hùng",
  "Bùi Thị Lan",
  "Ngô Văn Nam",
  "Đỗ Thị Oanh"
];

async function seed20Employees() {
  try {
    console.log('🚀 Seeding 20 employees with 12 months salary data...');
    
    // Drop all existing data
    console.log('🗑️  Dropping all existing data...');
    await sequelize.sync({ force: true });
    console.log('✅ Database reset complete');

    // Create admin account
    const adminPassword = await bcrypt.hash('Admin@12345', 10);
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@company.com',
      employeeCode: 'ADMIN001',
      password: adminPassword,
      role: 'admin',
      isActive: true,
      jobTitle: 'Giám đốc',
      educationLevel: 'Sau đại học (ThS/TS)',
      certificates: [],
      dependents: 0,
      baseSalary: 1800000
    });
    console.log('✅ Admin account created');

    // Create accountant account
    const accountantPassword = await bcrypt.hash('Accountant@12345', 10);
    const accountant = await User.create({
      name: 'Kế toán viên',
      email: 'accountant@company.com',
      employeeCode: 'ACC001',
      password: accountantPassword,
      role: 'accountant',
      isActive: true,
      jobTitle: 'Kế toán trưởng',
      educationLevel: 'Đại học',
      certificates: [],
      dependents: 0,
      baseSalary: 1800000
    });
    console.log('✅ Accountant account created');

    // Create 20 employees
    const employees = [];
    const mockDescriptor = Array(128).fill(0).map(() => Math.random() - 0.5);

    const NAMES_EXTENDED = [
      ...NAMES,
      "Phan Văn Phong",
      "Lý Thị Quyên",
      "Võ Văn Rạng",
      "Đinh Thị Sương",
      "Bùi Văn Tâm",
      "Phạm Thị Uyên",
      "Nguyễn Văn Việt",
      "Trần Thị Xoan",
      "Lê Văn Yên",
      "Hoàng Thị Zin"
    ];

    for (let i = 0; i < 20; i++) {
      const jobTitle = JOB_TITLES[i % JOB_TITLES.length];
      const educationLevel = EDUCATION_LEVELS[Math.floor(Math.random() * EDUCATION_LEVELS.length)];
      const certificates = Math.random() > 0.7 ? ['CCASP'] : [];
      const dependents = Math.floor(Math.random() * 3); // 0-2 dependents
      const baseSalary = 1800000; // State-owned base salary

      const employee = await User.create({
        name: NAMES_EXTENDED[i],
        email: `employee${i + 1}@company.com`,
        employeeCode: `EMP${String(i + 1).padStart(3, '0')}`,
        password: await bcrypt.hash('Password123!', 10),
        role: 'employee',
        isActive: true,
        jobTitle,
        educationLevel,
        certificates,
        dependents,
        baseSalary
      });

      // Create face profile
      await FaceProfile.create({
        userId: employee.id,
        embeddings: mockDescriptor.map(() => Math.random() - 0.5), // Unique descriptor per employee
        imageUrl: `/images/employee${i + 1}.jpg`
      });

      employees.push(employee);
      console.log(`✅ Created employee ${i + 1}/20: ${employee.name} (${jobTitle})`);
    }

    // Create salary records for 12 months (Jan 2024 - Dec 2024)
    console.log('\n💰 Creating salary records for 12 months...');
    const currentYear = 2024;
    
    for (let month = 1; month <= 12; month++) {
      for (const employee of employees) {
        // Random bonus and deduction
        const bonus = Math.random() > 0.7 ? Math.floor(Math.random() * 2000000) : 0;
        const deduction = Math.random() > 0.8 ? Math.floor(Math.random() * 500000) : 0;

        await Salary.create({
          userId: employee.id,
          month,
          year: currentYear,
          baseSalary: employee.baseSalary,
          bonus,
          deduction,
          status: month <= new Date().getMonth() ? 'paid' : 'pending', // Past months are paid
          notes: `Lương tháng ${month}/${currentYear}`
        });
      }
      console.log(`✅ Created salaries for month ${month}/${currentYear}`);
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Admin: 1 account (admin@company.com / Admin@12345)`);
    console.log(`   - Accountant: 1 account (accountant@company.com / Accountant@12345)`);
    console.log(`   - Employees: 20 accounts`);
    console.log(`   - Salary records: ${20 * 12} records (12 months)`);
    console.log(`   - Face profiles: 20 profiles`);
    console.log('\n💡 All employee passwords: Password123!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed20Employees();

