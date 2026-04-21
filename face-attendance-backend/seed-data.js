import dotenv from 'dotenv';
dotenv.config();

import sequelize from './src/db/sequelize.js';
import { QueryTypes, Op } from 'sequelize';
import {
  User, Department, JobTitle, SalaryGrade, SalaryRule, Salary,
  AttendanceLog, LeaveRequest, Document, OvertimeRequest, BusinessTripRequest,
  SalaryAdvance, Dependent, Qualification, WorkExperience, ShiftSetting, InsuranceConfig, ApprovalWorkflow, RoleChangeAudit,
  ActionAudit
} from './src/models/pg/index.js';
import bcrypt from 'bcryptjs';
import { canTransitionSalaryStatus, SALARY_STATUS } from './src/services/salaryStatusRBAC.js';
import { calculateSalaryForUser } from './src/services/salaryCalculationService.js';

// Ngày mốc demo: phải ≥ tháng lương cần tính (tránh tháng sau không có attendance → phạt vắng cả tháng khi chạy tính lương)
const REFERENCE_DATE = new Date('2026-04-30T00:00:00.000Z');
const PERIOD_START = new Date('2025-01-01T00:00:00.000Z');
/**
 * Attendance logs through end of this calendar day (UTC).
 * Covers 01/01/2025 → end of 2026 for demo; extend past REFERENCE_DATE for “present” filters.
 */
const ATTENDANCE_LOG_THROUGH = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));

const REQUIRED_COUNTS = {
  totalEmployees: 150,
  dependentEmployees: 60,
  withJobTitle: 90,
  withoutJobTitle: 60,
  seniority: {
    ten_years: 25,
    five_years: 45,
    three_years: 40,
    new_joiner: 40
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
// Approval-status cycles for self-service records that HR / supervisor must
// sign off on. Mirrors STATUS_CYCLE's 50/25/25 split but adds a second
// "pending" slot so the Dependent/Qualification approval screens always
// have something queued up for reviewers.
const DEP_STATUS_CYCLE = ['approved', 'approved', 'pending', 'approved', 'rejected', 'pending'];
const QUAL_STATUS_CYCLE = ['approved', 'pending', 'approved', 'rejected', 'approved', 'pending'];
const DEP_REJECTION_REASONS = [
  'Birth certificate copy unclear',
  'ID number mismatch with household book',
  'Relationship proof missing',
];
const QUAL_REJECTION_REASONS = [
  'Certificate authenticity to be verified',
  'Expired credential — please renew',
  'Training provider not recognised',
];
const LEAVE_TYPES = ['paid', 'personal', 'sick', 'unpaid'];
// Attendance overrides for specific employees (by 1-based index)
const ATTENDANCE_OVERRIDES = {
  18: { // EMP018 (Bui Thi Ngoc) — add late & early leave days for Feb 2026
    lateDates: ['2026-02-03', '2026-02-10'],
    earlyLeaveDates: ['2026-02-05', '2026-02-19']
  }
};
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
const TITLE_CODE_POOL = ['TP', 'PTP', 'NVC', 'NV', 'NV', 'NVC', 'NV', 'TTS', 'NV', 'NV'];

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

/**
 * Deterministic display name per employee index (1…N).
 * Avoids duplicates that occurred for index and index+50 with the old formula
 * (same i%10, (i+3)%10, i%25 because lcm(10,25)=50).
 */
function deterministicName(index) {
  const f = FAMILY_NAMES[index % FAMILY_NAMES.length];
  const m = MIDDLE_NAMES[(index + 3) % MIDDLE_NAMES.length];
  const bucket = Math.floor((index - 1) / 50);
  const g = GIVEN_NAMES[(index + bucket) % GIVEN_NAMES.length];
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

/** Seniority cohort by EMP number (1…N), matches buildEmployeeProfiles — not calendar-only tenure */
function seniorityBandFromEmployeeNumber(n) {
  if (n < 1 || n > REQUIRED_COUNTS.totalEmployees) return 'other';
  const i = n - 1;
  if (i < REQUIRED_COUNTS.seniority.ten_years) return 'ten_years';
  const afterTen = REQUIRED_COUNTS.seniority.ten_years + REQUIRED_COUNTS.seniority.five_years;
  if (i < afterTen) return 'five_years';
  const afterFive = afterTen + REQUIRED_COUNTS.seniority.three_years;
  if (i < afterFive) return 'three_years';
  return 'new_joiner';
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

/** Match attendance_logs timestamps seeded with Date.UTC(...) per calendar day */
function getWorkingDaysInMonthUTC(year, month) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(Date.UTC(year, month - 1, day));
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) workingDays += 1;
  }
  return workingDays;
}

function createStartDateByBand(band, indexInBand) {
  if (band === 'ten_years') {
    return addDays(new Date('2012-01-10T00:00:00.000Z'), indexInBand * 45);
  }
  if (band === 'five_years') {
    return addDays(new Date('2018-01-15T00:00:00.000Z'), indexInBand * 20);
  }
  if (band === 'three_years') {
    // [3,5) years at REFERENCE_DATE: after 2021-04-30 (avoid five_years) but early enough that +39*17d still ≥3y.
    return addDays(new Date('2021-06-01T00:00:00.000Z'), indexInBand * 17);
  }
  // new_joiner: stagger from 2025-01-01 so attendance exists from PERIOD_START; cohort is fixed by EMP index
  return addDays(new Date('2025-01-01T00:00:00.000Z'), indexInBand * 7);
}

// Salary grade definitions (must match what's seeded into SalaryGrade table)
// Sorted from highest to lowest minYearsOfService for lookup
const SALARY_GRADES_DEF = [
  { code: 'A', minYears: 10, baseSalary: 30000000 },
  { code: 'B', minYears: 8,  baseSalary: 25000000 },
  { code: 'C', minYears: 5,  baseSalary: 20000000 },
  { code: 'D', minYears: 3,  baseSalary: 15000000 },
  { code: 'E', minYears: 1,  baseSalary: 12000000 },
  { code: 'F', minYears: 0,  baseSalary: 9000000  }
];

function gradeCodeBySeniority(startDate) {
  const years = yearsOfService(startDate);
  for (const g of SALARY_GRADES_DEF) {
    if (years >= g.minYears) return g.code;
  }
  return 'F';
}

function baseSalaryFromGradeCode(gradeCode) {
  const found = SALARY_GRADES_DEF.find(g => g.code === gradeCode);
  return found ? found.baseSalary : 9000000;
}

function getProgressiveTax(incomeAfterDeduction) {
  const brackets = [
    { min: 0, max: 5000000, rate: 0.05 },
    { min: 5000000, max: 10000000, rate: 0.10 },
    { min: 10000000, max: 18000000, rate: 0.15 },
    { min: 18000000, max: 32000000, rate: 0.20 },
    { min: 32000000, max: 52000000, rate: 0.25 },
    { min: 52000000, max: 80000000, rate: 0.30 },
    { min: 80000000, max: Infinity, rate: 0.35 }
  ];
  let taxAmount = 0;
  let remainingIncome = Math.max(0, incomeAfterDeduction);
  for (let i = brackets.length - 1; i >= 0; i -= 1) {
    const bracket = brackets[i];
    if (remainingIncome > bracket.min) {
      const taxableInBracket = Math.min(remainingIncome, bracket.max) - bracket.min;
      taxAmount += taxableInBracket * bracket.rate;
      remainingIncome = bracket.min;
    }
  }
  return Math.round(taxAmount);
}

function buildEmployeeProfiles() {
  const profiles = [];
  let tenIdx = 0;
  let fiveIdx = 0;
  let threeIdx = 0;
  let newIdx = 0;
  let dependentEmployeesGenerated = 0;

  for (let i = 1; i <= REQUIRED_COUNTS.totalEmployees; i += 1) {
    let seniorityBand;
    let indexInBand;
    const tenLimit = REQUIRED_COUNTS.seniority.ten_years;
    const fiveLimit = tenLimit + REQUIRED_COUNTS.seniority.five_years;
    const threeLimit = fiveLimit + REQUIRED_COUNTS.seniority.three_years;
    if (i <= tenLimit) {
      seniorityBand = 'ten_years';
      indexInBand = tenIdx;
      tenIdx += 1;
    } else if (i <= fiveLimit) {
      seniorityBand = 'five_years';
      indexInBand = fiveIdx;
      fiveIdx += 1;
    } else if (i <= threeLimit) {
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
    const jobTitleCode = i <= TITLE_CODES_FOR_FIRST_30.length
      ? TITLE_CODES_FOR_FIRST_30[i - 1]
      : (i <= REQUIRED_COUNTS.withJobTitle ? TITLE_CODE_POOL[(i - TITLE_CODES_FOR_FIRST_30.length - 1) % TITLE_CODE_POOL.length] : null);

    let salaryGradeCode = seniorityBand === 'new_joiner' ? 'F' : gradeCodeBySeniority(startDate);

    let contractType = '1_year';
    if (seniorityBand === 'ten_years') contractType = ['indefinite', 'indefinite', 'indefinite', '3_year', 'indefinite', '3_year', '3_year', '1_year', '1_year', '1_year'][indexInBand];
    if (seniorityBand === 'five_years') contractType = ['3_year', '3_year', '3_year', '1_year', '3_year', '1_year', '1_year', '3_year', '1_year', '1_year', '1_year', '1_year', '1_year', '1_year', '1_year'][indexInBand];
    if (seniorityBand === 'new_joiner') contractType = 'probation';

    const dependents = DEPENDENT_INDEX_MAP[i]
      ? DEPENDENT_INDEX_MAP[i]
      : (dependentEmployeesGenerated < REQUIRED_COUNTS.dependentEmployees
        ? [{
          fullName: `${deterministicName(i + 200)} Relative`,
          relationship: i % 3 === 0 ? 'child' : (i % 3 === 1 ? 'spouse' : 'parent'),
          gender: i % 2 === 0 ? 'female' : 'male',
          dateOfBirth: i % 3 === 0 ? '2017-08-10' : '1991-04-10',
          occupation: i % 3 === 0 ? 'Student' : 'Office staff'
        }]
        : []);
    if (dependents.length > 0) dependentEmployeesGenerated += 1;

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
      dependents,
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

    seniorityCount[p.seniorityBand] += 1;
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
      employeeSocialInsuranceRate: 8,
      employerSocialInsuranceRate: 21.5,
      employeeHealthInsuranceRate: 1.5,
      employerHealthInsuranceRate: 3.0,
      employeeUnemploymentInsuranceRate: 1.0,
      employerUnemploymentInsuranceRate: 1.0,
      // Trần lương đóng BHXH (NLĐ) — mức 20× lương tối thiểu vùng, thông dụng ~46,8tr/tháng (VN 2024–2025)
      maxInsuranceSalary: 46800000,
      minInsuranceSalary: 1800000,
      isActive: true,
      description: 'Cấu hình BH theo chính sách VN: trần đóng BHXH ~46,8tr, tỷ lệ NLĐ 8%+1,5%+1%'
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
      { code: 'KT', name: 'Engineering', description: 'Product development, software engineering, and IT systems operations.' },
      { code: 'KB', name: 'Business', description: 'Sales and business development, market expansion, and customer success.' },
      { code: 'NS', name: 'Human Resources', description: 'Recruitment, training, compensation and benefits, and employee relations.' },
      { code: 'ACC', name: 'Accounting', description: 'Finance and accounting, bookkeeping, financial reporting, and internal control.' },
      { code: 'HC', name: 'Administration', description: 'General administration, office services, and corporate operations support.' }
    ]);
    console.log(`Done: created ${depts.length} departments\n`);

    // Create Job Titles
    console.log('Step 8: Creating job titles...');
    const titles = await JobTitle.bulkCreate([
      { code: 'TP', name: 'Department Head', level: 'Manager', baseSalaryMin: 25000000, baseSalaryMax: 35000000 },
      { code: 'PTP', name: 'Deputy Head', level: 'Senior Manager', baseSalaryMin: 20000000, baseSalaryMax: 28000000 },
      { code: 'NVC', name: 'Senior Staff', level: 'Senior', baseSalaryMin: 15000000, baseSalaryMax: 22000000 },
      { code: 'NV', name: 'Staff', level: 'Junior', baseSalaryMin: 10000000, baseSalaryMax: 16000000 },
      { code: 'TTS', name: 'Intern', level: 'Trainee', baseSalaryMin: 5000000, baseSalaryMax: 10000000 }
    ]);
    console.log(`Done: created ${titles.length} job titles\n`);

    // Create Salary Grades
    console.log('Step 9: Creating salary grades...');
    const grades = await SalaryGrade.bulkCreate([
      { code: 'A', name: 'Grade A', level: 1, baseSalary: 30000000, minYearsOfService: 10 },
      { code: 'B', name: 'Grade B', level: 2, baseSalary: 25000000, minYearsOfService: 8  },
      { code: 'C', name: 'Grade C', level: 3, baseSalary: 20000000, minYearsOfService: 5  },
      { code: 'D', name: 'Grade D', level: 4, baseSalary: 15000000, minYearsOfService: 3  },
      { code: 'E', name: 'Grade E', level: 5, baseSalary: 12000000, minYearsOfService: 1  },
      { code: 'F', name: 'Grade F', level: 6, baseSalary: 9000000,  minYearsOfService: 0  }
    ]);
    console.log(`Done: created ${grades.length} salary grades\n`);

    // Create Salary Rules
    console.log('Step 10: Creating salary rules...');
    await SalaryRule.bulkCreate([
      { name: 'Attendance bonus', type: 'bonus', triggerType: 'full_attendance', amount: 3, amountType: 'percentage' },
      { name: 'Overtime bonus', type: 'bonus', triggerType: 'overtime', amount: 500000, amountType: 'fixed' },
      { name: 'Performance bonus', type: 'bonus', triggerType: 'custom', amount: 4, amountType: 'percentage' },
      { name: 'Seniority bonus', type: 'bonus', triggerType: 'custom', amount: 2, amountType: 'percentage' },
      { name: 'Technical allowance', type: 'bonus', triggerType: 'custom', amount: 1000000, amountType: 'fixed' },
      { name: 'Management allowance', type: 'bonus', triggerType: 'custom', amount: 10, amountType: 'percentage' },
      { name: 'Late penalty', type: 'deduction', triggerType: 'late', amount: 400000, amountType: 'fixed' },
      { name: 'Absence penalty', type: 'deduction', triggerType: 'absent', amount: 2.5, amountType: 'percentage' },
      { name: 'Early leave penalty', type: 'deduction', triggerType: 'early_leave', amount: 300000, amountType: 'fixed' }
    ]);
    console.log('Done: salary rules created\n');

    // Create system actors for role-based architecture
    console.log('Step 11: Creating manager/hr/accountant/supervisor accounts...');
    const manager = await User.create({
      employeeCode: 'MGR001',
      name: 'Tran Van Manager',
      email: 'manager@company.com',
      password: await bcrypt.hash('Manager@12345', 10),
      phone: '0900000001',
      phoneNumber: '0900000001',
      gender: 'male',
      role: 'manager',
      isActive: true,
      baseSalary: 32000000,
      departmentId: depts[4].id, // Administration
      jobTitleId: titles[0].id, // Department Head
      salaryGradeId: grades[0].id, // Grade A
      startDate: new Date('2020-01-01'),
      contractType: 'indefinite',
      employmentStatus: 'active',
      insuranceBaseSalary: 32000000
    });

    const hrStaff = await User.create({
      employeeCode: 'HR001',
      name: 'Nguyen Thi HR',
      email: 'hr@company.com',
      password: await bcrypt.hash('HR@12345', 10),
      phone: '0900000002',
      phoneNumber: '0900000002',
      gender: 'female',
      role: 'hr',
      isActive: true,
      baseSalary: 19000000,
      departmentId: depts[2].id, // Human Resources
      jobTitleId: titles[1].id, // Deputy Head
      salaryGradeId: grades[1].id, // Grade B
      startDate: new Date('2021-06-01'),
      contractType: '3_year',
      employmentStatus: 'active',
      managerId: manager.id,
      insuranceBaseSalary: 19000000
    });

    const accountant = await User.create({
      employeeCode: 'ACC001',
      name: 'Le Thi Accountant',
      email: 'accountant@company.com',
      password: await bcrypt.hash('Accountant@12345', 10),
      phone: '0900000003',
      phoneNumber: '0900000003',
      gender: 'female',
      role: 'accountant',
      isActive: true,
      baseSalary: 21000000,
      departmentId: depts[3].id, // Accounting
      jobTitleId: titles[1].id, // Deputy Head
      salaryGradeId: grades[1].id, // Grade B
      startDate: new Date('2021-04-01'),
      contractType: '3_year',
      employmentStatus: 'active',
      managerId: manager.id,
      insuranceBaseSalary: 21000000
    });

    const supervisor = await User.create({
      employeeCode: 'SUP001',
      name: 'Pham Van Supervisor',
      email: 'supervisor@company.com',
      password: await bcrypt.hash('Supervisor@12345', 10),
      phone: '0900000004',
      phoneNumber: '0900000004',
      gender: 'male',
      role: 'supervisor',
      isActive: true,
      baseSalary: 23000000,
      departmentId: depts[1].id, // Sales
      jobTitleId: titles[0].id, // Department Head
      salaryGradeId: grades[1].id, // Grade B
      startDate: new Date('2020-08-01'),
      contractType: 'indefinite',
      employmentStatus: 'active',
      managerId: manager.id,
      insuranceBaseSalary: 23000000
    });
    console.log('Done: manager/hr/accountant/supervisor created\n');

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
      let managerId = manager.id;
      if (i >= PRIMARY_MANAGER_CODES.length) {
        const managerCode = PRIMARY_MANAGER_CODES[(i - PRIMARY_MANAGER_CODES.length) % PRIMARY_MANAGER_CODES.length];
        const manager = employees.find((emp) => emp.employeeCode === managerCode);
        managerId = manager ? manager.id : supervisor.id;
      }
      await employee.update({ managerId });
    }
    console.log(`   Created ${employees.length} employees`);

    // Create Dependents (deterministic)
    console.log('11. Creating deterministic dependents...');
    let depCount = 0;
    const depByStatus = { approved: 0, pending: 0, rejected: 0 };
    for (let i = 0; i < employeeProfiles.length; i += 1) {
      const profile = employeeProfiles[i];
      const emp = employees[i];
      for (let j = 0; j < profile.dependents.length; j += 1) {
        const dep = profile.dependents[j];
        const status = DEP_STATUS_CYCLE[(i + j) % DEP_STATUS_CYCLE.length];
        const reviewedAt = addDays(emp.startDate, 30);
        let approvalFields;
        if (status === 'pending') {
          approvalFields = {
            approvalStatus: 'pending',
            approvedBy: null,
            approvedAt: null,
            rejectionReason: null,
          };
        } else if (status === 'rejected') {
          approvalFields = {
            approvalStatus: 'rejected',
            approvedBy: hrStaff.id,
            approvedAt: reviewedAt,
            rejectionReason:
              DEP_REJECTION_REASONS[(i + j) % DEP_REJECTION_REASONS.length],
          };
        } else {
          approvalFields = {
            approvalStatus: 'approved',
            approvedBy: hrStaff.id,
            approvedAt: reviewedAt,
            rejectionReason: null,
          };
        }
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
          isDependent: true,
          ...approvalFields,
        });
        depByStatus[status] += 1;
        depCount += 1;
      }
    }
    console.log(
      `   Created ${depCount} dependents (approved/pending/rejected = ${depByStatus.approved}/${depByStatus.pending}/${depByStatus.rejected})`
    );

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
    const qualByStatus = { approved: 0, pending: 0, rejected: 0 };
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
        // Base degree (q===0) stays approved so PIT seniority / documents
        // logic that assumes the employee has at least one valid degree keeps
        // working. Only the advanced qualification rotates through the
        // cycle so the Qualification approval screen always has pending and
        // rejected items to review.
        const status = q === 0
          ? 'approved'
          : QUAL_STATUS_CYCLE[i % QUAL_STATUS_CYCLE.length];
        const reviewedAt = addDays(issuedDate, 10);
        let approvalFields;
        if (status === 'pending') {
          approvalFields = {
            approvalStatus: 'pending',
            approvedBy: null,
            approvedAt: null,
            rejectionReason: null,
          };
        } else if (status === 'rejected') {
          approvalFields = {
            approvalStatus: 'rejected',
            approvedBy: hrStaff.id,
            approvedAt: reviewedAt,
            rejectionReason:
              QUAL_REJECTION_REASONS[i % QUAL_REJECTION_REASONS.length],
          };
        } else {
          approvalFields = {
            approvalStatus: 'approved',
            approvedBy: hrStaff.id,
            approvedAt: reviewedAt,
            rejectionReason: null,
          };
        }
        await Qualification.create({
          name: tpl.name,
          type: tpl.type,
          issuedBy: 'Accredited Training Institute',
          issuedDate,
          expiryDate,
          certificateNumber: `CERT-${emp.employeeCode}-${q + 1}`,
          documentPath: `/uploads/qualifications/${emp.employeeCode}_${q + 1}.pdf`,
          description: `Qualification ${q + 1} for ${emp.employeeCode}`,
          userId: emp.id,
          ...approvalFields,
        });
        qualByStatus[status] += 1;
        qualCount += 1;
      }
    }
    console.log(
      `   Created ${qualCount} qualifications (approved/pending/rejected = ${qualByStatus.approved}/${qualByStatus.pending}/${qualByStatus.rejected})`
    );

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
        uploadedBy: hrStaff.id
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
        uploadedBy: hrStaff.id
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
          uploadedBy: hrStaff.id
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

      for (let date = new Date(effectiveStart); date <= ATTENDANCE_LOG_THROUGH; date = addDays(date, 1)) {
        const dayOfWeek = date.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const serial = Math.floor((date - PERIOD_START) / (24 * 60 * 60 * 1000));
        const isAbsent = (i + serial) % 17 === 0 || (profile.seniorityBand === 'new_joiner' && (i + serial) % 23 === 0);
        if (isAbsent) continue;

        const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        const overrides = ATTENDANCE_OVERRIDES[profile.index];
        const isLate = overrides?.lateDates?.includes(dateStr) || ((i + serial) % 14 === 0);
        const hasOvertime = profile.hasOvertime && (i + serial) % 9 === 0;
        const isEarlyLeave = overrides?.earlyLeaveDates?.includes(dateStr) || (!hasOvertime && (i + serial) % 21 === 0);

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
          approvedBy: status === 'approved' ? supervisor.id : null,
          approvedAt: status === 'approved' ? addDays(start, 1) : null,
          rejectionReason: status === 'rejected' ? 'Business workload requirement' : null
        });
        leaveCount += 1;
      }
    }
    console.log(`   Created ${leaveCount} leave requests`);

    // Edge case: approved leave should NOT be counted as absentDays (attendance gap)
    // - Create an "approved" leave covering working days in Feb/2026
    // - Remove IN/OUT attendance logs for the same dates for one employee
    const absentLeaveEmployee = employees[3]; // EMP004 (index 3) - chosen to also have salary-advance activity
    if (absentLeaveEmployee) {
      const absentLeaveStart = new Date('2026-02-02T00:00:00.000Z'); // Mon
      const absentLeaveEnd = new Date('2026-02-04T00:00:00.000Z');   // Wed
      const absentLeaveDays = 3;

      await LeaveRequest.create({
        userId: absentLeaveEmployee.id,
        type: 'paid',
        startDate: absentLeaveStart,
        endDate: absentLeaveEnd,
        days: absentLeaveDays,
        reason: 'Seed edge case: approved leave covers attendance gap',
        status: 'approved',
        approvedBy: supervisor.id,
        approvedAt: addDays(absentLeaveStart, 1),
        rejectionReason: null,
      });

      // Delete both IN and OUT so the date becomes "missing attendance" (no pairing exists => passes validation)
      const absentLeaveEndInclusive = new Date('2026-02-04T23:59:59.999Z');
      await AttendanceLog.destroy({
        where: {
          userId: absentLeaveEmployee.id,
          type: { [Op.in]: ['IN', 'OUT'] },
          timestamp: { [Op.between]: [absentLeaveStart, absentLeaveEndInclusive] }
        }
      });
    }

    // Extra approved leave in April 2026 (reference month) for realistic monthly report demos
    const april2026LeaveDemo = [
      { empIdx: 12, start: new Date('2026-04-14T00:00:00.000Z'), end: new Date('2026-04-15T00:00:00.000Z'), days: 2 },
      { empIdx: 47, start: new Date('2026-04-21T00:00:00.000Z'), end: new Date('2026-04-21T00:00:00.000Z'), days: 1 },
      { empIdx: 88, start: new Date('2026-04-28T00:00:00.000Z'), end: new Date('2026-04-29T00:00:00.000Z'), days: 2 }
    ];
    for (const row of april2026LeaveDemo) {
      const emp = employees[row.empIdx];
      if (!emp || emp.startDate > row.start) continue;
      await LeaveRequest.create({
        userId: emp.id,
        type: 'paid',
        startDate: row.start,
        endDate: row.end,
        days: row.days,
        reason: 'Seed demo: approved leave in Apr/2026',
        status: 'approved',
        approvedBy: supervisor.id,
        approvedAt: addDays(row.start, 1),
        rejectionReason: null
      });
      leaveCount += 1;
    }

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
          approvedBy: status === 'approved' ? supervisor.id : null,
          approvedAt: status === 'approved' ? addDays(date, 1) : null,
          rejectionReason: status === 'rejected' ? 'Not aligned with workload plan' : null,
          approvalLevel: 1,
          currentApproverId: status === 'pending' ? supervisor.id : null
        });
        otCount += 1;
      }
    }

    // Approved OT on sample April 2026 workdays (reference month) for attendance / OT reports
    const april2026OtDays = [
      new Date('2026-04-09T00:00:00.000Z'),
      new Date('2026-04-17T00:00:00.000Z'),
      new Date('2026-04-25T00:00:00.000Z')
    ];
    for (let di = 0; di < april2026OtDays.length; di += 1) {
      const idx = (di * 19 + 2) % employees.length;
      const emp = employees[idx];
      const profile = employeeProfiles[idx];
      const date = april2026OtDays[di];
      if (!emp || !profile.hasOvertime || emp.startDate > date) continue;
      await OvertimeRequest.create({
        userId: emp.id,
        date,
        startTime: '18:00',
        endTime: '20:30',
        totalHours: 2.5,
        reason: 'Seed demo: April 2026 OT',
        projectName: 'Demo-APR2026',
        approvalStatus: 'approved',
        approvedBy: supervisor.id,
        approvedAt: addDays(date, 1),
        rejectionReason: null,
        approvalLevel: 1,
        currentApproverId: null
      });
      otCount += 1;
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
          approvedBy: status === 'approved' ? supervisor.id : null,
          approvedAt: status === 'approved' ? addDays(startDate, 1) : null,
          rejectionReason: status === 'rejected' ? 'Budget limit reached' : null,
          approvalLevel: 1,
          currentApproverId: status === 'pending' ? supervisor.id : null
        });
        tripCount += 1;
      }
    }
    console.log(`   Created ${tripCount} business trip requests`);

    // Create Salary Advances (deterministic)
    console.log('19. Creating deterministic salary advances...');
    let advanceCount = 0;

    const seedRefYear = REFERENCE_DATE.getUTCFullYear(); // 2026
    const seedRefMonth = REFERENCE_DATE.getUTCMonth() + 1; // 3

    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];
      if (!profile.hasSalaryAdvance) continue;

      // First period must align with REFERENCE_DATE so isRefPeriod can run (pending mix for demos).
      const periods = [
        { year: seedRefYear, month: seedRefMonth },
        { year: 2025, month: (i % 12) + 1 },
        { year: 2025, month: ((i + 5) % 12) + 1 },
      ];
      const count = profile.seniorityBand === 'ten_years' ? 2 : 1;
      const used = new Set();

      for (let j = 0; j < periods.length && used.size < count; j += 1) {
        const period = periods[j];
        const key = `${period.year}-${period.month}`;
        if (used.has(key)) continue;
        used.add(key);

        const isRefPeriod = period.year === seedRefYear && period.month === seedRefMonth;
        let status;
        if (isRefPeriod) {
          // Salary recalc is blocked when salary.status === "paid".
          // So: never generate "pending" salary advances for employees whose seeded salary is "paid".
          const salaryPaidGroup = i % 3 === 1; // matches the seeded Salary status bucket below
          const rejectCase = (i % 13 === 0 && j === 0);

          if (salaryPaidGroup) {
            status = rejectCase ? 'rejected' : 'approved';
          } else {
            if (rejectCase) {
              status = 'rejected';
            } else if (i % 3 === 0) {
              // Approved salary bucket: create pending for some indexes
              status = (i % 4 === 0 || i % 4 === 3) ? 'pending' : 'approved';
            } else {
              // Pending salary bucket: create pending for some indexes
              status = (i % 4 === 1) ? 'pending' : 'approved';
            }
          }
        } else {
          // Outside reference month: keep it approved/rejected only, so UI won't try to approve -> recalc blocked by "paid" salary.
          status = (i + j) % 7 === 0 ? 'rejected' : 'approved';
        }

        // Ứng lương DN thật: thường 10–20% lương cơ bản/đợt, có trần tuyệt đối (tránh vượt quá thu nhập thực lĩnh)
        const advanceRatio = [0.1, 0.15, 0.2][(i + j) % 3];
        const ADVANCE_MONTHLY_CAP_VND = 8_000_000;
        const amount = Math.min(
          Math.round(Number(emp.baseSalary) * advanceRatio),
          ADVANCE_MONTHLY_CAP_VND
        );
        const requestDate = new Date(Date.UTC(period.year, period.month - 1, 15));

        await SalaryAdvance.create({
          userId: emp.id,
          month: period.month,
          year: period.year,
          amount,
          reason: `Salary advance ${period.month}/${period.year}`,
          requestDate,
          approvalLevel: 1,
          currentApproverId: status === 'pending' ? supervisor.id : null,
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

    // Create multi-level Approval Workflow history so the Approval Responsibility Log
    // surfaces all four roles (Supervisor level 1, HR level 2, Manager level 3, Accountant for advances).
    console.log('19.05 Creating multi-level approval workflow audit history...');
    let workflowCount = 0;

    const pushWorkflowTrace = async ({ requestType, requestId, approverLevel1, approverLevel2, approverLevel3, baseDate, finalStatus }) => {
      const rows = [];
      const l1Time = baseDate;
      const l2Time = addDays(baseDate, 1);
      const l3Time = addDays(baseDate, 2);

      if (approverLevel1) {
        rows.push({
          requestType,
          requestId,
          level: 1,
          approverId: approverLevel1,
          status: finalStatus === 'rejected' ? 'approved' : 'approved',
          approvedAt: l1Time,
          comments: 'Initial review passed at supervisor level',
          isRequired: true,
        });
      }
      if (approverLevel2) {
        rows.push({
          requestType,
          requestId,
          level: 2,
          approverId: approverLevel2,
          status: finalStatus === 'rejected' ? 'rejected' : 'approved',
          approvedAt: l2Time,
          comments:
            finalStatus === 'rejected'
              ? 'HR declined due to policy constraints'
              : 'HR verified policy compliance',
          isRequired: true,
        });
      }
      if (approverLevel3 && finalStatus !== 'rejected') {
        rows.push({
          requestType,
          requestId,
          level: 3,
          approverId: approverLevel3,
          status: 'approved',
          approvedAt: l3Time,
          comments: 'Final manager approval granted',
          isRequired: true,
        });
      }
      if (rows.length) {
        await ApprovalWorkflow.bulkCreate(rows);
        workflowCount += rows.length;
      }
    };

    // Pull a handful of already-seeded records and build workflow traces for them.
    const [workflowLeaves, workflowOvertimes, workflowTrips, workflowAdvances] = await Promise.all([
      LeaveRequest.findAll({ where: { status: 'approved' }, order: [['id', 'ASC']], limit: 40 }),
      OvertimeRequest.findAll({ where: { approvalStatus: 'approved' }, order: [['id', 'ASC']], limit: 30 }),
      BusinessTripRequest.findAll({ where: { approvalStatus: 'approved' }, order: [['id', 'ASC']], limit: 25 }),
      SalaryAdvance.findAll({ where: { approvalStatus: 'approved' }, order: [['id', 'ASC']], limit: 30 }),
    ]);

    for (let i = 0; i < workflowLeaves.length; i += 1) {
      const r = workflowLeaves[i];
      // Keep every 3rd without workflow so the log still shows level-1-only rows too
      if (i % 3 === 2) continue;
      const base = r.approvedAt ? new Date(r.approvedAt) : new Date();
      await pushWorkflowTrace({
        requestType: 'leave',
        requestId: r.id,
        approverLevel1: supervisor.id,
        approverLevel2: hrStaff.id,
        approverLevel3: i % 5 === 0 ? manager.id : null,
        baseDate: base,
        finalStatus: i % 9 === 0 ? 'rejected' : 'approved',
      });
    }

    for (let i = 0; i < workflowOvertimes.length; i += 1) {
      const r = workflowOvertimes[i];
      if (i % 2 === 1) continue;
      const base = r.approvedAt ? new Date(r.approvedAt) : new Date();
      await pushWorkflowTrace({
        requestType: 'overtime',
        requestId: r.id,
        approverLevel1: supervisor.id,
        approverLevel2: hrStaff.id,
        approverLevel3: i % 4 === 0 ? manager.id : null,
        baseDate: base,
        finalStatus: 'approved',
      });
    }

    for (let i = 0; i < workflowTrips.length; i += 1) {
      const r = workflowTrips[i];
      const base = r.approvedAt ? new Date(r.approvedAt) : new Date();
      await pushWorkflowTrace({
        requestType: 'business_trip',
        requestId: r.id,
        approverLevel1: supervisor.id,
        approverLevel2: hrStaff.id,
        approverLevel3: manager.id,
        baseDate: base,
        finalStatus: i % 7 === 0 ? 'rejected' : 'approved',
      });
    }

    for (let i = 0; i < workflowAdvances.length; i += 1) {
      const r = workflowAdvances[i];
      if (i % 2 === 1) continue;
      const base = r.approvedAt ? new Date(r.approvedAt) : new Date();
      await pushWorkflowTrace({
        requestType: 'salary_advance',
        requestId: r.id,
        approverLevel1: supervisor.id,
        approverLevel2: accountant.id,
        approverLevel3: i % 5 === 0 ? manager.id : null,
        baseDate: base,
        finalStatus: 'approved',
      });
    }

    console.log(`   Created ${workflowCount} approval workflow audit rows`);

    // Keep role-change audit as realistic governance trace
    console.log('19.1 Creating governance audit scenarios...');
    let edgeCaseCount = 0;

    // Edge case 3: role change audits
    if (employees[0]) {
      await RoleChangeAudit.bulkCreate([
        {
          userId: employees[0].id,
          changedBy: manager.id,
          oldRole: 'employee',
          newRole: 'supervisor',
          reason: 'Temporary acting supervisor assignment',
          ipAddress: '127.0.0.1',
          userAgent: 'seed-script',
        },
        {
          userId: employees[0].id,
          changedBy: manager.id,
          oldRole: 'supervisor',
          newRole: 'employee',
          reason: 'Assignment completed, rollback to employee role',
          ipAddress: '127.0.0.1',
          userAgent: 'seed-script',
        },
      ]);
      edgeCaseCount += 2;
    }
    console.log(`   Created ${edgeCaseCount} edge-case records`);

    // Create Salary Records — same pipeline as runtime (calculateSalaryForUser), then apply demo statuses
    console.log('20. Creating salary records via calculateSalaryForUser...');
    let salCount = 0;
    const refYear = now.getUTCFullYear();
    const refMonth = now.getUTCMonth() + 1;

    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const startDate = new Date(emp.startDate);

      for (let year = 2025; year <= refYear; year += 1) {
        const endMonthForYear = year === refYear ? refMonth : 12;
        for (let month = 1; month <= endMonthForYear; month += 1) {
          const monthEnd = new Date(Date.UTC(year, month, 1));
          if (monthEnd <= startDate) continue;

          const calc = await calculateSalaryForUser(emp.id, month, year);
          if (!calc.success) {
            throw new Error(`calculateSalaryForUser failed for ${emp.employeeCode} ${month}/${year}: ${calc.error || 'unknown'}`);
          }

          const { salary, attendance } = calc;

          const isRefMonth = year === refYear && month === refMonth;

          let salaryStatus = 'paid';
          let calculatedAt = new Date(REFERENCE_DATE);
          let paidAt = new Date(REFERENCE_DATE);

          if (isRefMonth) {
            const bucket = i % 3; // 0 => approved, 1 => paid, 2 => pending
            if (bucket === 0) {
              salaryStatus = 'approved';
              calculatedAt = new Date(REFERENCE_DATE);
              paidAt = null;
            } else if (bucket === 1) {
              salaryStatus = 'paid';
              calculatedAt = new Date(REFERENCE_DATE);
              paidAt = new Date(REFERENCE_DATE);
            } else {
              salaryStatus = 'pending';
              calculatedAt = null;
              paidAt = null;
            }
          }

          const otH = attendance?.overtimeHours ?? 0;
          const notes = `Salary ${month}/${year}. OT ${otH.toFixed(1)}h, late ${attendance?.lateCount ?? 0}, absent ${attendance?.absentDays ?? 0}d`;

          await salary.update({
            status: salaryStatus,
            calculatedAt,
            paidAt,
            notes
          });
          salCount += 1;
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
      const n = Number.parseInt(String(emp.employeeCode || '').replace(/^EMP/i, ''), 10);
      const band = seniorityBandFromEmployeeNumber(n);
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
      roleChangeAudits: await RoleChangeAudit.count(),
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

    console.log('22. Running payroll reconciliation report (Track A vs Track B)...');
    const reconciliationRows = [];
    const reconciliationThreshold = 50000;
    let exceedThresholdCount = 0;
    for (const emp of employees) {
      const salaries = await Salary.findAll({
        where: {
          userId: emp.id,
          year: { [Op.in]: [2025, 2026] }
        },
        attributes: ['id', 'month', 'year', 'grossSalary', 'advanceDeduction', 'finalSalary']
      });
      const dependentDeduction = 11000000 + ((Number(emp.dependentCount) || 0) * 4400000);
      for (const s of salaries) {
        const gross = Number(s.grossSalary || 0);
        const insuranceEmployee = Math.round(Number(emp.insuranceBaseSalary || emp.baseSalary || 0) * 0.105);
        const advanceDeduction = Number(s.advanceDeduction || 0);
        const taxTrackA = getProgressiveTax(gross - dependentDeduction);
        const taxTrackB = getProgressiveTax(gross - insuranceEmployee - dependentDeduction);
        const deductionTrackA = insuranceEmployee + taxTrackA + advanceDeduction;
        const deductionTrackB = insuranceEmployee + taxTrackB + advanceDeduction;
        const netTrackA = Math.round(gross - deductionTrackA);
        const netTrackB = Math.round(gross - deductionTrackB);
        const diff = Math.abs(netTrackA - netTrackB);
        if (diff > reconciliationThreshold) exceedThresholdCount += 1;
        reconciliationRows.push({
          userId: emp.id,
          employeeCode: emp.employeeCode,
          month: s.month,
          year: s.year,
          gross,
          insuranceEmployee,
          advanceDeduction,
          taxTrackA,
          taxTrackB,
          netTrackA,
          netTrackB,
          diff
        });
      }
    }
    const totalDiff = reconciliationRows.reduce((sum, row) => sum + row.diff, 0);
    const avgDiff = reconciliationRows.length > 0 ? Math.round(totalDiff / reconciliationRows.length) : 0;
    console.log(`   Reconciliation rows: ${reconciliationRows.length}`);
    console.log(`   Total net difference (A vs B): ${totalDiff.toLocaleString('en-US')} VND`);
    console.log(`   Average net difference: ${avgDiff.toLocaleString('en-US')} VND`);
    console.log(`   Records above threshold (${reconciliationThreshold.toLocaleString('en-US')}): ${exceedThresholdCount}`);

    console.log('23. Validating salary RBAC transition matrix...');
    const transitionChecks = [
      { fromStatus: SALARY_STATUS.PENDING, toStatus: SALARY_STATUS.APPROVED, role: 'supervisor', expected: true },
      { fromStatus: SALARY_STATUS.PENDING, toStatus: SALARY_STATUS.APPROVED, role: 'manager', expected: true },
      { fromStatus: SALARY_STATUS.PENDING, toStatus: SALARY_STATUS.APPROVED, role: 'accountant', expected: false },
      { fromStatus: SALARY_STATUS.APPROVED, toStatus: SALARY_STATUS.PAID, role: 'accountant', expected: true },
      { fromStatus: SALARY_STATUS.APPROVED, toStatus: SALARY_STATUS.PAID, role: 'manager', expected: false },
      { fromStatus: SALARY_STATUS.PAID, toStatus: SALARY_STATUS.PENDING, role: 'manager', expected: true },
      { fromStatus: SALARY_STATUS.PAID, toStatus: SALARY_STATUS.PENDING, role: 'supervisor', expected: false }
    ];
    for (const check of transitionChecks) {
      const actual = canTransitionSalaryStatus({
        fromStatus: check.fromStatus,
        toStatus: check.toStatus,
        role: check.role
      });
      if (actual !== check.expected) {
        throw new Error(`RBAC transition mismatch: ${check.role} ${check.fromStatus}->${check.toStatus}`);
      }
    }
    console.log('   RBAC transition validation passed');

    // ────────────────────────────────────────────────────────────────
    // Step 24: Seed ActionAudit rows so every filter option in the
    // Approval Responsibility Log has matching data.
    //   · Role filter:        manager / hr / accountant / supervisor / employee / system
    //   · Action category:    employee_lifecycle / employee_update / password /
    //                         role_change / own_request / own_profile / own_document /
    //                         own_qualification / own_dependent / own_work_experience /
    //                         own_notification / other
    //   · Date range:         spread across the last 14 days (Asia/Ho_Chi_Minh)
    // ────────────────────────────────────────────────────────────────
    console.log('24. Seeding ActionAudit rows for Approval Responsibility Log filters...');
    const actionAuditRows = [];
    const auditBaseTime = new Date();

    // Build timestamp N days ago, hour h, minute m — ensures distribution for the
    // date filter and non-collapsing hour buckets in the daily timeline modal.
    const auditAt = (daysAgo, h, m = 0) => {
      const d = new Date(auditBaseTime);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(h, m, 0, 0);
      return d;
    };

    const pickEmp = (idx) => employees[idx % employees.length];

    // ---- Manager actions (actorRole='manager') ----------------------------
    const managerActions = [
      { d: 12, h: 9,  action: 'employee.create',           category: 'employee_lifecycle', tgt: pickEmp(10), summary: 'Created employee record' },
      { d: 10, h: 10, action: 'employee.update',           category: 'employee_update',    tgt: pickEmp(11), summary: 'Updated employee department' },
      { d: 9,  h: 11, action: 'employee.deactivate',       category: 'employee_lifecycle', tgt: pickEmp(12), summary: 'Deactivated employee account' },
      { d: 8,  h: 14, action: 'employee.restore',          category: 'employee_lifecycle', tgt: pickEmp(12), summary: 'Restored employee account' },
      { d: 6,  h: 15, action: 'employee.reset_password',   category: 'password',           tgt: pickEmp(13), summary: 'Reset employee password' },
      { d: 5,  h: 16, action: 'employee.update_role',      category: 'role_change',        tgt: pickEmp(14), summary: 'Promoted employee to supervisor', metadata: { from: 'employee', to: 'supervisor' } },
      { d: 3,  h: 10, action: 'employee.update_role',      category: 'role_change',        tgt: pickEmp(14), summary: 'Rolled back employee role',      metadata: { from: 'supervisor', to: 'employee' } },
      { d: 2,  h: 11, action: 'employee.delete_permanent', category: 'employee_lifecycle', tgt: pickEmp(15), summary: 'Permanently deleted employee' },
      { d: 1,  h: 14, action: 'employee.update',           category: 'employee_update',    tgt: pickEmp(16), summary: 'Updated employee salary grade' },
    ];
    for (const a of managerActions) {
      actionAuditRows.push({
        actorId: manager.id,
        actorRole: 'manager',
        category: a.category,
        action: a.action,
        targetUserId: a.tgt?.id || null,
        entityType: 'user',
        entityId: a.tgt?.id || null,
        summary: a.summary,
        metadata: a.metadata || {},
        ipAddress: '127.0.0.1',
        userAgent: 'seed-script',
        createdAt: auditAt(a.d, a.h),
        updatedAt: auditAt(a.d, a.h),
      });
    }

    // ---- HR actions (actorRole='hr') --------------------------------------
    const hrActions = [
      { d: 13, h: 9,  action: 'employee.bulk_create',      category: 'employee_lifecycle', tgt: null,         summary: 'Bulk imported 12 employees from CSV', metadata: { count: 12 } },
      { d: 11, h: 10, action: 'employee.create',           category: 'employee_lifecycle', tgt: pickEmp(20),  summary: 'Created employee record' },
      { d: 11, h: 11, action: 'employee.create',           category: 'employee_lifecycle', tgt: pickEmp(21),  summary: 'Created employee record' },
      { d: 10, h: 13, action: 'employee.update',           category: 'employee_update',    tgt: pickEmp(22),  summary: 'Updated contact phone' },
      { d: 9,  h: 14, action: 'employee.update',           category: 'employee_update',    tgt: pickEmp(23),  summary: 'Updated bank account' },
      { d: 7,  h: 9,  action: 'employee.reset_password',   category: 'password',           tgt: pickEmp(24),  summary: 'Reset employee password (user request)' },
      { d: 6,  h: 11, action: 'employee.deactivate',       category: 'employee_lifecycle', tgt: pickEmp(25),  summary: 'Deactivated employee on offboarding' },
      { d: 4,  h: 15, action: 'employee.update',           category: 'employee_update',    tgt: pickEmp(26),  summary: 'Updated job title' },
      { d: 2,  h: 16, action: 'employee.reset_password',   category: 'password',           tgt: pickEmp(27),  summary: 'Reset employee password' },
      { d: 1,  h: 10, action: 'employee.update',           category: 'employee_update',    tgt: pickEmp(28),  summary: 'Updated insurance base salary' },
    ];
    for (const a of hrActions) {
      actionAuditRows.push({
        actorId: hrStaff.id,
        actorRole: 'hr',
        category: a.category,
        action: a.action,
        targetUserId: a.tgt?.id || null,
        entityType: 'user',
        entityId: a.tgt?.id || null,
        summary: a.summary,
        metadata: a.metadata || {},
        ipAddress: '127.0.0.1',
        userAgent: 'seed-script',
        createdAt: auditAt(a.d, a.h),
        updatedAt: auditAt(a.d, a.h),
      });
    }

    // ---- Accountant actions (actorRole='accountant') ----------------------
    const accountantActions = [
      { d: 8, h: 9,  action: 'payroll.finalize',     category: 'other', summary: 'Finalized monthly payroll', metadata: { month: 2, year: 2026 } },
      { d: 8, h: 10, action: 'payroll.mark_paid',    category: 'other', summary: 'Marked payroll as paid',    metadata: { batch: 'BANK-2026-02' } },
      { d: 3, h: 14, action: 'salary_advance.note',  category: 'other', summary: 'Added accounting note to advance request' },
    ];
    for (const a of accountantActions) {
      actionAuditRows.push({
        actorId: accountant.id,
        actorRole: 'accountant',
        category: a.category,
        action: a.action,
        targetUserId: null,
        entityType: 'payroll',
        entityId: null,
        summary: a.summary,
        metadata: a.metadata || {},
        ipAddress: '127.0.0.1',
        userAgent: 'seed-script',
        createdAt: auditAt(a.d, a.h),
        updatedAt: auditAt(a.d, a.h),
      });
    }

    // ---- Supervisor actions (actorRole='supervisor') ----------------------
    const supervisorActions = [
      { d: 9, h: 9,  action: 'schedule.update', category: 'other', summary: 'Rearranged weekly team schedule' },
      { d: 4, h: 15, action: 'shift.approve',   category: 'other', summary: 'Approved shift swap for team member' },
    ];
    for (const a of supervisorActions) {
      actionAuditRows.push({
        actorId: supervisor.id,
        actorRole: 'supervisor',
        category: a.category,
        action: a.action,
        targetUserId: null,
        entityType: 'schedule',
        entityId: null,
        summary: a.summary,
        metadata: {},
        ipAddress: '127.0.0.1',
        userAgent: 'seed-script',
        createdAt: auditAt(a.d, a.h),
        updatedAt: auditAt(a.d, a.h),
      });
    }

    // ---- Employee actions (actorRole='employee') --------------------------
    // Cover every "own_*" category across a handful of employees & days so the
    // daily-timeline modal has meaningful hour-grouped timelines.
    const employeePlaybook = [
      // (empIndex, daysAgo, hour, minute, action, category, entityType, summary)
      [0,  12, 8,  10, 'leave.create',              'own_request',        'leave_request',         'Submitted paid leave request'],
      [0,  12, 9,  20, 'overtime.create',           'own_request',        'overtime_request',      'Submitted overtime request'],
      [0,  12, 10, 5,  'profile.change_password',   'own_profile',        'user',                  'Changed own password'],
      [0,  12, 14, 30, 'document.create',           'own_document',       'document',              'Uploaded ID card scan'],

      [1,  11, 8,  0,  'dependent.create',          'own_dependent',      'dependent',             'Added dependent Tran Bao'],
      [1,  11, 8,  5,  'dependent.upload_documents','own_dependent',      'dependent',             'Uploaded documents for dependent'],
      [1,  11, 14, 0,  'qualification.create',      'own_qualification',  'qualification',         'Added bachelor degree'],
      [1,  11, 14, 15, 'work_experience.create',    'own_work_experience','work_experience',       'Added previous work experience'],
      [1,  11, 15, 0,  'notification.read',         'own_notification',   'notification',          'Marked notification as read'],

      [2,  10, 9,  30, 'business_trip.create',      'own_request',        'business_trip_request', 'Submitted business trip request'],
      [2,  10, 13, 0,  'salary_advance.create',     'own_request',        'salary_advance',        'Submitted salary advance request'],
      [2,  10, 16, 10, 'profile.update',            'own_profile',        'user',                  'Updated phone number'],

      [3,  7,  9,  0,  'qualification.update',      'own_qualification',  'qualification',         'Updated qualification issue year'],
      [3,  7,  9,  30, 'qualification.delete',      'own_qualification',  'qualification',         'Removed outdated certificate'],
      [3,  7,  10, 0,  'document.delete',           'own_document',       'document',              'Deleted duplicate document'],
      [3,  7,  11, 0,  'notification.delete',       'own_notification',   'notification',          'Deleted old notification'],

      [4,  5,  8,  45, 'work_experience.update',    'own_work_experience','work_experience',       'Adjusted end date of work experience'],
      [4,  5,  9,  0,  'work_experience.delete',    'own_work_experience','work_experience',       'Removed irrelevant work experience'],
      [4,  5,  10, 30, 'dependent.update',          'own_dependent',      'dependent',             'Updated dependent relationship'],
      [4,  5,  11, 0,  'dependent.delete',          'own_dependent',      'dependent',             'Removed dependent'],

      [5,  3,  9,  0,  'leave.update',              'own_request',        'leave_request',         'Updated leave request'],
      [5,  3,  10, 0,  'leave.cancel',              'own_request',        'leave_request',         'Cancelled leave request'],
      [5,  3,  14, 0,  'profile.update',            'own_profile',        'user',                  'Updated address'],

      [6,  1,  8,  0,  'leave.create',              'own_request',        'leave_request',         'Submitted sick leave request'],
      [6,  1,  8,  30, 'notification.read',         'own_notification',   'notification',          'Read HR announcement'],
      [6,  1,  17, 0,  'document.create',           'own_document',       'document',              'Uploaded training certificate'],
    ];
    for (const [empIdx, dAgo, h, mn, action, category, entityType, summary] of employeePlaybook) {
      const emp = pickEmp(empIdx);
      if (!emp) continue;
      actionAuditRows.push({
        actorId: emp.id,
        actorRole: 'employee',
        category,
        action,
        targetUserId: category === 'own_profile' ? emp.id : null,
        entityType,
        entityId: emp.id,
        summary,
        metadata: {},
        ipAddress: '127.0.0.1',
        userAgent: 'seed-script',
        createdAt: auditAt(dAgo, h, mn),
        updatedAt: auditAt(dAgo, h, mn),
      });
    }

    // ---- System actions (actorRole='system') ------------------------------
    // actorId stays nullable — these belong to automated / scheduled jobs.
    const systemActions = [
      { d: 13, h: 0,  action: 'system.daily_rollover',     summary: 'Daily rollover: archived attendance logs' },
      { d: 7,  h: 0,  action: 'system.payroll_cron',       summary: 'Monthly payroll cron triggered for Feb 2026', metadata: { month: 2, year: 2026 } },
      { d: 0,  h: 1,  action: 'system.notification_sweep', summary: 'Purged notifications older than 90 days' },
    ];
    for (const a of systemActions) {
      actionAuditRows.push({
        actorId: null, // System events have no human actor; the reader groups
        actorRole: 'system', // them into a virtual "System" summary row.
        category: 'other',
        action: a.action,
        targetUserId: null,
        entityType: 'system',
        entityId: null,
        summary: a.summary,
        metadata: a.metadata || {},
        ipAddress: '127.0.0.1',
        userAgent: 'cron/1.0',
        createdAt: auditAt(a.d, a.h),
        updatedAt: auditAt(a.d, a.h),
      });
    }

    await ActionAudit.bulkCreate(actionAuditRows);
    console.log(`   Created ${actionAuditRows.length} ActionAudit rows`);

    // ────────────────────────────────────────────────────────────────
    // Step 25: Fill approval-side filter gaps so every option in the
    // Approval Status dropdown has matching rows.
    //   · Status = Skipped → ApprovalWorkflow(status='skipped', approvedAt=set)
    //   · Status = Pending → ApprovalWorkflow(status='pending', approvedAt=set)
    // Note: The "Other / Payroll" request-type filter was removed from the UI
    // because payrollRoutes.js is not mounted in the main backend, so no live
    // Payroll approval events are ever produced. Seed no longer generates
    // Payroll approval rows.
    // ────────────────────────────────────────────────────────────────
    console.log('25. Filling approval filter gaps (skipped / pending)...');

    const [sampleLeaves, sampleOvertimes, sampleTrips, sampleAdvances] = await Promise.all([
      LeaveRequest.findAll({ where: { status: 'approved' }, order: [['id', 'ASC']], limit: 6 }),
      OvertimeRequest.findAll({ where: { approvalStatus: 'approved' }, order: [['id', 'ASC']], limit: 6 }),
      BusinessTripRequest.findAll({ where: { approvalStatus: 'approved' }, order: [['id', 'ASC']], limit: 4 }),
      SalaryAdvance.findAll({ where: { approvalStatus: 'approved' }, order: [['id', 'ASC']], limit: 6 }),
    ]);

    const gapWorkflowRows = [];
    const pushGapWorkflow = ({ requestType, requestId, level, approverId, status, daysAgo, hour, comment }) => {
      gapWorkflowRows.push({
        requestType,
        requestId,
        level,
        approverId,
        status,
        approvedAt: auditAt(daysAgo, hour),
        comments: `SEED:${comment}`,
        isRequired: true,
      });
    };

    // Skipped (mid-levels auto-skipped by policy)
    sampleLeaves.slice(0, 3).forEach((r, i) =>
      pushGapWorkflow({
        requestType: 'leave',
        requestId: r.id,
        level: 2,
        approverId: hrStaff.id,
        status: 'skipped',
        daysAgo: 6 - i,
        hour: 10 + i,
        comment: 'HR review auto-skipped (policy exempt)',
      })
    );
    sampleOvertimes.slice(0, 2).forEach((r, i) =>
      pushGapWorkflow({
        requestType: 'overtime',
        requestId: r.id,
        level: 3,
        approverId: manager.id,
        status: 'skipped',
        daysAgo: 5 - i,
        hour: 11 + i,
        comment: 'Manager approval not required for OT < 4h',
      })
    );
    sampleTrips.slice(0, 1).forEach((r) =>
      pushGapWorkflow({
        requestType: 'business_trip',
        requestId: r.id,
        level: 2,
        approverId: hrStaff.id,
        status: 'skipped',
        daysAgo: 4,
        hour: 14,
        comment: 'Domestic trip — HR check not required',
      })
    );

    // Pending (routed-to-approver with timestamp)
    sampleAdvances.slice(0, 3).forEach((r, i) =>
      pushGapWorkflow({
        requestType: 'salary_advance',
        requestId: r.id,
        level: 2,
        approverId: accountant.id,
        status: 'pending',
        daysAgo: 3 - i,
        hour: 9 + i,
        comment: 'Awaiting accountant review',
      })
    );
    sampleLeaves.slice(3, 6).forEach((r, i) =>
      pushGapWorkflow({
        requestType: 'leave',
        requestId: r.id,
        level: 3,
        approverId: manager.id,
        status: 'pending',
        daysAgo: 2 - i,
        hour: 15,
        comment: 'Awaiting final manager review',
      })
    );

    if (gapWorkflowRows.length) {
      await ApprovalWorkflow.bulkCreate(gapWorkflowRows);
      console.log(`   Created ${gapWorkflowRows.length} ApprovalWorkflow rows (skipped + pending)`);
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

    // HR Reports — Turnover / resignation (multi-month 2026 for date-range / month filters)
    // getEmployeeTurnoverReport: new hires = startDate in [start,end]; exits = terminated|resigned + updatedAt in [start,end].
    const applyTurnoverExit = async (code, status, y, monthIndex, day, hour = 10) => {
      const ts = new Date(Date.UTC(y, monthIndex, day, hour, 0, 0));
      await sequelize.query(
        `UPDATE users SET "employmentStatus" = :st, "isActive" = false, "deactivatedAt" = :ts, "updatedAt" = :ts
         WHERE "employeeCode" = :code AND role = 'employee'`,
        { replacements: { st: status, ts, code } }
      );
    };
    const applyTurnoverNewHire = async (code, y, monthIndex, day) => {
      const sd = new Date(Date.UTC(y, monthIndex, day, 0, 0, 0));
      const ut = new Date(Date.UTC(y, monthIndex, day, 14, 30, 0));
      await sequelize.query(
        `UPDATE users SET "startDate" = :sd, "updatedAt" = :ut, "isActive" = true,
         "employmentStatus" = 'active', "deactivatedAt" = NULL
         WHERE "employeeCode" = :code AND role = 'employee'`,
        { replacements: { sd, ut, code } }
      );
    };

    // February 2026 — filter preset "month 2 / year 2026" or range inside Feb
    await applyTurnoverExit('EMP120', 'resigned', 2026, 1, 12);
    await applyTurnoverNewHire('EMP121', 2026, 1, 22);

    // March 2026 — distinct from April; good for "March only" vs "Apr only" vs spanning Mar–Apr
    await applyTurnoverExit('EMP131', 'resigned', 2026, 2, 6);
    await applyTurnoverExit('EMP132', 'terminated', 2026, 2, 14);
    await applyTurnoverExit('EMP133', 'resigned', 2026, 2, 26);
    await applyTurnoverNewHire('EMP128', 2026, 2, 5);
    await applyTurnoverNewHire('EMP129', 2026, 2, 16);
    await applyTurnoverNewHire('EMP130', 2026, 2, 27);

    // April 2026 — primary demo window (e.g. 2026-03-31 … 2026-04-29)
    const turnoverExit = [
      { code: 'EMP141', status: 'resigned', day: 7 },
      { code: 'EMP142', status: 'resigned', day: 11 },
      { code: 'EMP143', status: 'resigned', day: 15 },
      { code: 'EMP144', status: 'terminated', day: 18 },
      { code: 'EMP145', status: 'terminated', day: 22 },
      { code: 'EMP146', status: 'resigned', day: 25 },
    ];
    for (const row of turnoverExit) {
      await applyTurnoverExit(row.code, row.status, 2026, 3, row.day);
    }
    const turnoverNewHires = [
      { code: 'EMP147', day: 4 },
      { code: 'EMP148', day: 11 },
      { code: 'EMP149', day: 18 },
      { code: 'EMP150', day: 24 },
    ];
    for (const row of turnoverNewHires) {
      await applyTurnoverNewHire(row.code, 2026, 3, row.day);
    }

    // May 2026 — filter "May / 2026" or ranges that exclude April
    await applyTurnoverNewHire('EMP126', 2026, 4, 6);
    await applyTurnoverExit('EMP127', 'terminated', 2026, 4, 19);

    // Boundary: last day of March + first day of April (cross-month range tests)
    await applyTurnoverExit('EMP134', 'resigned', 2026, 2, 31);
    await applyTurnoverNewHire('EMP135', 2026, 3, 1);

    const turnoverDemoNote =
      'Feb(120/121) + Mar(128-133) + Apr(141-150) + May(126/127) + boundary Mar31/Apr1(134/135)';
    console.log(`   HR reports (turnover demo): ${turnoverDemoNote}`);

    // Summary
    console.log('\nSEED DATA GENERATION COMPLETED\n');
    console.log('Summary:');
    console.log(`   Users: ${employees.length + 4} (${employees.length} employees + 1 manager + 1 hr + 1 accountant + 1 supervisor)`);
    console.log(`   Departments: ${depts.length}`);
    console.log(`   Job Titles: ${titles.length}`);
    console.log(`   Salary Grades: ${grades.length}`);
    console.log(`   Dependents: ${depCount} (approved/pending/rejected = ${depByStatus.approved}/${depByStatus.pending}/${depByStatus.rejected})`);
    console.log(`   Work Experiences: ${workExpCount}`);
    console.log(`   Qualifications: ${qualCount} (approved/pending/rejected = ${qualByStatus.approved}/${qualByStatus.pending}/${qualByStatus.rejected})`);
    console.log(`   Documents: ${docCount}`);
    console.log(`   Attendance Logs: ${attCount}`);
    console.log(`   Leave Requests: ${leaveCount}`);
    console.log(`   Overtime Requests: ${otCount}`);
    console.log(`   Business Trip Requests: ${tripCount}`);
    console.log(`   Salary Advances: ${advanceCount}`);
    console.log(`   Edge Cases: ${edgeCaseCount}`);
    console.log(`   Salary Records: ${salCount} (from 2025-01 to ${currentYear}-${String(currentMonth).padStart(2, '0')})`);
    console.log('\nLogin Credentials:');
    console.log('   Manager:    manager@company.com / Manager@12345');
    console.log('   HR Staff:   hr@company.com / HR@12345');
    console.log('   Supervisor: supervisor@company.com / Supervisor@12345');
    console.log('   Accountant: accountant@company.com / Accountant@12345');
    console.log('   Employees:  emp001@company.com to emp150@company.com / Password123!');
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


