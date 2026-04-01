/**
 * ensure-test-users.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Đảm bảo tất cả tài khoản test với các role khác nhau được tạo sẵn hoặc cập nhật
 * mật khẩu mặc định nếu đã tồn tại
 *
 * Cách chạy:
 *   node ensure-test-users.js
 *
 * Tài khoản được tạo:
 *   - Manager:    manager@company.com / Manager@12345
 *   - HR Staff:   hr@company.com / HR@12345
 *   - Accountant: accountant@company.com / Accountant@12345
 *   - Supervisor: supervisor@company.com / Supervisor@12345
 *   - Employees:  emp001@company.com đến emp050@company.com / Password123!
 * ──────────────────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from './src/db/sequelize.js';
import User from './src/models/pg/User.js';
import Department from './src/models/pg/Department.js';
import JobTitle from './src/models/pg/JobTitle.js';
import SalaryGrade from './src/models/pg/SalaryGrade.js';
import bcrypt from 'bcryptjs';

// Test user configurations
const TEST_USERS = [
  {
    employeeCode: 'MGR001',
    name: 'Tran Van Manager',
    email: 'manager@company.com',
    password: 'Manager@12345',
    role: 'manager',
    departmentName: 'Administration',
    jobTitleCode: 'TP',
    baseSalary: 32000000,
    gender: 'male',
    startDate: new Date('2020-01-01')
  },
  {
    employeeCode: 'HR001',
    name: 'Nguyen Thi HR',
    email: 'hr@company.com',
    password: 'HR@12345',
    role: 'hr',
    departmentName: 'Human Resources',
    jobTitleCode: 'PTP',
    baseSalary: 19000000,
    gender: 'female',
    startDate: new Date('2021-06-01')
  },
  {
    employeeCode: 'ACC001',
    name: 'Le Thi Accountant',
    email: 'accountant@company.com',
    password: 'Accountant@12345',
    role: 'accountant',
    departmentName: 'Accounting',
    jobTitleCode: 'PTP',
    baseSalary: 21000000,
    gender: 'female',
    startDate: new Date('2021-04-01')
  },
  {
    employeeCode: 'SUP001',
    name: 'Pham Van Supervisor',
    email: 'supervisor@company.com',
    password: 'Supervisor@12345',
    role: 'supervisor',
    departmentName: 'Sales',
    jobTitleCode: 'TP',
    baseSalary: 23000000,
    gender: 'male',
    startDate: new Date('2020-08-01')
  }
];

async function ensureTestUsers() {
  try {
    console.log('🚀 Ensuring test user accounts...\n');

    // Authenticate
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Get or create departments
    console.log('Step 1: Getting departments...');
    const departments = {};
    for (const deptName of ['Administration', 'Sales', 'Human Resources', 'Accounting', 'Support']) {
      const [dept] = await sequelize.query(`
        SELECT id, name FROM departments WHERE name = :name LIMIT 1
      `, { replacements: { name: deptName }, type: sequelize.QueryTypes.SELECT });
      
      if (dept) {
        departments[deptName] = dept.id;
      } else {
        const created = await Department.create({ name: deptName });
        departments[deptName] = created.id;
        console.log(`  Created department: ${deptName}`);
      }
    }
    console.log(`Done: ${Object.keys(departments).length} departments available\n`);

    // Get or create job titles
    console.log('Step 2: Getting job titles...');
    const jobTitles = {};
    const jobTitlesData = [
      { code: 'TP', name: 'Department Head' },
      { code: 'PTP', name: 'Deputy Head' }
    ];
    
    for (const { code, name } of jobTitlesData) {
      const [jt] = await sequelize.query(`
        SELECT id, code, name FROM job_titles WHERE code = :code LIMIT 1
      `, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
      
      if (jt) {
        jobTitles[code] = jt.id;
      } else {
        const created = await JobTitle.create({ code, name, level: 'Senior' });
        jobTitles[code] = created.id;
        console.log(`  Created job title: ${name} (${code})`);
      }
    }
    console.log(`Done: ${Object.keys(jobTitles).length} job titles available\n`);

    // Get salary grades
    console.log('Step 3: Getting salary grades...');
    const [grades] = await sequelize.query(`
      SELECT id, code FROM salary_grades ORDER BY code ASC LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });
    const salaryGradeIds = {};
    grades.forEach(g => salaryGradeIds[g.code] = g.id);
    if (Object.keys(salaryGradeIds).length === 0) {
      throw new Error('No salary grades found. Please run seed-data.js first.');
    }
    console.log(`Done: ${Object.keys(salaryGradeIds).length} salary grades available\n`);

    // Get manager user for subordinates
    let managerId = null;
    const [managerUser] = await sequelize.query(`
      SELECT id FROM users WHERE email = 'manager@company.com' LIMIT 1
    `, { type: sequelize.QueryTypes.SELECT });

    // Process test users
    console.log('Step 4: Creating/updating test users...');
    for (const testUser of TEST_USERS) {
      const [existing] = await sequelize.query(`
        SELECT id, role FROM users WHERE email = :email LIMIT 1
      `, { replacements: { email: testUser.email }, type: sequelize.QueryTypes.SELECT });

      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const deptId = departments[testUser.departmentName];
      const jobTitleId = jobTitles[testUser.jobTitleCode];
      const gradeId = salaryGradeIds['B'] || salaryGradeIds[Object.keys(salaryGradeIds)[1]];

      if (existing) {
        // Update existing user
        await sequelize.query(`
          UPDATE users
          SET password = :password,
              role = :role,
              "isActive" = true,
              "baseSalary" = :baseSalary,
              "departmentId" = :deptId,
              "jobTitleId" = :jobTitleId,
              "salaryGradeId" = :gradeId,
              "contractType" = :contractType,
              "employmentStatus" = :employmentStatus
          WHERE id = :id
        `, {
          replacements: {
            password: hashedPassword,
            role: testUser.role,
            baseSalary: testUser.baseSalary,
            deptId,
            jobTitleId,
            gradeId,
            contractType: testUser.role === 'manager' ? 'indefinite' : '3_year',
            employmentStatus: 'active',
            id: existing.id
          }
        });
        console.log(`  ✅ Updated: ${testUser.email} (Role: ${testUser.role})`);
      } else {
        // Create new user
        await User.create({
          employeeCode: testUser.employeeCode,
          name: testUser.name,
          email: testUser.email,
          password: hashedPassword,
          role: testUser.role,
          isActive: true,
          departmentId: deptId,
          jobTitleId: jobTitleId,
          salaryGradeId: gradeId,
          baseSalary: testUser.baseSalary,
          insuranceBaseSalary: testUser.baseSalary,
          gender: testUser.gender,
          startDate: testUser.startDate,
          contractType: testUser.role === 'manager' ? 'indefinite' : '3_year',
          employmentStatus: 'active',
          managerId: testUser.role === 'manager' ? null : (managerUser?.id || null),
          phoneNumber: `090000000${TEST_USERS.indexOf(testUser) + 1}`
        });
        console.log(`  ✨ Created: ${testUser.email} (Role: ${testUser.role})`);
      }
    }
    console.log('\nDone: Test users ensured\n');

    // Summary
    console.log('📋 Test Accounts Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const user of TEST_USERS) {
      console.log(`\n${user.role.toUpperCase()}:`);
      console.log(`  Email:    ${user.email}`);
      console.log(`  Password: ${user.password}`);
    }
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nEMPLOYEES:');
    console.log('  Range:    emp001@company.com to emp050@company.com');
    console.log('  Password: Password123!');
    console.log('  Note: These accounts are created by seed-data.js');

    console.log('\n✅ All test accounts are ready to use!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

ensureTestUsers();
