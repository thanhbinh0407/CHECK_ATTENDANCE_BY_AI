import sequelize from './src/db/sequelize.js';
import { QueryTypes, Op } from 'sequelize';
import {
  User, Department, JobTitle, SalaryGrade, SalaryRule, Salary,
  AttendanceLog, LeaveRequest, Document, OvertimeRequest, BusinessTripRequest,
  SalaryAdvance, Dependent, Qualification, WorkExperience, ShiftSetting, InsuranceConfig, ApprovalWorkflow
} from './src/models/pg/index.js';
import bcrypt from 'bcryptjs';

const REFERENCE_DATE = new Date('2026-02-28T00:00:00.000Z');
const PERIOD_START = new Date('2025-01-01T00:00:00.000Z');

const REQUIRED_COUNTS = {
  totalEmployees: 50,
  dependentEmployees: 10,
  withJobTitle: 30,
  withoutJobTitle: 20,
  seniority: {
    ten_years: 10,
    five_years: 15,
    three_years: 15,
    new_joiner: 10
  }
};

const FAMILY_NAMES = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Phan', 'Vu', 'Dang', 'Bui', 'Do'];
const MIDDLE_NAMES = ['Van', 'Thi', 'Ngoc', 'Minh', 'Quoc', 'Thanh', 'Duc', 'Gia', 'Bao', 'Khac'];
const GIVEN_NAMES = ['An', 'Anh', 'Bao', 'Binh', 'Cuong', 'Dung', 'Giang', 'Ha', 'Hieu', 'Huong', 'Khanh', 'Khoa', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Nga', 'Ngoc', 'Phuong', 'Quan', 'Quynh', 'Son', 'Trang', 'Tuan'];

const STREETS = ['Le Loi', 'Nguyen Hue', 'Tran Hung Dao', 'Vo Van Kiet', 'Pham Van Dong', 'Hoang Van Thu'];
const DISTRICTS = ['District 1, Ho Chi Minh City', 'District 3, Ho Chi Minh City', 'District 7, Ho Chi Minh City', 'Cau Giay, Ha Noi', 'Hai Chau, Da Nang', 'Ninh Kieu, Can Tho'];
const PROVINCES = ['Dong Nai', 'Binh Duong', 'Long An', 'Nam Dinh', 'Quang Nam', 'An Giang'];
const BANKS = ['Vietcombank', 'BIDV', 'VietinBank', 'Techcombank', 'ACB', 'MB Bank'];
const ID_ISSUE_PLACES = ['Ho Chi Minh City', 'Ha Noi', 'Da Nang', 'Can Tho', 'Hai Phong'];
const DESTINATIONS = ['Ha Noi', 'Da Nang', 'Can Tho', 'Hai Phong', 'Nha Trang', 'Vung Tau'];
const TRANSPORT_TYPES = ['plane', 'train', 'bus', 'car'];
const STATUS_CYCLE = ['approved', 'approved', 'pending', 'rejected'];
const LEAVE_TYPES = ['paid', 'personal', 'sick', 'unpaid'];
const EXPERIENCE_COMPANIES_BY_DEPT = [
  ['FPT Software', 'Viettel Solutions', 'CMC Global', 'TMA Solutions', 'NashTech Vietnam'],
  ['Masan Consumer', 'Unilever Vietnam', 'PNJ', 'The Gioi Di Dong', 'VNPT Business'],
  ['Talentnet', 'Adecco Vietnam', 'Navigos Group', 'Manpower Vietnam', 'CareerBuilder Vietnam'],
  ['Deloitte Vietnam', 'PwC Vietnam', 'KPMG Vietnam', 'Grant Thornton Vietnam', 'RSM Vietnam'],
  ['Vingroup', 'Sovico Group', 'Saigon Co.op', 'Nova Group', 'Sun Group']
];
const EXPERIENCE_POSITIONS_BY_DEPT = [
  ['Junior Developer', 'Software Engineer', 'Senior Engineer', 'Technical Lead'],
  ['Sales Executive', 'Senior Sales Executive', 'Business Development Specialist', 'Sales Supervisor'],
  ['HR Assistant', 'HR Executive', 'Talent Acquisition Specialist', 'HR Generalist'],
  ['Accounting Assistant', 'Accountant', 'Senior Accountant', 'Financial Analyst'],
  ['Admin Assistant', 'Office Administrator', 'Operations Coordinator', 'Administration Supervisor']
];

const PRIMARY_MANAGER_CODES = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'];
const TITLE_CODES_FOR_FIRST_30 = [
  'TP', 'PTP', 'TP', 'PTP', 'TP', 'NVC', 'NVC', 'NVC', 'NV', 'NV',
  'NVC', 'NVC', 'NV', 'NV', 'NVC', 'NV', 'NV', 'NVC', 'NV', 'NV',
  'NV', 'NV', 'TTS', 'NV', 'NV', 'NV', 'TTS', 'NV', 'NV', 'TTS'
];

const DEPENDENT_INDEX_MAP = {
  1: [
    { fullName: 'Nguyen Thu Hien', relationship: 'spouse', gender: 'female', dateOfBirth: '1990-09-11', occupation: 'Office staff' },
    { fullName: 'Nguyen Gia Han', relationship: 'child', gender: 'female', dateOfBirth: '2018-04-02', occupation: 'Student' }
  ],
  3: [
    { fullName: 'Le Van Binh', relationship: 'parent', gender: 'male', dateOfBirth: '1962-06-15', occupation: 'Retired' }
  ],
  6: [
    { fullName: 'Bui Quynh Nhu', relationship: 'spouse', gender: 'female', dateOfBirth: '1992-01-20', occupation: 'Accountant' },
    { fullName: 'Bui Bao An', relationship: 'child', gender: 'female', dateOfBirth: '2017-03-11', occupation: 'Student' },
    { fullName: 'Bui Minh Khang', relationship: 'child', gender: 'male', dateOfBirth: '2021-07-08', occupation: 'Preschooler' }
  ],
  10: [
    { fullName: 'Do Khanh Chi', relationship: 'child', gender: 'female', dateOfBirth: '2019-12-14', occupation: 'Student' }
  ],
  12: [
    { fullName: 'Tran Van Minh', relationship: 'spouse', gender: 'male', dateOfBirth: '1991-08-23', occupation: 'Civil engineer' }
  ],
  18: [
    { fullName: 'Dang Van Kiem', relationship: 'parent', gender: 'male', dateOfBirth: '1960-01-05', occupation: 'Retired' },
    { fullName: 'Dang Thi Lien', relationship: 'parent', gender: 'female', dateOfBirth: '1963-10-09', occupation: 'Retired' }
  ],
  22: [
    { fullName: 'Tran Gia Bao', relationship: 'spouse', gender: 'male', dateOfBirth: '1990-05-17', occupation: 'Sales manager' },
    { fullName: 'Tran Ngoc Diep', relationship: 'child', gender: 'female', dateOfBirth: '2016-11-30', occupation: 'Student' }
  ],
  27: [
    { fullName: 'Vo Thanh Nhi', relationship: 'child', gender: 'female', dateOfBirth: '2020-06-22', occupation: 'Preschooler' }
  ],
  34: [
    { fullName: 'Pham Huy Hoang', relationship: 'spouse', gender: 'male', dateOfBirth: '1990-03-12', occupation: 'Small business owner' },
    { fullName: 'Pham Gia Linh', relationship: 'child', gender: 'female', dateOfBirth: '2015-05-19', occupation: 'Student' }
  ],
  45: [
    { fullName: 'Hoang Thi Minh', relationship: 'parent', gender: 'female', dateOfBirth: '1965-07-04', occupation: 'Retired' }
  ]
};

function pad3(value) {
  return String(value).padStart(3, '0');
}

function toDateOnly(text) {
  return new Date(`${text}T00:00:00.000Z`);
}

function deterministicName(index) {
  const f = FAMILY_NAMES[index % FAMILY_NAMES.length];
  const m = MIDDLE_NAMES[(index + 3) % MIDDLE_NAMES.length];
  const g = GIVEN_NAMES[index % GIVEN_NAMES.length];
  return `${f} ${m} ${g}`;
}

function deterministicPhone(index, offset = 0) {
  return `09${String(10000000 + index + offset).padStart(8, '0')}`;
}

function clampDate(value, minDate, maxDate) {
  if (value < minDate) return new Date(minDate);
  if (value > maxDate) return new Date(maxDate);
  return value;
}

function yearsOfService(startDate, referenceDate = REFERENCE_DATE) {
  let years = referenceDate.getUTCFullYear() - startDate.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - startDate.getUTCMonth();
  const dayDiff = referenceDate.getUTCDate() - startDate.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
  return years;
}

function classifySeniority(startDate) {
  const years = yearsOfService(startDate);
  if (years >= 10) return 'ten_years';
  if (years >= 5) return 'five_years';
  if (years >= 3) return 'three_years';
  if (years < 1) return 'new_joiner';
  return 'other';
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

function createStartDateByBand(band, indexInBand) {
  if (band === 'ten_years') {
    return addDays(new Date('2015-01-15T00:00:00.000Z'), indexInBand * 40);
  }
  if (band === 'five_years') {
    return addDays(new Date('2020-01-10T00:00:00.000Z'), indexInBand * 26);
  }
  if (band === 'three_years') {
    return addDays(new Date('2022-01-10T00:00:00.000Z'), indexInBand * 28);
  }
  return addDays(new Date('2025-06-10T00:00:00.000Z'), indexInBand * 25);
}

function baseSalaryFromGradeCode(gradeCode) {
  if (gradeCode === 'A') return 30000000;
  if (gradeCode === 'B') return 25000000;
  if (gradeCode === 'C') return 20000000;
  if (gradeCode === 'D') return 15000000;
  if (gradeCode === 'E') return 12000000;
  return 9000000;
}

function buildEmployeeProfiles() {
  const profiles = [];
  let tenIdx = 0;
  let fiveIdx = 0;
  let threeIdx = 0;
  let newIdx = 0;

  for (let i = 1; i <= REQUIRED_COUNTS.totalEmployees; i += 1) {
    let seniorityBand;
    let indexInBand;
    if (i <= 10) {
      seniorityBand = 'ten_years';
      indexInBand = tenIdx;
      tenIdx += 1;
    } else if (i <= 25) {
      seniorityBand = 'five_years';
      indexInBand = fiveIdx;
      fiveIdx += 1;
    } else if (i <= 40) {
      seniorityBand = 'three_years';
      indexInBand = threeIdx;
      threeIdx += 1;
    } else {
      seniorityBand = 'new_joiner';
      indexInBand = newIdx;
      newIdx += 1;
    }

    const startDate = createStartDateByBand(seniorityBand, indexInBand);
    const code = `EMP${pad3(i)}`;
    const dept = (i - 1) % 5;
    const jobTitleCode = i <= TITLE_CODES_FOR_FIRST_30.length ? TITLE_CODES_FOR_FIRST_30[i - 1] : null;

    let salaryGradeCode = 'F';
    if (seniorityBand === 'ten_years') salaryGradeCode = ['A', 'A', 'B', 'B', 'B', 'B', 'C', 'C', 'C', 'C'][indexInBand];
    if (seniorityBand === 'five_years') salaryGradeCode = ['B', 'B', 'C', 'C', 'C', 'C', 'D', 'D', 'C', 'D', 'D', 'D', 'C', 'D', 'D'][indexInBand];
    if (seniorityBand === 'three_years') salaryGradeCode = ['C', 'D', 'D', 'D', 'E', 'E', 'D', 'E', 'E', 'D', 'E', 'E', 'D', 'E', 'E'][indexInBand];
    if (seniorityBand === 'new_joiner') salaryGradeCode = ['E', 'F', 'F', 'E', 'F', 'F', 'E', 'F', 'F', 'F'][indexInBand];

    let contractType = '1_year';
    if (seniorityBand === 'ten_years') contractType = ['indefinite', 'indefinite', 'indefinite', '3_year', 'indefinite', '3_year', '3_year', '1_year', '1_year', '1_year'][indexInBand];
    if (seniorityBand === 'five_years') contractType = ['3_year', '3_year', '3_year', '1_year', '3_year', '1_year', '1_year', '3_year', '1_year', '1_year', '1_year', '1_year', '1_year', '1_year', '1_year'][indexInBand];
    if (seniorityBand === 'new_joiner') contractType = 'probation';

    profiles.push({
      index: i,
      employeeCode: code,
      name: deterministicName(i),
      gender: i % 2 === 0 ? 'female' : 'male',
      dept,
      startDate,
      seniorityBand,
      jobTitleCode,
      salaryGradeCode,
      contractType,
      dependents: DEPENDENT_INDEX_MAP[i] || [],
      hasOvertime: dept === 0 || dept === 1 || ['TP', 'PTP', 'NVC'].includes(jobTitleCode || ''),
      hasBusinessTrip: dept === 0 || dept === 1 || ['TP', 'PTP'].includes(jobTitleCode || ''),
      hasSalaryAdvance: seniorityBand !== 'new_joiner' && (seniorityBand === 'ten_years' || i % 3 === 0)
    });
  }

  return profiles;
}

function validateEmployeeProfiles(profiles) {
  if (profiles.length !== REQUIRED_COUNTS.totalEmployees) {
    throw new Error(`Expected ${REQUIRED_COUNTS.totalEmployees} employees, got ${profiles.length}`);
  }

  const codes = new Set();
  const seniorityCount = { ten_years: 0, five_years: 0, three_years: 0, new_joiner: 0, other: 0 };
  let withTitle = 0;
  let withoutTitle = 0;
  let depEmployees = 0;

  for (let i = 0; i < profiles.length; i += 1) {
    const p = profiles[i];
    const expectedCode = `EMP${pad3(i + 1)}`;
    if (p.employeeCode !== expectedCode) throw new Error(`employeeCode mismatch at ${i + 1}`);
    if (codes.has(p.employeeCode)) throw new Error(`Duplicate employeeCode ${p.employeeCode}`);
    codes.add(p.employeeCode);

    const band = classifySeniority(p.startDate);
    seniorityCount[band] += 1;
    if (p.jobTitleCode) withTitle += 1;
    else withoutTitle += 1;
    if (p.dependents.length > 0) depEmployees += 1;
  }

  if (withTitle !== REQUIRED_COUNTS.withJobTitle || withoutTitle !== REQUIRED_COUNTS.withoutJobTitle) {
    throw new Error(`Job title distribution mismatch: with=${withTitle}, without=${withoutTitle}`);
  }
  if (depEmployees !== REQUIRED_COUNTS.dependentEmployees) {
    throw new Error(`Dependent employee count mismatch: ${depEmployees}`);
  }
  for (const [band, count] of Object.entries(REQUIRED_COUNTS.seniority)) {
    if (seniorityCount[band] !== count) throw new Error(`Seniority ${band} mismatch: ${seniorityCount[band]}`);
  }
}

async function seedDB() {
  try {
    console.log('Starting comprehensive deterministic seed...\n');
    
    // Drop all tables and enum types first
    console.log('Step 1: Dropping existing tables and enum types...');
    
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
      console.log('Done: all tables and enum types dropped\n');
    } catch (err) {
      console.log('Warning: error dropping tables (may not exist):', err.message);
      console.log('Cleanup attempted\n');
    }
    
    // Create enum types before syncing (like in migrations)
    console.log('Step 2: Creating enum types...');
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
    console.log('Done: enum types created\n');
    
    // Ensure all models are loaded before syncing
    console.log('Step 3: Loading all models...');
    void User && void Department && void JobTitle && void SalaryGrade && void SalaryRule && void Salary;
    void AttendanceLog && void LeaveRequest && void Document && void OvertimeRequest && void BusinessTripRequest;
    void SalaryAdvance && void Dependent && void Qualification && void WorkExperience && void ShiftSetting && void InsuranceConfig && void ApprovalWorkflow;
    console.log('Done: all models loaded\n');
    
    // Instead of using sync, let's try a workaround: check if tables exist first
    console.log('Step 4: Creating tables (using workaround)...');
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
          console.log('Done: database synced\n');
        } catch (syncErr) {
          if (syncErr.message.includes('USING')) {
            console.log('Warning: sync failed with USING error, continuing...');
            console.log('   This might be a Sequelize enum type handling issue.');
            console.log('   Trying to continue with data seeding...\n');
            // Continue anyway - tables might have been partially created
          } else {
            throw syncErr;
          }
        }
      } else {
        console.log('Tables already exist, skipping sync\n');
      }
    } catch (err) {
      console.log('Warning: error during sync:', err.message);
      console.log('   Attempting to continue...\n');
    }

    // Create Insurance Config
    console.log('Step 5: Creating insurance configuration...');
    await InsuranceConfig.create({
      name: 'Social Insurance 2025',
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
      description: 'Insurance configuration based on 2025 policy'
    });
    console.log('Done: insurance configuration created\n');

    // Create Shift Settings
    console.log('Step 6: Creating shift settings...');
    await ShiftSetting.create({
      name: 'Office Shift',
      startTime: '08:00',
      endTime: '17:00',
      gracePeriodMinutes: 10,
      overtimeThresholdMinutes: 30,
      active: true
    });
    console.log('Done: shift settings created\n');

    // Create Departments
    console.log('Step 7: Creating departments...');
    const depts = await Department.bulkCreate([
      { code: 'KT', name: 'Engineering' },
      { code: 'KB', name: 'Business' },
      { code: 'NS', name: 'Human Resources' },
      { code: 'ACC', name: 'Accounting' },
      { code: 'HC', name: 'Administration' }
    ]);
    console.log(`Done: created ${depts.length} departments\n`);

    // Create Job Titles
    console.log('Step 8: Creating job titles...');
    const titles = await JobTitle.bulkCreate([
      { code: 'TP', name: 'Department Head' },
      { code: 'PTP', name: 'Deputy Head' },
      { code: 'NVC', name: 'Senior Staff' },
      { code: 'NV', name: 'Staff' },
      { code: 'TTS', name: 'Intern' }
    ]);
    console.log(`Done: created ${titles.length} job titles\n`);

    // Create Salary Grades
    console.log('Step 9: Creating salary grades...');
    const grades = await SalaryGrade.bulkCreate([
      { code: 'A', name: 'Grade A', level: 1, baseSalary: 25000000, minYearsOfService: 10 },
      { code: 'B', name: 'Grade B', level: 2, baseSalary: 20000000, minYearsOfService: 8  },
      { code: 'C', name: 'Grade C', level: 3, baseSalary: 15000000, minYearsOfService: 5  },
      { code: 'D', name: 'Grade D', level: 4, baseSalary: 12000000, minYearsOfService: 3  },
      { code: 'E', name: 'Grade E', level: 5, baseSalary: 10000000, minYearsOfService: 1  },
      { code: 'F', name: 'Grade F', level: 6, baseSalary: 8000000,  minYearsOfService: 0  }
    ]);
    console.log(`Done: created ${grades.length} salary grades\n`);

    // Create Salary Rules
    console.log('Step 10: Creating salary rules...');
    await SalaryRule.bulkCreate([
      { name: 'Attendance bonus', type: 'bonus', triggerType: 'full_attendance', amount: 3, amountType: 'percentage' },
      { name: 'Overtime bonus', type: 'bonus', triggerType: 'overtime', amount: 500000, amountType: 'fixed' },
      { name: 'Performance bonus', type: 'bonus', triggerType: 'custom', amount: 5, amountType: 'percentage' },
      { name: 'Seniority bonus', type: 'bonus', triggerType: 'custom', amount: 2, amountType: 'percentage' },
      { name: 'Technical allowance', type: 'bonus', triggerType: 'custom', amount: 1000000, amountType: 'fixed' },
      { name: 'Management allowance', type: 'bonus', triggerType: 'custom', amount: 10, amountType: 'percentage' },
      { name: 'Late penalty', type: 'deduction', triggerType: 'late', amount: 500000, amountType: 'fixed' },
      { name: 'Absence penalty', type: 'deduction', triggerType: 'absent', amount: 1000000, amountType: 'fixed' },
      { name: 'Early leave penalty', type: 'deduction', triggerType: 'early_leave', amount: 300000, amountType: 'fixed' }
    ]);
    console.log('Done: salary rules created\n');

    // Create Admin and Accountant
    console.log('Step 11: Creating admin and accountant accounts...');
    const admin = await User.create({
      employeeCode: 'ADM001',
      name: 'Tran Van Admin',
      email: 'admin@company.com',
      password: await bcrypt.hash('Admin@12345', 10),
      phone: '0900000001',
      phoneNumber: '0900000001',
      gender: 'male',
      role: 'admin',
      isActive: true,
      baseSalary: 30000000,
      departmentId: depts[3].id, // Accounting
      jobTitleId: titles[0].id, // Department Head
      salaryGradeId: grades[0].id, // Grade A
      startDate: new Date('2020-01-01'),
      contractType: 'indefinite',
      employmentStatus: 'active',
      insuranceBaseSalary: 30000000
    });

    const accountant = await User.create({
      employeeCode: 'ACC001',
      name: 'Nguyen Thi Ke Toan',
      email: 'accountant@company.com',
      password: await bcrypt.hash('Accountant@12345', 10),
      phone: '0900000002',
      phoneNumber: '0900000002',
      gender: 'female',
      role: 'accountant',
      isActive: true,
      baseSalary: 20000000,
      departmentId: depts[3].id, // Accounting
      jobTitleId: titles[1].id, // Deputy Head
      salaryGradeId: grades[1].id, // Grade B
      startDate: new Date('2021-06-01'),
      contractType: '3_year',
      employmentStatus: 'active',
      managerId: admin.id,
      insuranceBaseSalary: 20000000
    });
    console.log('Done: admin and accountant created\n');

    // Create deterministic employee and non-random profile data
    console.log('10. Creating deterministic employee profiles...');
    const employees = [];
    const employeeProfiles = buildEmployeeProfiles();
    validateEmployeeProfiles(employeeProfiles);

    const now = new Date(REFERENCE_DATE);
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();

    const titleCodeToIndex = { TP: 0, PTP: 1, NVC: 2, NV: 3, TTS: 4 };
    const gradeCodeToIndex = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };

    for (const p of employeeProfiles) {
      const i = p.index;
      const baseSalary = baseSalaryFromGradeCode(p.salaryGradeCode) + ((i % 4) * 150000);
      const titleAllowance = p.jobTitleCode === 'TP' ? 3000000 : p.jobTitleCode === 'PTP' ? 1800000 : p.jobTitleCode === 'NVC' ? 800000 : 0;
      const transportAllowance = p.dept === 0 || p.dept === 1 ? 650000 : 350000;
      const phoneAllowance = p.jobTitleCode ? 300000 : 150000;
      const startDate = new Date(p.startDate);
      const dateOfBirth = new Date(Date.UTC(
        (p.seniorityBand === 'ten_years' ? 1984 : p.seniorityBand === 'five_years' ? 1987 : p.seniorityBand === 'three_years' ? 1990 : 1998) + (i % 8),
        i % 12,
        ((i * 3) % 27) + 1
      ));

      const employee = await User.create({
        employeeCode: p.employeeCode,
        name: p.name,
        email: `emp${pad3(i)}@company.com`,
        companyEmail: `emp${pad3(i)}@company.com`,
        personalEmail: `${p.employeeCode.toLowerCase()}@gmail.com`,
        password: await bcrypt.hash('Password123!', 10),
        phoneNumber: deterministicPhone(i),
        gender: p.gender,
        dateOfBirth,
        departmentId: depts[p.dept].id,
        jobTitleId: p.jobTitleCode ? titles[titleCodeToIndex[p.jobTitleCode]].id : null,
        salaryGradeId: grades[gradeCodeToIndex[p.salaryGradeCode]].id,
        startDate,
        probationStartDate: p.contractType === 'probation' ? startDate : null,
        probationEndDate: p.contractType === 'probation' ? addDays(startDate, 60) : null,
        contractType: p.contractType,
        employmentStatus: 'active',
        baseSalary,
        insuranceBaseSalary: baseSalary,
        role: 'employee',
        isActive: true,
        address: `${100 + i} ${STREETS[i % STREETS.length]}, ${DISTRICTS[i % DISTRICTS.length]}`,
        permanentAddress: `Area ${i}, ${PROVINCES[i % PROVINCES.length]}`,
        temporaryAddress: `Apartment ${i}, ${DISTRICTS[(i + 1) % DISTRICTS.length]}`,
        bankAccount: `9704${String(10000000 + i)}`,
        bankName: BANKS[i % BANKS.length],
        bankBranch: `${BANKS[i % BANKS.length]} Branch ${i % 5 + 1}`,
        taxCode: `84${String(10000000 + i)}`,
        socialInsuranceNumber: `BH${String(1000000000 + i)}`,
        healthInsuranceProvider: ['Cho Ray Hospital', 'Bach Mai Hospital', 'Da Nang Hospital', 'Trung Vuong Hospital', 'Hospital 115'][i % 5],
        dependentCount: p.dependents.length,
        idNumber: `079${String(100000000 + i)}`,
        idIssueDate: new Date(Date.UTC(2012 + (i % 10), i % 12, ((i * 2) % 27) + 1)),
        idIssuePlace: ID_ISSUE_PLACES[i % ID_ISSUE_PLACES.length],
        educationLevel: p.seniorityBand === 'new_joiner' ? 'college' : (p.seniorityBand === 'three_years' ? 'college' : 'university'),
        major: ['Information Technology', 'Business Administration', 'Human Resource Management', 'Accounting', 'Office Administration'][p.dept],
        branchName: ['Ho Chi Minh City - Head Office', 'Ha Noi - Representative Office', 'Da Nang - HR Office', 'Ho Chi Minh City - Finance Center', 'Can Tho - Administration Office'][p.dept],
        lunchAllowance: 730000,
        transportAllowance,
        phoneAllowance,
        responsibilityAllowance: titleAllowance,
        emergencyContactName: deterministicName(i + 7),
        emergencyContactRelationship: 'Relative',
        emergencyContactPhone: deterministicPhone(i, 5000000)
      });
      employees.push(employee);
    }

    for (let i = 0; i < employees.length; i += 1) {
      const employee = employees[i];
      let managerId = admin.id;
      if (i >= PRIMARY_MANAGER_CODES.length) {
        const managerCode = PRIMARY_MANAGER_CODES[(i - PRIMARY_MANAGER_CODES.length) % PRIMARY_MANAGER_CODES.length];
        const manager = employees.find((emp) => emp.employeeCode === managerCode);
        managerId = manager ? manager.id : admin.id;
      }
      await employee.update({ managerId });
    }
    console.log(`   Created ${employees.length} employees`);

    // Create Dependents (deterministic)
    console.log('11. Creating deterministic dependents...');
    let depCount = 0;
    for (let i = 0; i < employeeProfiles.length; i += 1) {
      const profile = employeeProfiles[i];
      const emp = employees[i];
      for (let j = 0; j < profile.dependents.length; j += 1) {
        const dep = profile.dependents[j];
        await Dependent.create({
          fullName: dep.fullName,
          relationship: dep.relationship,
          dateOfBirth: toDateOnly(dep.dateOfBirth),
          gender: dep.gender,
          userId: emp.id,
          idNumber: `DEP-${profile.employeeCode}-${j + 1}`,
          address: emp.permanentAddress,
          phoneNumber: deterministicPhone(i + j + 1, 7000000),
          email: `${profile.employeeCode.toLowerCase()}-${j + 1}@family.local`,
          occupation: dep.occupation,
          approvalStatus: 'approved',
          approvedBy: admin.id,
          approvedAt: addDays(emp.startDate, 30),
          isDependent: true
        });
        depCount += 1;
      }
    }
    console.log(`   Created ${depCount} dependents`);

    // Create Work Experiences (deterministic)
    console.log('12. Creating deterministic work experiences...');
    let workExpCount = 0;
    const minExperienceStart = new Date('2008-01-01T00:00:00.000Z');
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];

      const experienceCount = profile.seniorityBand === 'ten_years' ? 3
        : profile.seniorityBand === 'five_years' ? 2
          : profile.seniorityBand === 'three_years' ? 1
            : (i % 2 === 0 ? 1 : 0);
      if (experienceCount === 0) continue;

      let anchorDate = new Date(emp.startDate);
      const latestLevel = profile.seniorityBand === 'ten_years' ? 3
        : profile.seniorityBand === 'five_years' ? 2
          : profile.seniorityBand === 'three_years' ? 1
            : 0;
      const companies = EXPERIENCE_COMPANIES_BY_DEPT[profile.dept];
      const positions = EXPERIENCE_POSITIONS_BY_DEPT[profile.dept];

      for (let j = 0; j < experienceCount; j += 1) {
        const gapDays = 20 + ((i + (j * 7)) % 35);
        const endDate = addDays(anchorDate, -gapDays);

        const baseMonths = profile.seniorityBand === 'ten_years' ? 26
          : profile.seniorityBand === 'five_years' ? 20
            : profile.seniorityBand === 'three_years' ? 16
              : 10;
        const durationMonths = baseMonths + ((i + j) % 18);
        let startDate = addDays(endDate, -(durationMonths * 30));
        if (startDate < minExperienceStart) startDate = new Date(minExperienceStart);
        if (startDate >= endDate) startDate = addDays(endDate, -30);

        const positionIndex = Math.max(0, Math.min(positions.length - 1, latestLevel - j));
        const companyName = companies[(i + j) % companies.length];
        const position = positions[positionIndex];
        const achievementRate = 8 + ((i + j) % 17);

        await WorkExperience.create({
          userId: emp.id,
          companyName,
          position,
          startDate,
          endDate,
          description: `${position} in ${depts[profile.dept].name} functions.`,
          responsibilities: `Handled core department tasks, supported cross-team projects, and maintained weekly KPI reporting.`,
          achievements: `Improved process efficiency by ${achievementRate}% and delivered milestones on schedule.`,
          isCurrent: false
        });

        workExpCount += 1;
        anchorDate = new Date(startDate);
      }
    }
    console.log(`   Created ${workExpCount} work experience records`);

    // Create Qualifications (deterministic)
    console.log('13. Creating deterministic qualifications...');
    let qualCount = 0;
    const qualificationCountByUserId = new Map();
    const baseQualificationByDept = [
      { type: 'degree', name: 'Bachelor of Information Technology' },
      { type: 'degree', name: 'Bachelor of Business Administration' },
      { type: 'degree', name: 'Bachelor of Human Resource Management' },
      { type: 'degree', name: 'Bachelor of Accounting' },
      { type: 'degree', name: 'Bachelor of Office Administration' }
    ];
    const advancedQualificationByDept = [
      [{ type: 'certificate', name: 'AWS Cloud Practitioner' }, { type: 'certificate', name: 'Google Associate Cloud Engineer' }],
      [{ type: 'training', name: 'Sales Channel Management Training' }, { type: 'certificate', name: 'Digital Marketing Certificate' }],
      [{ type: 'training', name: 'Compensation and Benefits Training' }, { type: 'certificate', name: 'Basic Labor Law Certificate' }],
      [{ type: 'certificate', name: 'General Accounting Certificate' }, { type: 'certificate', name: 'Corporate Finance Certificate' }],
      [{ type: 'training', name: 'Administrative Operations Training' }, { type: 'certificate', name: 'Office Management Certificate' }]
    ];

    for (let i = 0; i < employeeProfiles.length; i += 1) {
      const profile = employeeProfiles[i];
      const emp = employees[i];
      const baseQual = baseQualificationByDept[profile.dept];
      const advancedQual = advancedQualificationByDept[profile.dept][i % 2];
      const needsAdvanced = profile.jobTitleCode !== null || profile.seniorityBand === 'ten_years' || profile.seniorityBand === 'five_years';
      const qualTemplates = needsAdvanced ? [baseQual, advancedQual] : [baseQual];
      qualificationCountByUserId.set(emp.id, qualTemplates.length);

      for (let q = 0; q < qualTemplates.length; q += 1) {
        const tpl = qualTemplates[q];
        const issuedDateBase = q === 0 ? addDays(emp.startDate, -(365 * (1 + (i % 3)))) : addDays(emp.startDate, 120 + (i % 90));
        const issuedDate = clampDate(issuedDateBase, new Date('2010-01-01T00:00:00.000Z'), addDays(REFERENCE_DATE, -7));
        const expiryDate = tpl.type === 'certificate' ? addDays(issuedDate, 365 * 3) : null;
        await Qualification.create({
          name: tpl.name,
          type: tpl.type,
          issuedBy: 'Accredited Training Institute',
          issuedDate,
          expiryDate,
          certificateNumber: `CERT-${emp.employeeCode}-${q + 1}`,
          documentPath: `/uploads/qualifications/${emp.employeeCode}_${q + 1}.pdf`,
          description: `Qualification ${q + 1} for ${emp.employeeCode}`,
          approvalStatus: 'approved',
          approvedBy: admin.id,
          approvedAt: addDays(issuedDate, 10),
          userId: emp.id
        });
        qualCount += 1;
      }
    }
    console.log(`   Created ${qualCount} qualifications`);

    // Create Documents (deterministic)
    console.log('14. Creating deterministic documents...');
    let docCount = 0;
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];

      await Document.create({
        userId: emp.id,
        documentType: 'id_card',
        title: 'Citizen Identification Card',
        documentPath: `/uploads/documents/cccd_${emp.employeeCode}.pdf`,
        fileName: `CCCD_${emp.employeeCode}.pdf`,
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadDate: emp.startDate,
        expiryDate: addDays(emp.idIssueDate || emp.startDate, 365 * 15),
        description: 'ID card document',
        isActive: true,
        uploadedBy: admin.id
      });
      docCount += 1;

      const contractExpiry = profile.contractType === '1_year' ? addDays(emp.startDate, 365)
        : profile.contractType === '3_year' ? addDays(emp.startDate, 365 * 3)
          : profile.contractType === 'probation' ? addDays(emp.startDate, 60)
            : null;

      await Document.create({
        userId: emp.id,
        documentType: 'contract',
        title: `Employment Contract ${profile.contractType}`,
        documentPath: `/uploads/documents/contract_${emp.employeeCode}.pdf`,
        fileName: `HDLD_${emp.employeeCode}.pdf`,
        fileSize: 2048000,
        mimeType: 'application/pdf',
        uploadDate: emp.startDate,
        expiryDate: contractExpiry,
        description: 'Labor contract',
        isActive: true,
        uploadedBy: admin.id
      });
      docCount += 1;

      if ((qualificationCountByUserId.get(emp.id) || 0) > 1) {
        const certUploadDate = clampDate(addDays(emp.startDate, 200 + (i % 60)), emp.startDate, REFERENCE_DATE);
        await Document.create({
          userId: emp.id,
          documentType: 'certificate',
          title: 'Degrees and Certificates',
          documentPath: `/uploads/documents/cert_${emp.employeeCode}.pdf`,
          fileName: `CERT_${emp.employeeCode}.pdf`,
          fileSize: 1536000,
          mimeType: 'application/pdf',
          uploadDate: certUploadDate,
          expiryDate: null,
          description: 'Qualification supporting document',
          isActive: true,
          uploadedBy: admin.id
        });
        docCount += 1;
      }
    }
    console.log(`   Created ${docCount} documents`);

    // Create Attendance Logs (deterministic)
    console.log('15. Creating deterministic attendance logs...');
    let attCount = 0;
    const attendanceRows = [];
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];
      const effectiveStart = emp.startDate > PERIOD_START ? emp.startDate : PERIOD_START;

      for (let date = new Date(effectiveStart); date <= REFERENCE_DATE; date = addDays(date, 1)) {
        const dayOfWeek = date.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const serial = Math.floor((date - PERIOD_START) / (24 * 60 * 60 * 1000));
        const isAbsent = (i + serial) % 17 === 0 || (profile.seniorityBand === 'new_joiner' && (i + serial) % 23 === 0);
        if (isAbsent) continue;

        const isLate = (i + serial) % 14 === 0;
        const hasOvertime = profile.hasOvertime && (i + serial) % 9 === 0;
        const isEarlyLeave = !hasOvertime && (i + serial) % 21 === 0;

        const inHour = isLate ? 8 : 7;
        const inMin = isLate ? 10 + ((i + serial) % 30) : 35 + ((i + serial) % 20);
        let outHour = 17;
        let outMin = 5 + ((i + serial) % 40);
        if (isEarlyLeave) {
          outHour = 16;
          outMin = 10 + ((i + serial) % 30);
        }
        if (hasOvertime) {
          outHour = 18 + ((i + serial) % 2);
          outMin = 10 + ((i + serial) % 45);
        }

        // VN timezone is UTC+7 — store timestamps in true UTC (subtract 7h)
        // e.g. 07:35 VN local = 00:35 UTC
        const inUTCHour  = inHour  - 7;  // 0 or 1
        const outUTCHour = outHour - 7;  // 9, 10, 11

        attendanceRows.push({
          userId: emp.id,
          detectedName: emp.name,
          confidence: Number((0.9 + ((i + serial) % 8) * 0.01).toFixed(2)),
          matchDistance: Number((0.05 + ((i + serial) % 10) * 0.01).toFixed(2)),
          type: 'IN',
          isLate,
          isEarlyLeave: false,
          isOvertime: false,
          deviceId: 'MAIN_ENTRANCE',
          timestamp: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), inUTCHour, inMin))
        });

        attendanceRows.push({
          userId: emp.id,
          detectedName: emp.name,
          confidence: Number((0.91 + ((i + serial) % 7) * 0.01).toFixed(2)),
          matchDistance: Number((0.06 + ((i + serial) % 9) * 0.01).toFixed(2)),
          type: 'OUT',
          isLate: false,
          isEarlyLeave,
          isOvertime: hasOvertime,
          deviceId: 'MAIN_ENTRANCE',
          timestamp: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), outUTCHour, outMin))
        });

        if (attendanceRows.length >= 1000) {
          await AttendanceLog.bulkCreate(attendanceRows.splice(0, 1000));
        }
      }
    }
    if (attendanceRows.length > 0) {
      await AttendanceLog.bulkCreate(attendanceRows);
    }
    attCount = await AttendanceLog.count();
    console.log(`   Created ${attCount} attendance logs`);

    // Create Leave Requests (deterministic)
    console.log('16. Creating deterministic leave requests...');
    let leaveCount = 0;
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];
      const numLeaves = profile.seniorityBand === 'ten_years' || profile.seniorityBand === 'five_years' ? 3 : profile.seniorityBand === 'three_years' ? 2 : 1;
      const baseStart = clampDate(addDays(emp.startDate, 40 + (i % 20)), emp.startDate, addDays(REFERENCE_DATE, -10));

      for (let j = 0; j < numLeaves; j += 1) {
        let start = addDays(baseStart, j * 75 + (i % 11));
        start = clampDate(start, emp.startDate, addDays(REFERENCE_DATE, -6));
        const daysCount = 1 + ((i + j) % 3);
        let end = addDays(start, daysCount - 1);
        if (end > REFERENCE_DATE) end = REFERENCE_DATE;
        const status = STATUS_CYCLE[(i + j) % STATUS_CYCLE.length];

        await LeaveRequest.create({
          userId: emp.id,
          type: LEAVE_TYPES[(i + j) % LEAVE_TYPES.length],
          startDate: start,
          endDate: end,
          days: daysCount,
          reason: `Leave request ${j + 1} for ${emp.employeeCode}`,
          status,
          approvedBy: status === 'approved' ? admin.id : null,
          approvedAt: status === 'approved' ? addDays(start, 1) : null,
          rejectionReason: status === 'rejected' ? 'Business workload requirement' : null
        });
        leaveCount += 1;
      }
    }
    console.log(`   Created ${leaveCount} leave requests`);

    // Create Overtime Requests (deterministic)
    console.log('17. Creating deterministic overtime requests...');
    let otCount = 0;
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];
      if (!profile.hasOvertime) continue;
      const numOT = profile.seniorityBand === 'ten_years' ? 2 : (i % 2 === 0 ? 2 : 1);
      const baseDate = clampDate(addDays(emp.startDate, 90 + (i % 30)), new Date('2025-03-01T00:00:00.000Z'), addDays(REFERENCE_DATE, -20));

      for (let j = 0; j < numOT; j += 1) {
        const date = clampDate(addDays(baseDate, j * 60), emp.startDate, addDays(REFERENCE_DATE, -5));
        const startHour = (i + j) % 2 === 0 ? 17 : 18;
        const startMin = (i + j) % 2 === 0 ? 30 : 0;
        const totalHours = Number((2 + ((i + j) % 4) * 0.5).toFixed(2));
        let endHour = startHour + Math.floor(totalHours);
        let endMin = startMin + (totalHours % 1 === 0.5 ? 30 : 0);
        if (endMin >= 60) {
          endHour += 1;
          endMin -= 60;
        }
        const status = STATUS_CYCLE[(i + j + 1) % STATUS_CYCLE.length];

        await OvertimeRequest.create({
          userId: emp.id,
          date,
          startTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
          endTime: `${String(endHour).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`,
          totalHours,
          reason: 'Support project deadline',
          projectName: `Project-${(i % 8) + 1}`,
          approvalStatus: status,
          approvedBy: status === 'approved' ? admin.id : null,
          approvedAt: status === 'approved' ? addDays(date, 1) : null,
          rejectionReason: status === 'rejected' ? 'Not aligned with workload plan' : null,
          approvalLevel: 1,
          currentApproverId: status === 'pending' ? admin.id : null
        });
        otCount += 1;
      }
    }
    console.log(`   Created ${otCount} overtime requests`);

    // Create Business Trip Requests (deterministic)
    console.log('18. Creating deterministic business trip requests...');
    let tripCount = 0;
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];
      if (!profile.hasBusinessTrip) continue;
      const numTrips = (profile.dept === 0 || profile.dept === 1) && profile.seniorityBand !== 'new_joiner' ? 2 : (i % 2 === 0 ? 1 : 0);
      if (numTrips === 0) continue;

      const baseDate = clampDate(addDays(emp.startDate, 120 + (i % 45)), new Date('2025-02-01T00:00:00.000Z'), addDays(REFERENCE_DATE, -30));
      for (let j = 0; j < numTrips; j += 1) {
        const startDate = clampDate(addDays(baseDate, j * 70), emp.startDate, addDays(REFERENCE_DATE, -8));
        const duration = 1 + ((i + j) % 4);
        let endDate = addDays(startDate, duration - 1);
        if (endDate > REFERENCE_DATE) endDate = REFERENCE_DATE;
        const status = STATUS_CYCLE[(i + j + 2) % STATUS_CYCLE.length];

        await BusinessTripRequest.create({
          userId: emp.id,
          startDate,
          endDate,
          destination: DESTINATIONS[(i + j) % DESTINATIONS.length],
          purpose: `Business trip ${j + 1}`,
          estimatedCost: 2500000 + ((i + j) % 6) * 650000,
          transportType: TRANSPORT_TYPES[(i + j) % TRANSPORT_TYPES.length],
          accommodation: '3-star hotel',
          approvalStatus: status,
          approvedBy: status === 'approved' ? admin.id : null,
          approvedAt: status === 'approved' ? addDays(startDate, 1) : null,
          rejectionReason: status === 'rejected' ? 'Budget limit reached' : null,
          approvalLevel: 1,
          currentApproverId: status === 'pending' ? admin.id : null
        });
        tripCount += 1;
      }
    }
    console.log(`   Created ${tripCount} business trip requests`);

    // Create Salary Advances (deterministic)
    console.log('19. Creating deterministic salary advances...');
    let advanceCount = 0;
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];
      if (!profile.hasSalaryAdvance) continue;

      const periods = [
        { year: 2025, month: (i % 12) + 1 },
        { year: 2025, month: ((i + 5) % 12) + 1 },
        { year: 2026, month: (i % 2) + 1 }
      ];
      const count = profile.seniorityBand === 'ten_years' ? 2 : 1;
      const used = new Set();

      for (let j = 0; j < periods.length && used.size < count; j += 1) {
        const period = periods[j];
        const key = `${period.year}-${period.month}`;
        if (used.has(key)) continue;
        used.add(key);

        const status = STATUS_CYCLE[(i + j + 1) % STATUS_CYCLE.length];
        const ratio = [0.25, 0.30, 0.35][(i + j) % 3];
        const amount = Math.round(Number(emp.baseSalary) * ratio);
        const requestDate = new Date(Date.UTC(period.year, period.month - 1, 15));

        await SalaryAdvance.create({
          userId: emp.id,
          month: period.month,
          year: period.year,
          amount,
          reason: `Salary advance ${period.month}/${period.year}`,
          requestDate,
          approvalStatus: status,
          approvedBy: status === 'approved' ? accountant.id : null,
          approvedAt: status === 'approved' ? addDays(requestDate, 1) : null,
          rejectionReason: status === 'rejected' ? 'Advance quota exceeded' : null,
          isDeducted: false
        });
        advanceCount += 1;
      }
    }
    console.log(`   Created ${advanceCount} salary advances`);

    // Create Salary Records (deterministic)
    console.log('20. Creating deterministic salary records...');
    let salCount = 0;
    const refYear = now.getUTCFullYear();
    const refMonth = now.getUTCMonth() + 1;

    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];
      const startDate = new Date(emp.startDate);

      for (let year = 2025; year <= refYear; year += 1) {
        const endMonthForYear = year === refYear ? refMonth : 12;
        for (let month = 1; month <= endMonthForYear; month += 1) {
          const monthStart = new Date(Date.UTC(year, month - 1, 1));
          const monthEnd = new Date(Date.UTC(year, month, 1));
          if (monthEnd <= startDate) continue;

          const base = Number(emp.baseSalary);
          const workingDays = getWorkingDaysInMonth(year, month);
          const attendanceDays = await AttendanceLog.count({
            where: {
              userId: emp.id,
              type: 'IN',
              timestamp: {
                [Op.gte]: monthStart,
                [Op.lt]: monthEnd
              }
            }
          });

          const absentDays = Math.max(0, workingDays - attendanceDays);
          const absentDeduction = Math.round((base / workingDays) * absentDays * 0.5);

          const performanceRate = profile.seniorityBand === 'ten_years' ? 0.12 + (i % 3) * 0.01
            : profile.seniorityBand === 'five_years' ? 0.08 + (i % 3) * 0.01
              : profile.seniorityBand === 'three_years' ? 0.06 + (i % 3) * 0.01
                : 0.04 + (i % 2) * 0.005;
          const performanceBonus = Math.round(base * performanceRate);
          const attendanceBonus = attendanceDays >= workingDays ? Math.round(base * 0.03) : (attendanceDays >= workingDays - 1 ? Math.round(base * 0.015) : 0);
          const totalBonus = performanceBonus
            + attendanceBonus
            + Number(emp.lunchAllowance || 0)
            + Number(emp.transportAllowance || 0)
            + Number(emp.phoneAllowance || 0)
            + Number(emp.responsibilityAllowance || 0);

          const advance = await SalaryAdvance.findOne({
            where: {
              userId: emp.id,
              month,
              year,
              approvalStatus: 'approved',
              isDeducted: false
            }
          });
          const advanceDeduction = advance ? Number(advance.amount) : 0;
          const insuranceBase = Number(emp.insuranceBaseSalary || base);
          const employeeInsurance = Math.round(insuranceBase * 0.105);
          const personalDeduction = 11000000 + profile.dependents.length * 4400000;
          const taxableIncome = base + totalBonus - employeeInsurance - personalDeduction;
          const tax = taxableIncome > 0 ? Math.round(taxableIncome * 0.05) : 0;
          const totalDeduction = absentDeduction + advanceDeduction + employeeInsurance + tax;
          const finalSalary = Math.max(0, Math.round(base + totalBonus - totalDeduction));

          await Salary.create({
            userId: emp.id,
            month,
            year,
            baseSalary: base,
            bonus: totalBonus,
            deduction: totalDeduction,
            finalSalary,
            status: year === refYear && month === refMonth ? 'pending' : 'paid',
            notes: `Salary ${month}/${year}. Attendance ${attendanceDays}/${workingDays}`
          });
          salCount += 1;

          if (advance) {
            await advance.update({ isDeducted: true, deductedAt: new Date(Date.UTC(year, month - 1, 28)) });
          }
        }
      }
    }
    console.log(`   Created ${salCount} salary records`);

    // Post-seed validation
    console.log('21. Validating seeded data...');
    const employeeCount = await User.count({ where: { role: 'employee' } });
    if (employeeCount !== REQUIRED_COUNTS.totalEmployees) {
      throw new Error(`Employee count mismatch: expected ${REQUIRED_COUNTS.totalEmployees}, got ${employeeCount}`);
    }

    const dependentEmployeeCount = await Dependent.count({ distinct: true, col: 'userId' });
    if (dependentEmployeeCount !== REQUIRED_COUNTS.dependentEmployees) {
      throw new Error(`Dependent user count mismatch: expected ${REQUIRED_COUNTS.dependentEmployees}, got ${dependentEmployeeCount}`);
    }

    const withJobTitleCount = await User.count({
      where: {
        role: 'employee',
        jobTitleId: { [Op.ne]: null }
      }
    });
    const withoutJobTitleCount = await User.count({
      where: {
        role: 'employee',
        jobTitleId: null
      }
    });
    if (withJobTitleCount !== REQUIRED_COUNTS.withJobTitle || withoutJobTitleCount !== REQUIRED_COUNTS.withoutJobTitle) {
      throw new Error(`Job title distribution mismatch: with=${withJobTitleCount}, without=${withoutJobTitleCount}`);
    }

    const seniorityActual = { ten_years: 0, five_years: 0, three_years: 0, new_joiner: 0, other: 0 };
    for (const emp of employees) {
      const band = classifySeniority(new Date(emp.startDate));
      seniorityActual[band] += 1;
    }
    for (const [band, expected] of Object.entries(REQUIRED_COUNTS.seniority)) {
      if (seniorityActual[band] !== expected) {
        throw new Error(`Seniority distribution mismatch for ${band}: expected ${expected}, got ${seniorityActual[band]}`);
      }
    }
    if (seniorityActual.other > 0) {
      throw new Error(`Unexpected seniority bucket "other": ${seniorityActual.other}`);
    }

    const duplicateAdvances = await sequelize.query(`
      SELECT "userId", month, year, COUNT(*)::int AS count
      FROM salary_advances
      GROUP BY "userId", month, year
      HAVING COUNT(*) > 1
      LIMIT 5
    `, { type: QueryTypes.SELECT });
    if (duplicateAdvances.length > 0) {
      throw new Error('Duplicate salary advance periods detected for the same user');
    }

    const duplicateSalaries = await sequelize.query(`
      SELECT "userId", month, year, COUNT(*)::int AS count
      FROM salaries
      GROUP BY "userId", month, year
      HAVING COUNT(*) > 1
      LIMIT 5
    `, { type: QueryTypes.SELECT });
    if (duplicateSalaries.length > 0) {
      throw new Error('Duplicate salary records detected for the same user and month');
    }

    const invalidAttendancePairs = await sequelize.query(`
      SELECT "userId", DATE("timestamp") AS work_date
      FROM attendance_logs
      GROUP BY "userId", DATE("timestamp")
      HAVING SUM(CASE WHEN type = 'IN' THEN 1 ELSE 0 END) <> 1
          OR SUM(CASE WHEN type = 'OUT' THEN 1 ELSE 0 END) <> 1
          OR COUNT(*) <> 2
      LIMIT 5
    `, { type: QueryTypes.SELECT });
    if (invalidAttendancePairs.length > 0) {
      throw new Error('Attendance IN/OUT pairing validation failed');
    }

    const nonEmployeeTableCounts = {
      workExperiences: await WorkExperience.count(),
      qualifications: await Qualification.count(),
      documents: await Document.count(),
      attendanceLogs: await AttendanceLog.count(),
      leaveRequests: await LeaveRequest.count(),
      overtimeRequests: await OvertimeRequest.count(),
      businessTripRequests: await BusinessTripRequest.count(),
      salaryAdvances: await SalaryAdvance.count(),
      salaries: await Salary.count()
    };
    for (const [tableName, count] of Object.entries(nonEmployeeTableCounts)) {
      if (count <= 0) {
        throw new Error(`Expected seeded data for ${tableName}, but got ${count}`);
      }
    }

    const employeeCredentials = await User.findAll({
      where: { role: 'employee' },
      attributes: ['employeeCode', 'email'],
      order: [['employeeCode', 'ASC']],
      raw: true
    });
    if (employeeCredentials.length !== REQUIRED_COUNTS.totalEmployees) {
      throw new Error('Employee credential list length mismatch');
    }
    for (let i = 1; i <= REQUIRED_COUNTS.totalEmployees; i += 1) {
      const idx = i - 1;
      const expectedCode = `EMP${pad3(i)}`;
      const expectedEmail = `emp${pad3(i)}@company.com`;
      if (employeeCredentials[idx].employeeCode !== expectedCode || employeeCredentials[idx].email !== expectedEmail) {
        throw new Error(`Employee code/email mismatch at index ${i}`);
      }
    }
    console.log('   Validation passed');

    // Summary
    console.log('\nSEED DATA GENERATION COMPLETED\n');
    console.log('Summary:');
    console.log(`   Users: ${employees.length + 2} (${employees.length} employees + 1 admin + 1 accountant)`);
    console.log(`   Departments: ${depts.length}`);
    console.log(`   Job Titles: ${titles.length}`);
    console.log(`   Salary Grades: ${grades.length}`);
    console.log(`   Dependents: ${depCount}`);
    console.log(`   Work Experiences: ${workExpCount}`);
    console.log(`   Qualifications: ${qualCount}`);
    console.log(`   Documents: ${docCount}`);
    console.log(`   Attendance Logs: ${attCount}`);
    console.log(`   Leave Requests: ${leaveCount}`);
    console.log(`   Overtime Requests: ${otCount}`);
    console.log(`   Business Trip Requests: ${tripCount}`);
    console.log(`   Salary Advances: ${advanceCount}`);
    console.log(`   Salary Records: ${salCount} (from 2025-01 to ${currentYear}-${String(currentMonth).padStart(2, '0')})`);
    console.log('\nLogin Credentials:');
    console.log('   Admin:      admin@company.com / Admin@12345');
    console.log('   Accountant: accountant@company.com / Accountant@12345');
    console.log('   Employees:  emp001@company.com to emp050@company.com / Password123!');
    console.log('\nAll employees have diverse deterministic data covering key system features.');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.errors) console.error('Details:', err.errors);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

seedDB();


