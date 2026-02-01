import sequelize from './src/db/sequelize.js';
import User from './src/models/pg/User.js';
import Department from './src/models/pg/Department.js';
import JobTitle from './src/models/pg/JobTitle.js';
import SalaryGrade from './src/models/pg/SalaryGrade.js';
import Salary from './src/models/pg/Salary.js';
import SalaryRule from './src/models/pg/SalaryRule.js';
import AttendanceLog from './src/models/pg/AttendanceLog.js';
import LeaveRequest from './src/models/pg/LeaveRequest.js';
import Dependent from './src/models/pg/Dependent.js';
import Qualification from './src/models/pg/Qualification.js';
import ShiftSetting from './src/models/pg/ShiftSetting.js';
import bcrypt from 'bcryptjs';

const VN_FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Võ', 'Đặng', 'Bùi', 'Đỗ'];
const VN_LAST_NAMES = ['An', 'Anh', 'Bảo', 'Bình', 'Cường', 'Dũng', 'Đức', 'Giang', 'Hải', 'Hân', 'Hương', 'Khánh', 'Linh', 'Long', 'Minh', 'Nam', 'Nhân', 'Phương', 'Quân', 'Quý', 'Rồng', 'Sinh', 'Tâm', 'Tú', 'Tùng', 'Tường', 'Uyên', 'Văn', 'Vân', 'Vinh', 'Xuân', 'Yến', 'Yên'];

function randomName(isMale = true) {
  const first = VN_FIRST_NAMES[Math.floor(Math.random() * VN_FIRST_NAMES.length)];
  const last = VN_LAST_NAMES[Math.floor(Math.random() * VN_LAST_NAMES.length)];
  return `${first} ${last}`;
}

function randomEmail(index) {
  return `emp${index}@company.com`;
}

function randomPhone() {
  return `09${Math.floor(Math.random() * 900000000).toString().padStart(8, '0')}`;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedDB() {
  try {
    console.log('🔄 Syncing database...');
    await sequelize.sync({ force: true });
    console.log('✅ Database synced');

    // Shift Settings
    await ShiftSetting.create({
      name: 'Ca sáng',
      startTime: '08:00',
      endTime: '17:00',
      overtimeThresholdMinutes: 15,
      active: true
    });
    console.log('✅ Created shift settings');

    // Departments
    const depts = await Department.bulkCreate([
      { code: 'KT', name: 'Kỹ thuật' },
      { code: 'KB', name: 'Kinh doanh' },
      { code: 'NS', name: 'Nhân sự' },
      { code: 'ACC', name: 'Kế toán' },
      { code: 'HC', name: 'Hành chính' }
    ]);
    console.log(`✅ Created ${depts.length} departments`);

    // Job Titles
    const titles = await JobTitle.bulkCreate([
      { code: 'TP', name: 'Trưởng phòng' },
      { code: 'PTP', name: 'Phó trưởng phòng' },
      { code: 'NVC', name: 'Nhân viên cấp cao' },
      { code: 'NV', name: 'Nhân viên' },
      { code: 'TTS', name: 'Thực tập sinh' }
    ]);
    console.log(`✅ Created ${titles.length} job titles`);

    // Salary Grades
    const grades = await SalaryGrade.bulkCreate([
      { code: 'A', name: 'Bậc A', level: 1, baseSalary: 25000000 },
      { code: 'B', name: 'Bậc B', level: 2, baseSalary: 20000000 },
      { code: 'C', name: 'Bậc C', level: 3, baseSalary: 15000000 },
      { code: 'D', name: 'Bậc D', level: 4, baseSalary: 12000000 },
      { code: 'E', name: 'Bậc E', level: 5, baseSalary: 10000000 },
      { code: 'F', name: 'Bậc F', level: 6, baseSalary: 8000000 }
    ]);
    console.log(`✅ Created ${grades.length} salary grades`);

    // Salary Rules
    const rules = await SalaryRule.bulkCreate([
      { name: 'Thưởng điểm danh', type: 'bonus', triggerType: 'full_attendance', amount: 3, amountType: 'percentage' },
      { name: 'Thưởng tăng ca', type: 'bonus', triggerType: 'overtime', amount: 500000, amountType: 'fixed' },
      { name: 'Thưởng hiệu suất', type: 'bonus', triggerType: 'custom', amount: 5, amountType: 'percentage' },
      { name: 'Thưởng thâm niên', type: 'bonus', triggerType: 'custom', amount: 2, amountType: 'percentage' },
      { name: 'Phụ cấp kỹ thuật', type: 'bonus', triggerType: 'custom', amount: 1000000, amountType: 'fixed' },
      { name: 'Phụ cấp quản lý', type: 'bonus', triggerType: 'custom', amount: 10, amountType: 'percentage' },
      { name: 'Phạt đi muộn', type: 'deduction', triggerType: 'late', amount: 500000, amountType: 'fixed' },
      { name: 'Phạt vắng mặt', type: 'deduction', triggerType: 'absent', amount: 1000000, amountType: 'fixed' },
      { name: 'Phạt về sớm', type: 'deduction', triggerType: 'early_leave', amount: 300000, amountType: 'fixed' },
      { name: 'BHXH', type: 'deduction', triggerType: 'custom', amount: 8, amountType: 'percentage' },
      { name: 'BHYT', type: 'deduction', triggerType: 'custom', amount: 1.5, amountType: 'percentage' },
      { name: 'Thuế TNCN', type: 'deduction', triggerType: 'custom', amount: 5, amountType: 'percentage' },
      { name: 'Quỹ Công Đoàn', type: 'deduction', triggerType: 'custom', amount: 2, amountType: 'percentage' },
      { name: 'Phí Đồng Phục', type: 'deduction', triggerType: 'custom', amount: 200000, amountType: 'fixed' }
    ]);
    console.log(`✅ Created ${rules.length} salary rules`);

    // Users (Admin + Accountant + Employees)
    const hash = await bcrypt.hash('Password123!', 10);
    const users = [];

    // Admin
    users.push(await User.create({
      employeeCode: 'ADM001',
      name: 'Trần Văn Admin',
      email: 'admin@company.com',
      password: await bcrypt.hash('Admin@12345', 10),
      phone: '0900000001',
      gender: 'male',
      role: 'admin',
      isActive: true
    }));

    // Accountant
    users.push(await User.create({
      employeeCode: 'ACC001',
      name: 'Nguyễn Thị Kế toán',
      email: 'accountant@company.com',
      password: await bcrypt.hash('Accountant@12345', 10),
      phone: '0900000002',
      gender: 'female',
      role: 'accountant',
      isActive: true
    }));

    // Employees (35 employees)
    const now = new Date('2026-01-26');
    const twoYearsAgo = new Date('2024-01-26');

    for (let i = 1; i <= 35; i++) {
      const isMale = Math.random() > 0.4;
      const name = randomName(isMale);
      const startDate = randomDate(twoYearsAgo, now);
      const dob = randomDate(new Date('1980-01-01'), new Date('2005-12-31'));

      users.push(await User.create({
        employeeCode: `NV${String(i).padStart(4, '0')}`,
        name,
        email: randomEmail(i),
        password: await bcrypt.hash('Password123!', 10), // Ensure password is hashed
        phone: randomPhone(),
        gender: isMale ? 'male' : 'female',
        dateOfBirth: dob,
        departmentId: depts[Math.floor(Math.random() * depts.length)].id,
        jobTitleId: titles[Math.floor(Math.random() * titles.length)].id,
        salaryGradeId: grades[Math.floor(Math.random() * grades.length)].id,
        startDate,
        baseSalary: grades[Math.floor(Math.random() * grades.length)].baseSalary,
        role: 'employee',
        isActive: true
      }));
    }
    console.log(`✅ Created ${users.length} users`);

    // Dependents
    let depCount = 0;
    const relationships = ['spouse', 'child', 'parent', 'grandparent', 'sibling', 'other'];
    for (const emp of users.slice(2)) { // Skip admin and accountant
      const numDeps = Math.floor(Math.random() * 4);
      for (let i = 0; i < numDeps; i++) {
        await Dependent.create({
          fullName: randomName(),
          relationship: relationships[Math.floor(Math.random() * relationships.length)],
          dateOfBirth: randomDate(new Date('1960-01-01'), new Date('2020-12-31')),
          gender: Math.random() > 0.5 ? 'male' : 'female',
          userId: emp.id
        });
        depCount++;
      }
    }
    console.log(`✅ Created ${depCount} dependents`);

    // Qualifications
    let qualCount = 0;
    const qualTypes = ['degree', 'certificate', 'license', 'training'];
    const qualNames = {
      'degree': ['Thạc sỹ Quản lý', 'Cử nhân Công nghệ', 'Cử nhân Kinh tế'],
      'certificate': ['TOEIC 900', 'PMP', 'SAP'],
      'license': ['Lái xe B1', 'An toàn lao động', 'ISO 9001'],
      'training': ['Excel', 'Leadership', 'Agile']
    };

    for (const emp of users.slice(2)) {
      const numQual = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numQual; i++) {
        const type = qualTypes[Math.floor(Math.random() * qualTypes.length)];
        await Qualification.create({
          name: qualNames[type][Math.floor(Math.random() * qualNames[type].length)],
          type,
          issuedBy: 'Company',
          issuedDate: randomDate(twoYearsAgo, now),
          userId: emp.id
        });
        qualCount++;
      }
    }
    console.log(`✅ Created ${qualCount} qualifications`);

    // Attendance Logs (1-2 years)
    let attCount = 0;
    for (const emp of users.slice(2)) {
      const startDate = emp.startDate || twoYearsAgo;
      let current = new Date(startDate);
      while (current <= now) {
        if (current.getDay() !== 0 && current.getDay() !== 6) {
          if (Math.random() > 0.15) {
            const hour = 7 + Math.floor(Math.random() * 3);
            const min = Math.floor(Math.random() * 60);
            const isLate = hour > 8;
            await AttendanceLog.create({
              userId: emp.id,
              detectedName: emp.name,
              type: 'IN',
              isLate,
              timestamp: new Date(current.getFullYear(), current.getMonth(), current.getDate(), hour, min)
            });
            const outHour = 17 + Math.floor(Math.random() * 2);
            const outMin = Math.floor(Math.random() * 60);
            await AttendanceLog.create({
              userId: emp.id,
              detectedName: emp.name,
              type: 'OUT',
              timestamp: new Date(current.getFullYear(), current.getMonth(), current.getDate(), outHour, outMin)
            });
          }
          attCount++;
        }
        current.setDate(current.getDate() + 1);
      }
    }
    console.log(`✅ Created ${attCount} attendance logs`);

    // Salary Records (24 months)
    let salCount = 0;
    for (const emp of users.slice(2)) {
      for (let month = 0; month < 24; month++) {
        const m = ((twoYearsAgo.getMonth() + month) % 12) + 1;  // Convert to 1-12
        const y = twoYearsAgo.getFullYear() + Math.floor((twoYearsAgo.getMonth() + month) / 12);
        const base = emp.baseSalary || 10000000;
        const bonus = Math.round(base * (Math.random() * 0.15));
        const deduct = Math.round(base * (Math.random() * 0.20));
        
        await Salary.create({
          userId: emp.id,
          month: m,
          year: y,
          baseSalary: base,
          bonus,
          deduction: deduct,
          finalSalary: base + bonus - deduct,
          status: Math.random() > 0.3 ? 'paid' : 'approved'
        });
        salCount++;
      }
    }
    console.log(`✅ Created ${salCount} salary records`);

    // Leave Requests
    let leaveCount = 0;
    const leaveTypes = ['paid', 'sick', 'unpaid'];
    for (const emp of users.slice(2)) {
      const numLeaves = Math.floor(Math.random() * 3);
      for (let i = 0; i < numLeaves; i++) {
        const start = randomDate(twoYearsAgo, now);
        const end = new Date(start);
        const daysCount = Math.floor(Math.random() * 10) + 1;
        end.setDate(end.getDate() + daysCount);

        await LeaveRequest.create({
          userId: emp.id,
          type: leaveTypes[Math.floor(Math.random() * leaveTypes.length)],
          startDate: start,
          endDate: end,
          days: daysCount,
          reason: 'Xin phép',
          status: ['approved', 'rejected', 'pending'][Math.floor(Math.random() * 3)]
        });
        leaveCount++;
      }
    }
    console.log(`✅ Created ${leaveCount} leave requests`);

    console.log(`\n✨ Seed completed!
📊 Summary:
  - Users: ${users.length} (35 employees + 1 admin + 1 accountant)
  - Departments: ${depts.length}
  - Job Titles: ${titles.length}
  - Salary Grades: ${grades.length}
  - Salary Rules: ${rules.length}
  - Dependents: ${depCount}
  - Qualifications: ${qualCount}
  - Attendance: ${attCount}
  - Salaries: ${salCount} (24 months)
  - Leaves: ${leaveCount}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.errors) console.error('Details:', err.errors);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

seedDB();
