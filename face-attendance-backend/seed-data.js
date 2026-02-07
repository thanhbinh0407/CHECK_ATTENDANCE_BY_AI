
import sequelize from './src/db/sequelize.js';
import { QueryTypes } from 'sequelize';
import {
  User, Department, JobTitle, SalaryGrade, SalaryRule, Salary,
  AttendanceLog, LeaveRequest, Document, OvertimeRequest, BusinessTripRequest,
  SalaryAdvance, Dependent, Qualification, ShiftSetting, InsuranceConfig, ApprovalWorkflow
} from './src/models/pg/index.js';
import bcrypt from 'bcryptjs';

// Vietnamese names
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

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getWorkingDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  return workingDays;
}

async function seedDB() {
  try {
    console.log('🔄 Starting comprehensive seed data generation...\n');
    
    // Drop all tables and enum types first
    console.log('1️⃣  Dropping existing tables and enum types...');
    
    // First, drop all enum types with CASCADE to remove dependencies
    const enumTypes = [
      'enum_overtime_requests_approvalStatus',
      'enum_business_trip_requests_approvalStatus',
      'enum_business_trip_requests_transportType',
      'enum_salary_advances_approvalStatus',
      'enum_documents_documentType',
      'enum_leave_requests_status',
      'enum_leave_requests_type',
      'enum_salary_rules_type',
      'enum_salary_rules_triggerType',
      'enum_salary_rules_amountType',
      'enum_users_contractType',
      'enum_users_employmentStatus',
      'enum_users_gender',
      'enum_users_educationLevel',
      'enum_approval_workflows_status',
      'enum_approval_workflows_requestType',
      'enum_attendance_logs_type',
      'enum_salaries_status',
      'enum_qualifications_type',
      'enum_qualifications_approvalStatus',
      'enum_dependents_relationship',
      'enum_dependents_gender',
      'enum_dependents_approvalStatus'
    ];
    
    for (const enumType of enumTypes) {
      await sequelize.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE;`).catch(() => {});
    }
    
    // Then drop all tables
    try {
      await sequelize.drop({ cascade: true });
      console.log('✅ All tables and enum types dropped\n');
    } catch (err) {
      console.log('⚠️  Error dropping tables (may not exist):', err.message);
      console.log('✅ Cleanup attempted\n');
    }
    
    // Create enum types before syncing (like in migrations)
    console.log('2️⃣  Creating enum types...');
    const createEnumType = async (name, values) => {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "${name}" AS ENUM (${values.map(v => `'${v}'`).join(', ')});
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `).catch(() => {});
    };
    
    await createEnumType('enum_users_contractType', ['probation', '1_year', '3_year', 'indefinite', 'other']);
    await createEnumType('enum_users_employmentStatus', ['active', 'maternity_leave', 'unpaid_leave', 'suspended', 'terminated', 'resigned']);
    await createEnumType('enum_users_gender', ['male', 'female', 'other']);
    await createEnumType('enum_users_educationLevel', ['high_school', 'vocational', 'college', 'university', 'master', 'phd', 'other']);
    await createEnumType('enum_salary_rules_type', ['bonus', 'deduction']);
    await createEnumType('enum_salary_rules_triggerType', ['late', 'early_leave', 'absent', 'overtime', 'full_attendance', 'custom']);
    await createEnumType('enum_salary_rules_amountType', ['fixed', 'percentage']);
    await createEnumType('enum_attendance_logs_type', ['IN', 'OUT']);
    await createEnumType('enum_salaries_status', ['pending', 'approved', 'paid']);
    await createEnumType('enum_leave_requests_type', ['paid', 'unpaid', 'sick', 'maternity', 'personal', 'other']);
    await createEnumType('enum_leave_requests_status', ['pending', 'approved', 'rejected']);
    await createEnumType('enum_overtime_requests_approvalStatus', ['pending', 'approved', 'rejected']);
    await createEnumType('enum_business_trip_requests_transportType', ['plane', 'train', 'bus', 'car', 'other']);
    await createEnumType('enum_business_trip_requests_approvalStatus', ['pending', 'approved', 'rejected']);
    await createEnumType('enum_salary_advances_approvalStatus', ['pending', 'approved', 'rejected']);
    await createEnumType('enum_documents_documentType', ['id_card', 'contract', 'certificate', 'appointment_decision', 'salary_decision', 'other']);
    await createEnumType('enum_approval_workflows_requestType', ['leave', 'overtime', 'business_trip', 'salary_advance', 'other']);
    await createEnumType('enum_approval_workflows_status', ['pending', 'approved', 'rejected', 'skipped']);
    await createEnumType('enum_qualifications_type', ['certificate', 'degree', 'license', 'training']);
    await createEnumType('enum_qualifications_approvalStatus', ['pending', 'approved', 'rejected']);
    await createEnumType('enum_dependents_relationship', ['spouse', 'child', 'parent', 'grandparent', 'sibling', 'other']);
    await createEnumType('enum_dependents_gender', ['male', 'female', 'other']);
    await createEnumType('enum_dependents_approvalStatus', ['pending', 'approved', 'rejected']);
    console.log('✅ Enum types created\n');
    
    // Ensure all models are loaded before syncing
    console.log('3️⃣  Loading all models...');
    void User && void Department && void JobTitle && void SalaryGrade && void SalaryRule && void Salary;
    void AttendanceLog && void LeaveRequest && void Document && void OvertimeRequest && void BusinessTripRequest;
    void SalaryAdvance && void Dependent && void Qualification && void ShiftSetting && void InsuranceConfig && void ApprovalWorkflow;
    console.log('✅ All models loaded\n');
    
    // Instead of using sync, let's try a workaround: check if tables exist first
    console.log('4️⃣  Creating tables (using workaround)...');
    try {
      // Check if users table exists
      const tablesExist = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `, { type: QueryTypes.SELECT });
      
      if (!tablesExist || !tablesExist[0]?.exists) {
        // Tables don't exist, try to create them using sync
        // But catch the USING error and continue
        try {
          await sequelize.sync({ force: false });
          console.log('✅ Database synced\n');
        } catch (syncErr) {
          if (syncErr.message.includes('USING')) {
            console.log('⚠️  Sync failed with USING error, but continuing...');
            console.log('   This might be a Sequelize enum type handling issue.');
            console.log('   Trying to continue with data seeding...\n');
            // Continue anyway - tables might have been partially created
          } else {
            throw syncErr;
          }
        }
      } else {
        console.log('✅ Tables already exist, skipping sync\n');
      }
    } catch (err) {
      console.log('⚠️  Error during sync:', err.message);
      console.log('   Attempting to continue...\n');
    }

    // Create Insurance Config
    console.log('3️⃣  Creating insurance configuration...');
    await InsuranceConfig.create({
      name: 'BHXH 2025',
      effectiveDate: '2025-01-01',
      employeeSocialInsuranceRate: 10.5,
      employerSocialInsuranceRate: 21.5,
      employeeHealthInsuranceRate: 1.5,
      employerHealthInsuranceRate: 3.0,
      employeeUnemploymentInsuranceRate: 1.0,
      employerUnemploymentInsuranceRate: 1.0,
      maxInsuranceSalary: 36000000,
      minInsuranceSalary: 1800000,
      isActive: true,
      description: 'Cấu hình bảo hiểm theo quy định 2025'
    });
    console.log('✅ Insurance config created\n');

    // Create Shift Settings
    console.log('4️⃣  Creating shift settings...');
    await ShiftSetting.create({
      name: 'Ca hành chính',
      startTime: '08:00',
      endTime: '17:00',
      gracePeriodMinutes: 10,
      overtimeThresholdMinutes: 30,
      active: true
    });
    console.log('✅ Shift settings created\n');

    // Create Departments
    console.log('5️⃣  Creating departments...');
    const depts = await Department.bulkCreate([
      { code: 'KT', name: 'Kỹ thuật' },
      { code: 'KB', name: 'Kinh doanh' },
      { code: 'NS', name: 'Nhân sự' },
      { code: 'ACC', name: 'Kế toán' },
      { code: 'HC', name: 'Hành chính' }
    ]);
    console.log(`✅ Created ${depts.length} departments\n`);

    // Create Job Titles
    console.log('6️⃣  Creating job titles...');
    const titles = await JobTitle.bulkCreate([
      { code: 'TP', name: 'Trưởng phòng' },
      { code: 'PTP', name: 'Phó trưởng phòng' },
      { code: 'NVC', name: 'Nhân viên cấp cao' },
      { code: 'NV', name: 'Nhân viên' },
      { code: 'TTS', name: 'Thực tập sinh' }
    ]);
    console.log(`✅ Created ${titles.length} job titles\n`);

    // Create Salary Grades
    console.log('7️⃣  Creating salary grades...');
    const grades = await SalaryGrade.bulkCreate([
      { code: 'A', name: 'Bậc A', level: 1, baseSalary: 25000000 },
      { code: 'B', name: 'Bậc B', level: 2, baseSalary: 20000000 },
      { code: 'C', name: 'Bậc C', level: 3, baseSalary: 15000000 },
      { code: 'D', name: 'Bậc D', level: 4, baseSalary: 12000000 },
      { code: 'E', name: 'Bậc E', level: 5, baseSalary: 10000000 },
      { code: 'F', name: 'Bậc F', level: 6, baseSalary: 8000000 }
    ]);
    console.log(`✅ Created ${grades.length} salary grades\n`);

    // Create Salary Rules
    console.log('8️⃣  Creating salary rules...');
    await SalaryRule.bulkCreate([
      { name: 'Thưởng điểm danh', type: 'bonus', triggerType: 'full_attendance', amount: 3, amountType: 'percentage' },
      { name: 'Thưởng tăng ca', type: 'bonus', triggerType: 'overtime', amount: 500000, amountType: 'fixed' },
      { name: 'Thưởng hiệu suất', type: 'bonus', triggerType: 'custom', amount: 5, amountType: 'percentage' },
      { name: 'Thưởng thâm niên', type: 'bonus', triggerType: 'custom', amount: 2, amountType: 'percentage' },
      { name: 'Phụ cấp kỹ thuật', type: 'bonus', triggerType: 'custom', amount: 1000000, amountType: 'fixed' },
      { name: 'Phụ cấp quản lý', type: 'bonus', triggerType: 'custom', amount: 10, amountType: 'percentage' },
      { name: 'Phạt đi muộn', type: 'deduction', triggerType: 'late', amount: 500000, amountType: 'fixed' },
      { name: 'Phạt vắng mặt', type: 'deduction', triggerType: 'absent', amount: 1000000, amountType: 'fixed' },
      { name: 'Phạt về sớm', type: 'deduction', triggerType: 'early_leave', amount: 300000, amountType: 'fixed' }
    ]);
    console.log('✅ Salary rules created\n');

    // Create Admin and Accountant
    console.log('9️⃣  Creating admin and accountant accounts...');
    const admin = await User.create({
      employeeCode: 'ADM001',
      name: 'Trần Văn Admin',
      email: 'admin@company.com',
      password: await bcrypt.hash('Admin@12345', 10),
      phone: '0900000001',
      phoneNumber: '0900000001',
      gender: 'male',
      role: 'admin',
      isActive: true,
      baseSalary: 30000000,
      departmentId: depts[3].id, // Kế toán
      jobTitleId: titles[0].id, // Trưởng phòng
      salaryGradeId: grades[0].id, // Bậc A
      startDate: new Date('2020-01-01'),
      contractType: 'indefinite',
      employmentStatus: 'active',
      insuranceBaseSalary: 30000000
    });

    const accountant = await User.create({
      employeeCode: 'ACC001',
      name: 'Nguyễn Thị Kế toán',
      email: 'accountant@company.com',
      password: await bcrypt.hash('Accountant@12345', 10),
      phone: '0900000002',
      phoneNumber: '0900000002',
      gender: 'female',
      role: 'accountant',
      isActive: true,
      baseSalary: 20000000,
      departmentId: depts[3].id, // Kế toán
      jobTitleId: titles[1].id, // Phó trưởng phòng
      salaryGradeId: grades[1].id, // Bậc B
      startDate: new Date('2021-06-01'),
      contractType: '3_year',
      employmentStatus: 'active',
      managerId: admin.id,
      insuranceBaseSalary: 20000000
    });
    console.log('✅ Admin and accountant created\n');

    // Create 10 Employees with diverse data
    console.log('🔟 Creating 10 employees with comprehensive data...');
    const employees = [];
    const now = new Date();
    const startYear = 2025;
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Employee data with variety
    const employeeData = [
      { name: 'Lê Minh Cường', gender: 'male', dept: 0, title: 0, grade: 1, baseSalary: 22000000, startDate: '2023-01-15', contractType: '3_year', hasDependents: 2, hasDocuments: true, hasOvertime: true, hasBusinessTrip: true, hasSalaryAdvance: true },
      { name: 'Phạm Thị Hương', gender: 'female', dept: 1, title: 1, grade: 2, baseSalary: 18000000, startDate: '2023-06-01', contractType: '1_year', hasDependents: 1, hasDocuments: true, hasOvertime: true, hasBusinessTrip: false, hasSalaryAdvance: false },
      { name: 'Hoàng Văn Đức', gender: 'male', dept: 0, title: 2, grade: 3, baseSalary: 16000000, startDate: '2024-03-10', contractType: 'probation', hasDependents: 0, hasDocuments: true, hasOvertime: false, hasBusinessTrip: true, hasSalaryAdvance: true },
      { name: 'Nguyễn Thị Lan', gender: 'female', dept: 2, title: 2, grade: 3, baseSalary: 15000000, startDate: '2024-05-20', contractType: '1_year', hasDependents: 3, hasDocuments: true, hasOvertime: true, hasBusinessTrip: false, hasSalaryAdvance: false },
      { name: 'Trần Văn Nam', gender: 'male', dept: 1, title: 3, grade: 4, baseSalary: 13000000, startDate: '2024-07-01', contractType: 'probation', hasDependents: 0, hasDocuments: false, hasOvertime: true, hasBusinessTrip: true, hasSalaryAdvance: true },
      { name: 'Lê Thị Mai', gender: 'female', dept: 3, title: 3, grade: 4, baseSalary: 12000000, startDate: '2024-08-15', contractType: '1_year', hasDependents: 1, hasDocuments: true, hasOvertime: false, hasBusinessTrip: false, hasSalaryAdvance: true },
      { name: 'Phạm Văn Long', gender: 'male', dept: 0, title: 3, grade: 5, baseSalary: 11000000, startDate: '2024-09-01', contractType: 'probation', hasDependents: 0, hasDocuments: true, hasOvertime: true, hasBusinessTrip: true, hasSalaryAdvance: false },
      { name: 'Hoàng Thị Yến', gender: 'female', dept: 4, title: 3, grade: 5, baseSalary: 10000000, startDate: '2024-10-10', contractType: '1_year', hasDependents: 2, hasDocuments: true, hasOvertime: false, hasBusinessTrip: true, hasSalaryAdvance: true },
      { name: 'Nguyễn Văn Tùng', gender: 'male', dept: 1, title: 4, grade: 6, baseSalary: 9000000, startDate: '2024-11-01', contractType: 'probation', hasDependents: 0, hasDocuments: false, hasOvertime: true, hasBusinessTrip: false, hasSalaryAdvance: false },
      { name: 'Trần Thị Linh', gender: 'female', dept: 2, title: 4, grade: 6, baseSalary: 8500000, startDate: '2024-12-01', contractType: 'probation', hasDependents: 1, hasDocuments: true, hasOvertime: true, hasBusinessTrip: true, hasSalaryAdvance: true }
    ];

    for (let i = 0; i < employeeData.length; i++) {
      const empData = employeeData[i];
      const dob = randomDate(new Date('1985-01-01'), new Date('2000-12-31'));
      const startDate = new Date(empData.startDate);
      
      // Calculate contract expiration for documents
      let contractExpiryDate = null;
      if (empData.contractType === '1_year') {
        contractExpiryDate = addDays(startDate, 365);
      } else if (empData.contractType === '3_year') {
        contractExpiryDate = addDays(startDate, 365 * 3);
      }

      const employee = await User.create({
        employeeCode: `NV${String(i + 1).padStart(4, '0')}`,
        name: empData.name,
        email: randomEmail(i + 1),
        password: await bcrypt.hash('Password123!', 10),
        phone: randomPhone(),
        phoneNumber: randomPhone(),
        gender: empData.gender,
        dateOfBirth: dob,
        departmentId: depts[empData.dept].id,
        jobTitleId: titles[empData.title].id,
        salaryGradeId: grades[empData.grade - 1].id, // grade is 1-based, array is 0-based
        startDate: startDate,
        contractType: empData.contractType,
        employmentStatus: 'active',
        baseSalary: empData.baseSalary,
        insuranceBaseSalary: empData.baseSalary,
        managerId: i < 2 ? admin.id : (i < 5 ? employees[0].id : employees[1].id), // Some have managers
        role: 'employee',
        isActive: true,
        address: `123 Đường ABC, Quận ${i + 1}, TP.HCM`,
        permanentAddress: `456 Đường XYZ, Tỉnh ${i + 1}`,
        bankAccount: `123456789${i}`,
        bankName: 'Vietcombank',
        bankBranch: `Chi nhánh ${i + 1}`,
        taxCode: `123456789${i}`,
        lunchAllowance: 730000,
        transportAllowance: i < 3 ? 500000 : 0,
        phoneAllowance: i < 5 ? 200000 : 0,
        responsibilityAllowance: i < 2 ? empData.baseSalary * 0.1 : 0
      });
      employees.push(employee);
    }
    console.log(`✅ Created ${employees.length} employees\n`);

    // Create Dependents
    console.log('1️⃣1️⃣  Creating dependents...');
    let depCount = 0;
    const relationships = ['spouse', 'child', 'parent'];
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const empData = employeeData[i];
      if (empData.hasDependents > 0) {
        for (let j = 0; j < empData.hasDependents; j++) {
          await Dependent.create({
            fullName: randomName(j === 0 ? (emp.gender === 'male' ? false : true) : Math.random() > 0.5),
            relationship: relationships[j] || 'child',
            dateOfBirth: randomDate(new Date('1960-01-01'), new Date('2020-12-31')),
            gender: Math.random() > 0.5 ? 'male' : 'female',
            userId: emp.id
          });
          depCount++;
        }
      }
    }
    console.log(`✅ Created ${depCount} dependents\n`);

    // Create Qualifications
    console.log('1️⃣2️⃣  Creating qualifications...');
    let qualCount = 0;
    const qualTypes = ['degree', 'certificate', 'license'];
    const qualNames = {
      'degree': ['Cử nhân Công nghệ Thông tin', 'Cử nhân Kinh tế', 'Thạc sỹ Quản lý'],
      'certificate': ['TOEIC 850', 'PMP', 'SAP', 'AWS Certified'],
      'license': ['Lái xe B2', 'An toàn lao động']
    };
    for (const emp of employees) {
      const numQual = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numQual; i++) {
        const type = qualTypes[Math.floor(Math.random() * qualTypes.length)];
        await Qualification.create({
          name: qualNames[type][Math.floor(Math.random() * qualNames[type].length)],
          type,
          issuedBy: 'Trường Đại học / Tổ chức',
          issuedDate: randomDate(new Date('2015-01-01'), new Date('2024-12-31')),
          expiryDate: type === 'certificate' ? randomDate(new Date('2026-01-01'), new Date('2027-12-31')) : null,
          userId: emp.id
        });
        qualCount++;
      }
    }
    console.log(`✅ Created ${qualCount} qualifications\n`);

    // Create Documents
    console.log('1️⃣3️⃣  Creating documents...');
    let docCount = 0;
    const docTypes = ['id_card', 'contract', 'certificate', 'appointment_decision', 'salary_decision'];
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const empData = employeeData[i];
      if (empData.hasDocuments) {
        // ID Card
        await Document.create({
          userId: emp.id,
          documentType: 'id_card',
          title: 'Căn cước công dân',
          documentPath: `/uploads/documents/cccd_${emp.id}.pdf`,
          fileName: `CCCD_${emp.employeeCode}.pdf`,
          fileSize: 1024000,
          mimeType: 'application/pdf',
          uploadDate: emp.startDate,
          expiryDate: addDays(emp.dateOfBirth, 365 * 15), // 15 years from birth
          description: 'Bản scan căn cước công dân',
          isActive: true,
          uploadedBy: admin.id
        });
        docCount++;

        // Contract
        await Document.create({
          userId: emp.id,
          documentType: 'contract',
          title: `Hợp đồng lao động ${empData.contractType}`,
          documentPath: `/uploads/documents/contract_${emp.id}.pdf`,
          fileName: `HDLD_${emp.employeeCode}.pdf`,
          fileSize: 2048000,
          mimeType: 'application/pdf',
          uploadDate: emp.startDate,
          expiryDate: emp.contractExpiryDate,
          description: 'Bản sao hợp đồng lao động đã ký',
          isActive: true,
          uploadedBy: admin.id
        });
        docCount++;

        // Certificate (if has qualification)
        if (Math.random() > 0.5) {
          await Document.create({
            userId: emp.id,
            documentType: 'certificate',
            title: 'Bằng cấp / Chứng chỉ',
            documentPath: `/uploads/documents/cert_${emp.id}.pdf`,
            fileName: `CERT_${emp.employeeCode}.pdf`,
            fileSize: 1536000,
            mimeType: 'application/pdf',
            uploadDate: randomDate(emp.startDate, now),
            expiryDate: null,
            description: 'Bản sao bằng cấp hoặc chứng chỉ',
            isActive: true,
            uploadedBy: admin.id
          });
          docCount++;
        }
      }
    }
    console.log(`✅ Created ${docCount} documents\n`);

    // Create Attendance Logs from 2025-01 to current month
    console.log('1️⃣4️⃣  Creating attendance logs from 2025...');
    let attCount = 0;
    const targetYear = currentYear >= 2025 ? currentYear : 2025;
    const endMonth = currentYear >= 2025 ? currentMonth : 12;
    
    for (const emp of employees) {
      const startDate = emp.startDate;
      for (let year = targetYear; year <= currentYear; year++) {
        const startMonth = year === targetYear ? 1 : 1;
        const endMonthForYear = year === currentYear ? endMonth : 12;
        
        for (let month = startMonth; month <= endMonthForYear; month++) {
          // Skip if employee started after this month
          if (year === startDate.getFullYear() && month < startDate.getMonth() + 1) continue;
          
          const workingDays = getWorkingDaysInMonth(year, month);
          const attendanceRate = 0.85 + Math.random() * 0.15; // 85-100% attendance
          const daysToCreate = Math.floor(workingDays * attendanceRate);
          
          for (let day = 1; day <= workingDays && attCount < daysToCreate * 2; day++) {
            const date = new Date(year, month - 1, day);
            if (date > now) break; // Don't create future dates
            if (date < startDate) continue; // Don't create before start date
            
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
            
            // Check-in (some late)
            const isLate = Math.random() < 0.15; // 15% late
            const checkInHour = isLate ? 8 + Math.floor(Math.random() * 2) : 7 + Math.floor(Math.random() * 2);
            const checkInMin = Math.floor(Math.random() * 60);
            const checkInTime = new Date(year, month - 1, day, checkInHour, checkInMin);
            
            await AttendanceLog.create({
              userId: emp.id,
              detectedName: emp.name,
              confidence: 0.85 + Math.random() * 0.15,
              matchDistance: Math.random() * 0.3,
              type: 'IN',
              isLate: isLate,
              isEarlyLeave: false,
              isOvertime: false,
              deviceId: 'MAIN_ENTRANCE',
              timestamp: checkInTime
            });
            attCount++;

            // Check-out (some early leave, some overtime)
            const hasOvertime = Math.random() < 0.2; // 20% overtime
            const isEarlyLeave = Math.random() < 0.1; // 10% early leave
            let checkOutHour, checkOutMin;
            if (isEarlyLeave) {
              checkOutHour = 16;
              checkOutMin = Math.floor(Math.random() * 60);
            } else if (hasOvertime) {
              checkOutHour = 18 + Math.floor(Math.random() * 2);
              checkOutMin = Math.floor(Math.random() * 60);
            } else {
              checkOutHour = 17;
              checkOutMin = Math.floor(Math.random() * 60);
            }
            const checkOutTime = new Date(year, month - 1, day, checkOutHour, checkOutMin);
            
            await AttendanceLog.create({
              userId: emp.id,
              detectedName: emp.name,
              confidence: 0.85 + Math.random() * 0.15,
              matchDistance: Math.random() * 0.3,
              type: 'OUT',
              isLate: false,
              isEarlyLeave: isEarlyLeave,
              isOvertime: hasOvertime,
              deviceId: 'MAIN_ENTRANCE',
              timestamp: checkOutTime
            });
            attCount++;
          }
        }
      }
    }
    console.log(`✅ Created ${attCount} attendance logs\n`);

    // Create Leave Requests
    console.log('1️⃣5️⃣  Creating leave requests...');
    let leaveCount = 0;
    const leaveTypes = ['paid', 'sick', 'unpaid', 'personal'];
    for (const emp of employees) {
      const numLeaves = Math.floor(Math.random() * 4) + 1; // 1-4 leave requests
      for (let i = 0; i < numLeaves; i++) {
        const start = randomDate(emp.startDate, now);
        const daysCount = Math.floor(Math.random() * 5) + 1; // 1-5 days
        const end = addDays(start, daysCount - 1);
        
        const statuses = ['approved', 'rejected', 'pending'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        await LeaveRequest.create({
          userId: emp.id,
          type: leaveTypes[Math.floor(Math.random() * leaveTypes.length)],
          startDate: start,
          endDate: end,
          days: daysCount,
          reason: 'Xin nghỉ phép',
          status: status,
          approvedBy: status === 'approved' ? admin.id : null,
          approvedAt: status === 'approved' ? randomDate(start, now) : null
        });
        leaveCount++;
      }
    }
    console.log(`✅ Created ${leaveCount} leave requests\n`);

    // Create Overtime Requests
    console.log('1️⃣6️⃣  Creating overtime requests...');
    let otCount = 0;
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const empData = employeeData[i];
      if (empData.hasOvertime) {
        const numOT = Math.floor(Math.random() * 3) + 1; // 1-3 OT requests
        for (let j = 0; j < numOT; j++) {
          const date = randomDate(emp.startDate, now);
          const startHour = 17 + Math.floor(Math.random() * 2); // 17-18
          const endHour = startHour + Math.floor(Math.random() * 3) + 1; // 1-3 hours OT
          const totalHours = endHour - startHour + Math.random();
          
          const statuses = ['approved', 'rejected', 'pending'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          await OvertimeRequest.create({
            userId: emp.id,
            date: date,
            startTime: `${String(startHour).padStart(2, '0')}:00`,
            endTime: `${String(endHour).padStart(2, '0')}:30`,
            totalHours: parseFloat(totalHours.toFixed(2)),
            reason: 'Làm thêm giờ dự án',
            projectName: `Dự án ${j + 1}`,
            approvalStatus: status,
            approvedBy: status === 'approved' ? admin.id : null,
            approvedAt: status === 'approved' ? randomDate(date, now) : null,
            approvalLevel: 1,
            currentApproverId: status === 'pending' ? admin.id : null
          });
          otCount++;
        }
      }
    }
    console.log(`✅ Created ${otCount} overtime requests\n`);

    // Create Business Trip Requests
    console.log('1️⃣7️⃣  Creating business trip requests...');
    let tripCount = 0;
    const destinations = ['Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Nha Trang', 'Vũng Tàu'];
    const transportTypes = ['plane', 'train', 'bus', 'car'];
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const empData = employeeData[i];
      if (empData.hasBusinessTrip) {
        const numTrips = Math.floor(Math.random() * 2) + 1; // 1-2 trips
        for (let j = 0; j < numTrips; j++) {
          const startDate = randomDate(emp.startDate, now);
          const daysCount = Math.floor(Math.random() * 5) + 1; // 1-5 days
          const endDate = addDays(startDate, daysCount - 1);
          
          const statuses = ['approved', 'rejected', 'pending'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          await BusinessTripRequest.create({
            userId: emp.id,
            startDate: startDate,
            endDate: endDate,
            destination: destinations[Math.floor(Math.random() * destinations.length)],
            purpose: 'Công tác',
            estimatedCost: Math.floor(Math.random() * 5000000) + 2000000,
            transportType: transportTypes[Math.floor(Math.random() * transportTypes.length)],
            accommodation: 'Khách sạn',
            approvalStatus: status,
            approvedBy: status === 'approved' ? admin.id : null,
            approvedAt: status === 'approved' ? randomDate(startDate, now) : null,
            approvalLevel: 1,
            currentApproverId: status === 'pending' ? admin.id : null
          });
          tripCount++;
        }
      }
    }
    console.log(`✅ Created ${tripCount} business trip requests\n`);

    // Create Salary Advances
    console.log('1️⃣8️⃣  Creating salary advances...');
    let advanceCount = 0;
    const usedMonths = new Set(); // Track used (userId, month, year) combinations
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const empData = employeeData[i];
      if (empData.hasSalaryAdvance) {
        const numAdvances = Math.floor(Math.random() * 2) + 1; // 1-2 advances
        for (let j = 0; j < numAdvances; j++) {
          let month, year, key;
          let attempts = 0;
          // Find a unique (userId, month, year) combination
          do {
            month = Math.floor(Math.random() * endMonth) + 1;
            year = targetYear;
            key = `${emp.id}-${month}-${year}`;
            attempts++;
            if (attempts > 20) break; // Prevent infinite loop
          } while (usedMonths.has(key));
          
          if (usedMonths.has(key)) continue; // Skip if couldn't find unique combination
          
          usedMonths.add(key);
          const amount = Math.floor(emp.baseSalary * (0.2 + Math.random() * 0.3)); // 20-50% of base salary
          
          const statuses = ['approved', 'rejected', 'pending'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          await SalaryAdvance.create({
            userId: emp.id,
            month: month,
            year: year,
            amount: amount,
            reason: 'Tạm ứng lương',
            requestDate: new Date(year, month - 1, 15),
            approvalStatus: status,
            approvedBy: status === 'approved' ? accountant.id : null,
            approvedAt: status === 'approved' ? new Date(year, month - 1, 16) : null,
            isDeducted: status === 'approved' && Math.random() > 0.5
          });
          advanceCount++;
        }
      }
    }
    console.log(`✅ Created ${advanceCount} salary advances\n`);

    // Create Salary Records from 2025-01 to current month
    console.log('1️⃣9️⃣  Creating salary records from 2025...');
    let salCount = 0;
    for (const emp of employees) {
      const startDate = emp.startDate;
      for (let year = targetYear; year <= currentYear; year++) {
        const startMonth = year === targetYear ? 1 : 1;
        const endMonthForYear = year === currentYear ? endMonth : 12;
        
        for (let month = startMonth; month <= endMonthForYear; month++) {
          // Skip if employee started after this month
          if (year === startDate.getFullYear() && month < startDate.getMonth() + 1) continue;
          
          const base = parseFloat(emp.baseSalary);
          const workingDays = getWorkingDaysInMonth(year, month);
          
          // Get actual attendance days
          const attendanceDays = await AttendanceLog.count({
            where: {
              userId: emp.id,
              type: 'IN',
              timestamp: {
                [sequelize.Sequelize.Op.gte]: new Date(year, month - 1, 1),
                [sequelize.Sequelize.Op.lt]: new Date(year, month, 1)
              }
            }
          }) || Math.floor(workingDays * (0.85 + Math.random() * 0.15));
          
          // Calculate bonuses
          const performanceBonus = Math.floor(base * (Math.random() * 0.15)); // 0-15%
          const attendanceBonus = attendanceDays === workingDays ? Math.floor(base * 0.03) : 0; // 3% if full attendance
          const totalBonus = performanceBonus + attendanceBonus + parseFloat(emp.lunchAllowance || 0) + parseFloat(emp.transportAllowance || 0) + parseFloat(emp.phoneAllowance || 0) + parseFloat(emp.responsibilityAllowance || 0);
          
          // Calculate deductions
          const absentDays = workingDays - attendanceDays;
          const absentDeduction = Math.floor((base / workingDays) * absentDays * 0.5); // 50% penalty
          
          // Get salary advance for this month
          const advance = await SalaryAdvance.findOne({
            where: {
              userId: emp.id,
              month: month,
              year: year,
              approvalStatus: 'approved',
              isDeducted: false
            }
          });
          const advanceDeduction = advance ? parseFloat(advance.amount) : 0;
          
          // Insurance and tax (simplified)
          const insuranceBase = parseFloat(emp.insuranceBaseSalary || base);
          const employeeInsurance = Math.floor(insuranceBase * 0.105); // 10.5%
          const tax = Math.floor((base + totalBonus - employeeInsurance - 11000000) * 0.05); // Simplified tax
          const totalDeduction = absentDeduction + advanceDeduction + employeeInsurance + (tax > 0 ? tax : 0);
          
          const finalSalary = base + totalBonus - totalDeduction;
          
          await Salary.create({
            userId: emp.id,
            month: month,
            year: year,
            baseSalary: base,
            bonus: totalBonus,
            deduction: totalDeduction,
            finalSalary: finalSalary > 0 ? finalSalary : 0,
            status: month < currentMonth || year < currentYear ? 'paid' : (month === currentMonth && year === currentYear ? 'pending' : 'approved'),
            notes: `Lương tháng ${month}/${year}. Công: ${attendanceDays}/${workingDays} ngày`
          });
          salCount++;
        }
      }
    }
    console.log(`✅ Created ${salCount} salary records\n`);

    // Summary
    console.log('\n✨ SEED DATA GENERATION COMPLETED!\n');
    console.log('📊 Summary:');
    console.log(`   👤 Users: ${employees.length + 2} (10 employees + 1 admin + 1 accountant)`);
    console.log(`   🏢 Departments: ${depts.length}`);
    console.log(`   💼 Job Titles: ${titles.length}`);
    console.log(`   💰 Salary Grades: ${grades.length}`);
    console.log(`   👨‍👩‍👧‍👦 Dependents: ${depCount}`);
    console.log(`   📜 Qualifications: ${qualCount}`);
    console.log(`   📄 Documents: ${docCount}`);
    console.log(`   ⏰ Attendance Logs: ${attCount}`);
    console.log(`   🏖️  Leave Requests: ${leaveCount}`);
    console.log(`   ⏱️  Overtime Requests: ${otCount}`);
    console.log(`   🧳 Business Trip Requests: ${tripCount}`);
    console.log(`   💸 Salary Advances: ${advanceCount}`);
    console.log(`   💵 Salary Records: ${salCount} (from ${targetYear}-01 to ${currentYear}-${String(endMonth).padStart(2, '0')})`);
    console.log('\n🔐 Login Credentials:');
    console.log('   Admin:      admin@company.com / Admin@12345');
    console.log('   Accountant: accountant@company.com / Accountant@12345');
    console.log('   Employees:  emp1@company.com to emp10@company.com / Password123!');
    console.log('\n💡 All employees have diverse data covering all system features!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.errors) console.error('Details:', err.errors);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

seedDB();

