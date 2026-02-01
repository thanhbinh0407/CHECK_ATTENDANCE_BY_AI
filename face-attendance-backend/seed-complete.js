import sequelize from './src/db/sequelize.js';
import { User, Salary, FaceProfile, ShiftSetting, AttendanceLog } from './src/models/pg/index.js';
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

const NAMES_EXTENDED = [
  "Nguyễn Văn An",
  "Trần Thị Bình",
  "Lê Minh Cường",
  "Phạm Thị Dung",
  "Hoàng Văn Đức",
  "Vũ Thị Hương",
  "Đặng Văn Hùng",
  "Bùi Thị Lan",
  "Ngô Văn Nam",
  "Đỗ Thị Oanh",
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

// Helper function to generate random time
function randomTime(baseHour, baseMinute, variationMinutes = 30) {
  const totalMinutes = baseHour * 60 + baseMinute + Math.floor(Math.random() * variationMinutes * 2) - variationMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Helper function to create date with time
function createDateTime(year, month, day, timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

async function seedComplete() {
  try {
    console.log('🚀 COMPLETE DATABASE RESET AND SEED');
    console.log('=====================================\n');
    
    // Step 1: Drop all existing data
    console.log('1️⃣  Dropping all existing data...');
    await sequelize.sync({ force: true });
    console.log('✅ Database reset complete\n');

    // Step 2: Create admin and accountant accounts
    console.log('2️⃣  Creating admin and accountant accounts...');
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
      baseSalary: 20000000
    });
    console.log('✅ Admin: admin@company.com / Admin@12345');

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
      baseSalary: 15000000
    });
    console.log('✅ Accountant: accountant@company.com / Accountant@12345\n');

    // Step 3: Create 20 employees with face profiles
    console.log('3️⃣  Creating 20 employees with face profiles...');
    const employees = [];
    const mockDescriptor = Array(128).fill(0).map(() => Math.random() - 0.5);

    for (let i = 0; i < 20; i++) {
      const jobTitle = JOB_TITLES[i % JOB_TITLES.length];
      const educationLevel = EDUCATION_LEVELS[Math.floor(Math.random() * EDUCATION_LEVELS.length)];
      const certificates = Math.random() > 0.7 ? ['CCASP'] : [];
      const dependents = Math.floor(Math.random() * 3); // 0-2 dependents
      
      // Calculate base salary based on job title and education
      let baseSalary = 5000000; // Base minimum
      if (jobTitle.includes('Giám đốc')) baseSalary = 20000000;
      else if (jobTitle.includes('Trưởng phòng')) baseSalary = 12000000;
      else if (jobTitle.includes('Phó')) baseSalary = 10000000;
      else if (jobTitle.includes('Chuyên viên chính')) baseSalary = 8000000;
      else if (jobTitle.includes('Chuyên viên')) baseSalary = 7000000;
      else baseSalary = 6000000;

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
      console.log(`✅ ${i + 1}/20: ${employee.name} (${jobTitle}) - ${baseSalary.toLocaleString('vi-VN')} VNĐ`);
    }
    console.log('');

    // Step 4: Create shift settings for recent months
    console.log('4️⃣  Creating shift settings...');
    const shifts = [];
    const currentDate = new Date();
    
    // Create shifts for last 3 months
    for (let i = 2; i >= 0; i--) {
      const shiftDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = shiftDate.getFullYear();
      const month = shiftDate.getMonth() + 1;
      
      const shift = await ShiftSetting.create({
        name: `Ca làm việc ${month}/${year}`,
        startTime: '08:00',
        endTime: '17:00',
        gracePeriodMinutes: 10,
        overtimeThresholdMinutes: 30,
        active: i === 0, // Only current month is active
        note: `Ca làm việc chuẩn tháng ${month}/${year}`
      });
      
      shifts.push({ shift, year, month });
      console.log(`✅ Shift ${month}/${year}: 08:00-17:00 (Grace: 10min, OT: 30min) ${i === 0 ? '[ACTIVE]' : ''}`);
    }
    console.log('');

    // Step 5: Create attendance logs for the last 3 months
    console.log('5️⃣  Creating attendance logs for recent months...');
    let totalLogs = 0;
    
    for (const { shift, year, month } of shifts) {
      // Get working days in month (exclude weekends)
      const daysInMonth = new Date(year, month, 0).getDate();
      let workingDays = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
        // Skip future dates
        if (date > currentDate) continue;
        
        workingDays++;
        
        // Create attendance for each employee
        for (const employee of employees) {
          // 95% attendance rate - some employees might be absent
          if (Math.random() > 0.95) continue;
          
          // Check-in time (07:30 - 08:30)
          const checkInTime = randomTime(7, 30, 60);
          const checkInDateTime = createDateTime(year, month, day, checkInTime);
          const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number);
          const isLate = checkInHour > 8 || (checkInHour === 8 && checkInMinute > 10); // Late if after 08:10
          
          await AttendanceLog.create({
            userId: employee.id,
            detectedName: employee.name,
            confidence: 0.85 + Math.random() * 0.15, // 0.85-1.0
            matchDistance: Math.random() * 0.3, // 0-0.3
            type: 'IN',
            shiftId: shift.id,
            isLate: isLate,
            isEarlyLeave: false,
            isOvertime: false,
            deviceId: 'MAIN_ENTRANCE',
            timestamp: checkInDateTime
          });
          
          // Check-out time (16:30 - 18:00)
          const checkOutTime = randomTime(16, 30, 90);
          const checkOutDateTime = createDateTime(year, month, day, checkOutTime);
          const [checkOutHour, checkOutMinute] = checkOutTime.split(':').map(Number);
          const isEarlyLeave = checkOutHour < 17 || (checkOutHour === 17 && checkOutMinute === 0); // Early if before 17:00
          const isOvertime = checkOutHour > 17 || (checkOutHour === 17 && checkOutMinute > 30); // OT if after 17:30
          
          await AttendanceLog.create({
            userId: employee.id,
            detectedName: employee.name,
            confidence: 0.85 + Math.random() * 0.15,
            matchDistance: Math.random() * 0.3,
            type: 'OUT',
            shiftId: shift.id,
            isLate: false,
            isEarlyLeave: isEarlyLeave,
            isOvertime: isOvertime,
            deviceId: 'MAIN_ENTRANCE',
            timestamp: checkOutDateTime
          });
          
          totalLogs += 2;
        }
      }
      
      console.log(`✅ Month ${month}/${year}: ${workingDays} working days × ${employees.length} employees = ~${workingDays * employees.length * 2} logs`);
    }
    console.log(`   Total attendance logs created: ${totalLogs}\n`);

    // Step 6: Create salary records for last 12 months
    console.log('6️⃣  Creating salary records for 12 months...');
    const salaryYear = currentDate.getFullYear();
    let totalSalaries = 0;
    
    for (let month = 1; month <= 12; month++) {
      // Only create for past months
      if (month > currentDate.getMonth() + 1) continue;
      
      for (const employee of employees) {
        // Calculate working days and attendance for this month
        let workingDays = 22; // Standard working days
        let attendanceDays = workingDays;
        
        // Get actual attendance from logs
        const monthLogs = await AttendanceLog.count({
          where: {
            userId: employee.id,
            type: 'IN',
            timestamp: {
              [sequelize.Sequelize.Op.gte]: new Date(salaryYear, month - 1, 1),
              [sequelize.Sequelize.Op.lt]: new Date(salaryYear, month, 1)
            }
          }
        });
        
        if (monthLogs > 0) {
          attendanceDays = monthLogs;
        } else {
          // For months without logs, simulate 90-100% attendance
          attendanceDays = Math.floor(workingDays * (0.9 + Math.random() * 0.1));
        }
        
        // Calculate salary components
        const baseSalary = employee.baseSalary;
        const dailySalary = baseSalary / 22; // Standard 22 working days
        const actualSalary = Math.floor(dailySalary * attendanceDays);
        
        // Bonus: performance bonus (random 0-20% of base)
        const performanceBonus = Math.floor(baseSalary * (Math.random() * 0.2));
        
        // Additional allowances based on certificates and dependents
        const certificateBonus = employee.certificates?.includes('CCASP') ? 1000000 : 0;
        const dependentAllowance = (employee.dependents || 0) * 500000;
        
        const totalBonus = performanceBonus + certificateBonus + dependentAllowance;
        
        // Deductions: late/absence penalties
        const absentDays = workingDays - attendanceDays;
        const deduction = Math.floor(dailySalary * absentDays * 0.5); // 50% penalty for absent days
        
        const finalSalary = actualSalary + totalBonus - deduction;
        
        await Salary.create({
          userId: employee.id,
          month,
          year: salaryYear,
          baseSalary: baseSalary,
          bonus: totalBonus,
          deduction: deduction,
          totalSalary: finalSalary,
          workingDays: workingDays,
          actualDays: attendanceDays,
          status: month < currentDate.getMonth() + 1 ? 'paid' : 'pending',
          notes: `Lương tháng ${month}/${salaryYear}. Công: ${attendanceDays}/${workingDays} ngày`
        });
        
        totalSalaries++;
      }
      
      console.log(`✅ Month ${month}/${salaryYear}: Created salary for ${employees.length} employees`);
    }
    console.log(`   Total salary records: ${totalSalaries}\n`);

    // Summary
    console.log('=====================================');
    console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=====================================\n');
    
    console.log('📋 Summary:');
    console.log(`   👤 Accounts:`);
    console.log(`      - Admin: 1 account`);
    console.log(`      - Accountant: 1 account`);
    console.log(`      - Employees: ${employees.length} accounts`);
    console.log(`   💼 Job Data:`);
    console.log(`      - Face profiles: ${employees.length} profiles`);
    console.log(`      - Shift settings: ${shifts.length} shifts`);
    console.log(`   📊 Attendance & Salary:`);
    console.log(`      - Attendance logs: ${totalLogs} records`);
    console.log(`      - Salary records: ${totalSalaries} records`);
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log('   Admin:      admin@company.com / Admin@12345');
    console.log('   Accountant: accountant@company.com / Accountant@12345');
    console.log('   Employees:  employee1-20@company.com / Password123!');
    console.log('');
    console.log('💡 System is ready for testing salary calculation!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedComplete();
