import dotenv from 'dotenv';
dotenv.config();

import sequelize from './src/db/sequelize.js';
import { QueryTypes, Op } from 'sequelize';
import {
  User, Department, JobTitle, SalaryGrade, SalaryRule, Salary,
  AttendanceLog, LeaveRequest, Document, OvertimeRequest, BusinessTripRequest,
  SalaryAdvance, Dependent, Qualification, WorkExperience, ShiftSetting, InsuranceConfig, ApprovalWorkflow, RoleChangeAudit,
  SalaryHistory, Notification
} from './src/models/pg/index.js';
import bcrypt from 'bcryptjs';

// Dữ liệu mẫu kéo dài đến hết tháng 3/2026 (lương, chấm công, đơn từ).
const REFERENCE_DATE = new Date('2026-03-31T00:00:00.000Z');
const PERIOD_START = new Date('2025-01-01T00:00:00.000Z');

// 96 nhân viên (role employee) + 4 tài khoản hệ thống (manager, hr, accountant, supervisor) = 100 user, đủ 5 role.
const REQUIRED_COUNTS = {
  totalEmployees: 96,
  dependentEmployees: 96,
  withJobTitle: 58,
  withoutJobTitle: 38,
  seniority: {
    ten_years: 20,
    five_years: 28,
    three_years: 28,
    new_joiner: 20
  }
};

/** Họ tên tiếng Việt (nam), tránh kiểu đệm + tên quá chung như A/B/C */
const VIET_FAMILY = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Dương', 'Lý', 'Mai', 'Võ', 'Đinh', 'Cao', 'Đào', 'Lưu', 'Hà', 'Tôn', 'Chu', 'Quách', 'Lâm', 'Tạ'
];
const VIET_MIDDLE_MALE = [
  'Văn', 'Đức', 'Thanh', 'Minh', 'Quang', 'Xuân', 'Hồng', 'Tuấn', 'Công', 'Đình', 'Tuệ', 'Hữu', 'Sỹ', 'Kim', 'Phúc', 'Trung', 'Việt', 'Hải', 'Anh', 'Duy', 'Thế', 'Gia', 'Quốc', 'Hoài', 'Đăng'
];
const VIET_GIVEN_MALE = [
  'Khoa', 'Hưng', 'Kiện', 'Duyên', 'Hiếu', 'Thành', 'Hải', 'Long', 'Tú', 'Khôi', 'Bảo', 'Phúc', 'Huy', 'Nam', 'Đạt', 'Trường', 'Vinh', 'Sơn', 'Lộc', 'Phong', 'Tài', 'Nhật', 'Quân', 'Thịnh', 'Tùng',
  'Cường', 'Hoàng', 'Dũng', 'Tiến', 'Khang', 'Hào', 'An', 'Đình', 'Lâm', 'Phát', 'Trí', 'Vũ', 'Hùng', 'Tâm', 'Đức', 'Thắng', 'Kiên', 'Luân', 'Mạnh', 'Nghĩa', 'Phước', 'Quyết', 'Sang', 'Thiện', 'Uy', 'Viễn', 'Yên',
  'Bình', 'Châu', 'Danh', 'Giang', 'Hiển', 'Khiêm', 'Lợi', 'Minh', 'Nguyên', 'Phương', 'Quốc', 'Sỹ', 'Thế', 'Văn', 'Xuân', 'Yến'
];

const CHILD_GIVEN_MALE = ['Bảo Nam', 'Gia Huy', 'Minh Khang', 'Quốc Huy', 'Tuấn Kiệt', 'An Khang', 'Đức Anh', 'Hữu Phước'];
const SPOUSE_FAMILY = ['Phạm', 'Võ', 'Đặng', 'Bùi', 'Hoàng', 'Trần', 'Lê', 'Phan', 'Mai', 'Đinh'];
const SPOUSE_GIVEN_FEMALE = ['Thu Hà', 'Ngọc Lan', 'Thanh Mai', 'Diễm My', 'Khánh Vy', 'Bích Ngọc', 'Quỳnh Chi', 'Hồng Nhung', 'Minh Châu', 'Tú Anh'];

const STREETS = ['Le Loi', 'Nguyen Hue', 'Tran Hung Dao', 'Vo Van Kiet', 'Pham Van Dong', 'Hoang Van Thu'];
const DISTRICTS = ['District 1, Ho Chi Minh City', 'District 3, Ho Chi Minh City', 'District 7, Ho Chi Minh City', 'Cau Giay, Ha Noi', 'Hai Chau, Da Nang', 'Ninh Kieu, Can Tho'];
const PROVINCES = ['Dong Nai', 'Binh Duong', 'Long An', 'Nam Dinh', 'Quang Nam', 'An Giang'];
const BANKS = ['Vietcombank', 'BIDV', 'VietinBank', 'Techcombank', 'ACB', 'MB Bank'];
const ID_ISSUE_PLACES = ['Ho Chi Minh City', 'Ha Noi', 'Da Nang', 'Can Tho', 'Hai Phong'];
const DESTINATIONS = ['Ha Noi', 'Da Nang', 'Can Tho', 'Hai Phong', 'Nha Trang', 'Vung Tau'];
const TRANSPORT_TYPES = ['plane', 'train', 'bus', 'car'];
const STATUS_CYCLE = ['approved', 'approved', 'pending', 'rejected', 'pending', 'approved', 'rejected'];
const LEAVE_TYPES = ['paid', 'personal', 'sick', 'unpaid', 'maternity', 'other'];
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

/** Mẫu chức danh cho 58 nhân viên đầu (còn lại không gán job title để test trường hợp trống). */
function buildTitleCodesForFirst58() {
  const pattern = ['TP', 'PTP', 'TP', 'PTP', 'TP', 'NVC', 'NVC', 'NVC', 'NV', 'NV'];
  const out = [];
  for (let k = 0; k < 58; k += 1) {
    let code = pattern[k % pattern.length];
    if (k % 23 === 22 || k % 29 === 27) code = 'TTS';
    out.push(code);
  }
  return out;
}
const TITLE_CODES_FOR_FIRST_58 = buildTitleCodesForFirst58();

function pad3(value) {
  return String(value).padStart(3, '0');
}

function toDateOnly(text) {
  return new Date(`${text}T00:00:00.000Z`);
}

/** Tên nam Việt Nam, kết hợp băm theo index để đa dạng, không lặp kiểu A/B/C. */
function realisticVietnameseMaleName(seed) {
  const i = Number(seed) || 0;
  const f = VIET_FAMILY[(i * 7919) % VIET_FAMILY.length];
  const m = VIET_MIDDLE_MALE[(i * 503 + 11) % VIET_MIDDLE_MALE.length];
  const g = VIET_GIVEN_MALE[(i * 997 + 23) % VIET_GIVEN_MALE.length];
  return `${f} ${m} ${g}`;
}

/** Mỗi nhân viên có ít nhất một người thân; một phần có thêm con để test giảm trừ gia cảnh. */
function buildDependentsForProfile(index1Based, employeeFullName) {
  const parts = String(employeeFullName || '').trim().split(/\s+/);
  const empFam = parts[0] || 'Nguyễn';
  const sf = SPOUSE_FAMILY[(index1Based * 3) % SPOUSE_FAMILY.length];
  const sg = SPOUSE_GIVEN_FEMALE[(index1Based * 5) % SPOUSE_GIVEN_FEMALE.length];
  const spouseDobYear = 1988 + (index1Based % 8);
  const spouseMonth = ((index1Based * 2) % 12) + 1;
  const spouseDay = (index1Based % 26) + 1;
  const spouse = {
    fullName: `${sf} Thị ${sg}`,
    relationship: 'spouse',
    gender: 'female',
    dateOfBirth: `${spouseDobYear}-${String(spouseMonth).padStart(2, '0')}-${String(spouseDay).padStart(2, '0')}`,
    occupation: ['Kế toán viên', 'Giáo viên', 'Y tá', 'Nhân viên hành chính', 'Kinh doanh tự do'][(index1Based + 1) % 5]
  };
  const out = [spouse];
  if (index1Based % 2 === 0) {
    const cy = 2014 + (index1Based % 6);
    const cm = ((index1Based * 3) % 12) + 1;
    const cd = (index1Based % 25) + 1;
    out.push({
      fullName: `${empFam} ${CHILD_GIVEN_MALE[index1Based % CHILD_GIVEN_MALE.length]}`,
      relationship: 'child',
      gender: 'male',
      dateOfBirth: `${cy}-${String(cm).padStart(2, '0')}-${String(cd).padStart(2, '0')}`,
      occupation: 'Học sinh'
    });
  }
  if (index1Based % 7 === 0) {
    const pm = 1 + (index1Based % 8);
    out.push({
      fullName: `${VIET_FAMILY[(index1Based * 13) % VIET_FAMILY.length]} Văn ${['Thành', 'Hùng', 'Dũng'][index1Based % 3]}`,
      relationship: 'parent',
      gender: 'male',
      dateOfBirth: `${1958 + (index1Based % 6)}-${String(pm).padStart(2, '0')}-15`,
      occupation: 'Hưu trí'
    });
  }
  return out;
}

/**
 * Theo thời gian, mỗi nhân viên đều có ngày vắng / trễ / về sớm / tăng ca (kết hợp theo tháng).
 */
function getAttendanceOutcome(empIndex, serial, monthUtc, profile) {
  const absentHash = (empIndex * 31 + serial * 17 + monthUtc * 11) % 41;
  if (absentHash === 5 || absentHash === 18 || absentHash === 29) {
    return { absent: true, isLate: false, isEarlyLeave: false, hasOvertime: false };
  }
  const phase = (monthUtc + empIndex) % 5;
  let isLate = false;
  let isEarlyLeave = false;
  let hasOvertime = false;
  const mix = (serial + empIndex) % 60;
  if (phase === 0) {
    isLate = mix % 6 === 0;
    isEarlyLeave = !isLate && mix % 13 === 0;
    hasOvertime = profile.hasOvertime && mix % 11 === 0;
  } else if (phase === 1) {
    isEarlyLeave = mix % 5 === 0;
    isLate = mix % 17 === 0;
    hasOvertime = profile.hasOvertime && mix % 9 === 0;
  } else if (phase === 2) {
    hasOvertime = profile.hasOvertime && mix % 4 === 0;
    isLate = mix % 15 === 0;
    isEarlyLeave = mix % 14 === 0;
  } else if (phase === 3) {
    isLate = mix % 10 === 0;
    isEarlyLeave = mix % 10 === 3;
    hasOvertime = profile.hasOvertime && mix % 8 === 0;
  } else {
    isLate = mix % 21 === 0;
    hasOvertime = profile.hasOvertime && mix % 12 === 0;
    isEarlyLeave = !isLate && mix % 19 === 0;
  }
  return { absent: false, isLate, isEarlyLeave, hasOvertime };
}

/** Ngày làm việc trong tháng (UTC) để gắn OT — tránh trùng cuối tuần. */
function pickWeekdayInMonthUtc(year, month, empIndex) {
  for (let day = 4 + (empIndex % 8); day <= 26; day += 1) {
    const dt = new Date(Date.UTC(year, month - 1, day));
    const dow = dt.getUTCDay();
    if (dow !== 0 && dow !== 6) return dt;
  }
  return new Date(Date.UTC(year, month - 1, 15));
}

/** Thứ tự tháng tạm ứng xoay theo NV; loại trừ tháng dành cho edge-case EMP049. */
function buildSalaryAdvancePeriodList(empIndex, employeeCode) {
  const months2025 = Array.from({ length: 12 }, (_, m) => ({ year: 2025, month: m + 1 }));
  const rot = empIndex % 12;
  const rotated = [...months2025.slice(rot), ...months2025.slice(0, rot)];
  const tail = [
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
    { year: 2026, month: 3 },
    { year: 2026, month: 4 },
    { year: 2026, month: 5 },
    { year: 2026, month: 6 }
  ];
  return [...rotated, ...tail].filter((p) => {
    if (employeeCode === 'EMP049' && p.year === 2026 && (p.month === 3 || p.month === 4)) return false;
    return true;
  });
}

function dateOnlyUtcKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Gán ngày OT duy nhất cho user (tránh trùng userId+date trong seed). */
function createOtDateAllocator() {
  const byUser = new Map();
  const keysFor = (uid) => {
    if (!byUser.has(uid)) byUser.set(uid, new Set());
    return byUser.get(uid);
  };
  const alloc = (userId, preferredDate, empStartDate, latestDate) => {
    for (let bump = 0; bump < 50; bump += 1) {
      const cand = addDays(preferredDate, bump);
      if (cand < empStartDate || cand > latestDate) continue;
      const dow = cand.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const k = dateOnlyUtcKey(cand);
      const set = keysFor(userId);
      if (set.has(k)) continue;
      set.add(k);
      return cand;
    }
    return null;
  };
  return { alloc };
}

function buildOvertimeRow(emp, empIndex, supervisorId, seq, date, status) {
  const startHour = seq % 2 === 0 ? 17 : 18;
  const startMin = seq % 2 === 0 ? 30 : 0;
  const totalHours = Number((2 + (seq % 4) * 0.5).toFixed(2));
  let endHour = startHour + Math.floor(totalHours);
  let endMin = startMin + (totalHours % 1 === 0.5 ? 30 : 0);
  if (endMin >= 60) {
    endHour += 1;
    endMin -= 60;
  }
  return {
    userId: emp.id,
    date,
    startTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
    endTime: `${String(endHour).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`,
    totalHours,
    reason: 'Support project deadline',
    projectName: `Project-${(empIndex % 8) + 1}`,
    approvalStatus: status,
    approvedBy: status === 'approved' ? supervisorId : null,
    approvedAt: status === 'approved' ? addDays(date, 1) : null,
    rejectionReason: status === 'rejected' ? 'Not aligned with workload plan' : null,
    approvalLevel: 1,
    currentApproverId: status === 'pending' ? supervisorId : null
  };
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

// Phải khớp classifySeniority(...) tại REFERENCE_DATE (31/03/2026): >=10 / [5,10) / [3,5) / <1 năm.
function createStartDateByBand(band, indexInBand) {
  if (band === 'ten_years') {
    return addDays(new Date('2013-01-10T00:00:00.000Z'), indexInBand * 14);
  }
  if (band === 'five_years') {
    return addDays(new Date('2019-03-01T00:00:00.000Z'), indexInBand * 12);
  }
  if (band === 'three_years') {
    return addDays(new Date('2022-04-01T00:00:00.000Z'), indexInBand * 10);
  }
  return addDays(new Date('2025-07-05T00:00:00.000Z'), indexInBand * 11);
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

function buildEmployeeProfiles() {
  const profiles = [];
  let tenIdx = 0;
  let fiveIdx = 0;
  let threeIdx = 0;
  let newIdx = 0;

  for (let i = 1; i <= REQUIRED_COUNTS.totalEmployees; i += 1) {
    let seniorityBand;
    let indexInBand;
    if (i <= REQUIRED_COUNTS.seniority.ten_years) {
      seniorityBand = 'ten_years';
      indexInBand = tenIdx;
      tenIdx += 1;
    } else if (i <= REQUIRED_COUNTS.seniority.ten_years + REQUIRED_COUNTS.seniority.five_years) {
      seniorityBand = 'five_years';
      indexInBand = fiveIdx;
      fiveIdx += 1;
    } else if (i <= REQUIRED_COUNTS.seniority.ten_years + REQUIRED_COUNTS.seniority.five_years + REQUIRED_COUNTS.seniority.three_years) {
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
    const jobTitleCode = i <= REQUIRED_COUNTS.withJobTitle ? TITLE_CODES_FOR_FIRST_58[i - 1] : null;

    const salaryGradeCode = gradeCodeBySeniority(startDate);

    let contractType = '1_year';
    if (seniorityBand === 'ten_years') {
      const opts = ['indefinite', 'indefinite', 'indefinite', '3_year', 'indefinite', '3_year', '3_year', '1_year', '1_year', '1_year'];
      contractType = opts[indexInBand % opts.length];
    }
    if (seniorityBand === 'five_years') {
      const opts = ['3_year', '3_year', '3_year', '1_year', '3_year', '1_year', '1_year', '3_year', '1_year', '1_year'];
      contractType = opts[indexInBand % opts.length];
    }
    if (seniorityBand === 'new_joiner') contractType = 'probation';

    const displayName = realisticVietnameseMaleName(i * 17 + 101);

    profiles.push({
      index: i,
      employeeCode: code,
      name: displayName,
      gender: 'male',
      dept,
      startDate,
      seniorityBand,
      jobTitleCode,
      salaryGradeCode,
      contractType,
      dependents: buildDependentsForProfile(i, displayName),
      hasOvertime: true,
      hasBusinessTrip: true,
      hasSalaryAdvance: true
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
    throw new Error(`Dependent employee count mismatch: expected every employee to have dependents, got ${depEmployees}`);
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
    void SalaryAdvance && void Dependent && void Qualification && void WorkExperience && void ShiftSetting && void InsuranceConfig && void ApprovalWorkflow && void SalaryHistory && void Notification;
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
      { name: 'Performance bonus', type: 'bonus', triggerType: 'custom', amount: 5, amountType: 'percentage' },
      { name: 'Seniority bonus', type: 'bonus', triggerType: 'custom', amount: 2, amountType: 'percentage' },
      { name: 'Technical allowance', type: 'bonus', triggerType: 'custom', amount: 1000000, amountType: 'fixed' },
      { name: 'Management allowance', type: 'bonus', triggerType: 'custom', amount: 10, amountType: 'percentage' },
      { name: 'Late penalty', type: 'deduction', triggerType: 'late', amount: 500000, amountType: 'fixed' },
      { name: 'Absence penalty', type: 'deduction', triggerType: 'absent', amount: 1000000, amountType: 'fixed' },
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
        emergencyContactName: realisticVietnameseMaleName(i + 733),
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

    // Lịch sử thay đổi lương (chi tiết theo thời gian — test HR / hồ sơ lương)
    console.log('10.1 Creating salary history records...');
    let salaryHistoryCount = 0;
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];
      const start = new Date(emp.startDate);
      const base = Number(emp.baseSalary);
      const allowance = Number(emp.lunchAllowance || 0) + Number(emp.transportAllowance || 0)
        + Number(emp.phoneAllowance || 0) + Number(emp.responsibilityAllowance || 0);
      const firstBase = Math.max(8000000, Math.round(base * 0.92));
      const firstAllow = Math.max(0, Math.round(allowance * 0.9));

      await SalaryHistory.create({
        userId: emp.id,
        previousBaseSalary: 0,
        newBaseSalary: firstBase,
        previousTotalAllowance: 0,
        newTotalAllowance: firstAllow,
        changeType: 'initial_salary',
        effectiveDate: start.toISOString().slice(0, 10),
        reason: 'Mức lương khởi tạo khi ký HĐLĐ (dữ liệu mẫu)',
        changedBy: hrStaff.id
      });
      salaryHistoryCount += 1;

      if (profile.seniorityBand !== 'new_joiner') {
        await SalaryHistory.create({
          userId: emp.id,
          previousBaseSalary: firstBase,
          newBaseSalary: base,
          previousTotalAllowance: firstAllow,
          newTotalAllowance: allowance,
          changeType: 'increase',
          effectiveDate: '2025-07-01',
          reason: 'Điều chỉnh lương định kỳ 07/2025 (dữ liệu mẫu)',
          changedBy: hrStaff.id
        });
        salaryHistoryCount += 1;
      }

      if (i % 12 === 0) {
        await SalaryHistory.create({
          userId: emp.id,
          previousBaseSalary: base,
          newBaseSalary: base,
          previousTotalAllowance: allowance,
          newTotalAllowance: allowance,
          changeType: 'correction',
          effectiveDate: '2026-02-01',
          reason: 'Rà soát hồ sơ lương — cập nhật ghi chú hệ thống sau kiểm tra (dữ liệu mẫu, không đổi số tiền)',
          changedBy: hrStaff.id
        });
        salaryHistoryCount += 1;
      }
    }
    console.log(`   Created ${salaryHistoryCount} salary history records`);

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
          approvedBy: hrStaff.id,
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
            : 1;

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

    // Create Qualifications (deterministic) — mỗi NV: THPT + Đại học + (Thạc sĩ hoặc chứng chỉ hành nghề)
    console.log('13. Creating deterministic qualifications...');
    let qualCount = 0;
    const qualificationCountByUserId = new Map();
    const universityDegreeByDept = [
      'Cử nhân Công nghệ Thông tin (Đại học Bách khoa TP.HCM)',
      'Cử nhân Quản trị Kinh doanh (Đại học Kinh tế Quốc dân)',
      'Cử nhân Quản trị Nhân sự (Đại học Ngoại thương Hà Nội)',
      'Cử nhân Kế toán (Đại học Kinh tế TP.HCM)',
      'Cử nhân Hành chính Văn phòng (Đại học Khoa học Xã hội & Nhân văn)'
    ];
    const thirdQualByDept = [
      { type: 'degree', name: 'Thạc sĩ Công nghệ Thông tin (Đại học Quốc gia TP.HCM)' },
      { type: 'certificate', name: 'Chứng chỉ AWS Solutions Architect – Associate' },
      { type: 'degree', name: 'Thạc sĩ Quản trị Kinh doanh (MBA, Đại học RMIT)' },
      { type: 'certificate', name: 'Chứng chỉ Kế toán trưởng (Bộ Tài chính)' },
      { type: 'training', name: 'Chứng chỉ Nhân sự CHRP (Viện HR Việt Nam)' }
    ];

    for (let i = 0; i < employeeProfiles.length; i += 1) {
      const profile = employeeProfiles[i];
      const emp = employees[i];
      const qualTemplates = [
        {
          type: 'degree',
          name: 'Tốt nghiệp Trung học phổ thông (Bằng tốt nghiệp THPT)',
          issuedBy: `Sở GD&ĐT ${['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'][profile.dept]}`
        },
        {
          type: 'degree',
          name: universityDegreeByDept[profile.dept],
          issuedBy: ['ĐHQG TP.HCM', 'ĐHQG Hà Nội', 'ĐH Đà Nẵng', 'ĐH Cần Thơ', 'ĐH Hải Phòng'][profile.dept]
        },
        thirdQualByDept[(i + profile.dept) % thirdQualByDept.length]
      ];
      qualificationCountByUserId.set(emp.id, qualTemplates.length);

      for (let q = 0; q < qualTemplates.length; q += 1) {
        const tpl = qualTemplates[q];
        const issuedDateBase = q === 0
          ? addDays(emp.startDate, -(365 * (4 + (i % 4))))
          : q === 1
            ? addDays(emp.startDate, -(365 * (1 + (i % 2))))
            : addDays(emp.startDate, 200 + (i % 120));
        const issuedDate = clampDate(issuedDateBase, new Date('2008-01-01T00:00:00.000Z'), addDays(REFERENCE_DATE, -7));
        const expiryDate = tpl.type === 'certificate' ? addDays(issuedDate, 365 * 3) : null;
        await Qualification.create({
          name: tpl.name,
          type: tpl.type,
          issuedBy: tpl.issuedBy || 'Cơ sở đào tạo được công nhận',
          issuedDate,
          expiryDate,
          certificateNumber: `VB-${emp.employeeCode}-${q + 1}`,
          documentPath: `/uploads/qualifications/${emp.employeeCode}_${q + 1}.pdf`,
          description: `Hồ sơ trình độ ${q + 1} — ${emp.name}`,
          approvalStatus: 'approved',
          approvedBy: hrStaff.id,
          approvedAt: addDays(issuedDate, 10),
          userId: emp.id
        });
        qualCount += 1;
      }

      if (i % 20 === 0) {
        await Qualification.create({
          name: 'Chứng chỉ Tiếng Anh TOEIC 750+ (đang chờ duyệt hồ sơ)',
          type: 'certificate',
          issuedBy: 'IIG Việt Nam',
          issuedDate: clampDate(addDays(emp.startDate, 400 + i), emp.startDate, addDays(REFERENCE_DATE, -3)),
          expiryDate: null,
          certificateNumber: `PENDING-${emp.employeeCode}-EN`,
          documentPath: `/uploads/qualifications/${emp.employeeCode}_pending.pdf`,
          description: 'Bản scan chứng chỉ — chờ HR xác minh',
          approvalStatus: 'pending',
          approvedBy: null,
          approvedAt: null,
          userId: emp.id
        });
        qualCount += 1;
        qualificationCountByUserId.set(emp.id, (qualificationCountByUserId.get(emp.id) || 0) + 1);
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

      if ((qualificationCountByUserId.get(emp.id) || 0) >= 2) {
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

      if (i % 7 === 0) {
        await Document.create({
          userId: emp.id,
          documentType: 'appointment_decision',
          title: 'Quyết định bổ nhiệm / điều động',
          documentPath: `/uploads/documents/bo_nhiem_${emp.employeeCode}.pdf`,
          fileName: `QD_BN_${emp.employeeCode}.pdf`,
          fileSize: 890000,
          mimeType: 'application/pdf',
          uploadDate: clampDate(addDays(emp.startDate, 500 + (i % 40)), emp.startDate, REFERENCE_DATE),
          expiryDate: null,
          description: 'Quyết định nhân sự (mẫu)',
          isActive: true,
          uploadedBy: hrStaff.id
        });
        docCount += 1;
      }

      if (i % 11 === 0) {
        await Document.create({
          userId: emp.id,
          documentType: 'salary_decision',
          title: 'Quyết định điều chỉnh lương / phụ cấp',
          documentPath: `/uploads/documents/luong_${emp.employeeCode}.pdf`,
          fileName: `QD_LUONG_${emp.employeeCode}.pdf`,
          fileSize: 760000,
          mimeType: 'application/pdf',
          uploadDate: clampDate(addDays(emp.startDate, 550 + (i % 35)), emp.startDate, REFERENCE_DATE),
          expiryDate: null,
          description: 'Quyết định lương (mẫu)',
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

      for (let date = new Date(effectiveStart); date <= REFERENCE_DATE; date = addDays(date, 1)) {
        const dayOfWeek = date.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const serial = Math.floor((date - PERIOD_START) / (24 * 60 * 60 * 1000));
        const monthUtc = date.getUTCMonth();
        const outcome = getAttendanceOutcome(i, serial, monthUtc, profile);
        if (outcome.absent) continue;

        const { isLate, isEarlyLeave, hasOvertime } = outcome;

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
      const numLeaves = profile.seniorityBand === 'ten_years' ? 9
        : profile.seniorityBand === 'five_years' ? 7
          : profile.seniorityBand === 'three_years' ? 6
            : 5;
      const baseStart = clampDate(addDays(emp.startDate, 40 + (i % 20)), emp.startDate, addDays(REFERENCE_DATE, -10));

      for (let j = 0; j < numLeaves; j += 1) {
        let start = addDays(baseStart, j * 48 + (i % 11));
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

      for (let q = 0; q < 4; q += 1) {
        let start = addDays(emp.startDate, 95 + q * 88 + (i % 23) + q * 7);
        start = clampDate(start, emp.startDate, addDays(REFERENCE_DATE, -4));
        const end = start;
        const status = STATUS_CYCLE[(i + q + 3) % STATUS_CYCLE.length];
        await LeaveRequest.create({
          userId: emp.id,
          type: LEAVE_TYPES[(i + q + 2) % LEAVE_TYPES.length],
          startDate: start,
          endDate: end,
          days: 1,
          reason: `Short leave slot ${q + 1} — ${emp.employeeCode}`,
          status,
          approvedBy: status === 'approved' ? supervisor.id : null,
          approvedAt: status === 'approved' ? addDays(start, 1) : null,
          rejectionReason: status === 'rejected' ? 'Peak season staffing' : null
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

    // Create Overtime Requests (deterministic + theo tháng, tránh trùng ngày)
    console.log('17. Creating deterministic overtime requests...');
    let otCount = 0;
    const otAllocator = createOtDateAllocator();
    const latestOtDate = addDays(REFERENCE_DATE, -5);
    const otRows = [];

    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];
      if (!profile.hasOvertime) continue;
      const numOT = profile.seniorityBand === 'ten_years' ? 7 : profile.seniorityBand === 'five_years' ? 6 : 5;
      const baseDate = clampDate(addDays(emp.startDate, 90 + (i % 30)), new Date('2025-03-01T00:00:00.000Z'), addDays(REFERENCE_DATE, -20));

      for (let j = 0; j < numOT; j += 1) {
        const preferred = clampDate(addDays(baseDate, j * 45), emp.startDate, latestOtDate);
        const date = otAllocator.alloc(emp.id, preferred, emp.startDate, latestOtDate);
        if (!date) continue;
        const status = STATUS_CYCLE[(i + j + 1) % STATUS_CYCLE.length];
        otRows.push(buildOvertimeRow(emp, i, supervisor.id, i + j, date, status));
      }

      for (let year = 2025; year <= 2026; year += 1) {
        const maxMonth = year === 2026 ? REFERENCE_DATE.getUTCMonth() + 1 : 12;
        for (let month = 1; month <= maxMonth; month += 1) {
          const monthEnd = new Date(Date.UTC(year, month, 0));
          if (monthEnd < emp.startDate) continue;
          const seedDay = 4 + ((i + month + year * 3) % 18);
          const preferred = pickWeekdayInMonthUtc(year, month, i + month + seedDay);
          const date = otAllocator.alloc(emp.id, preferred, emp.startDate, latestOtDate);
          if (!date) continue;
          const seq = year * 12 + month + i * 7;
          const status = STATUS_CYCLE[(seq + 2) % STATUS_CYCLE.length];
          otRows.push(buildOvertimeRow(emp, i, supervisor.id, seq, date, status));
        }
      }
    }

    const OT_CHUNK = 400;
    for (let c = 0; c < otRows.length; c += OT_CHUNK) {
      await OvertimeRequest.bulkCreate(otRows.slice(c, c + OT_CHUNK));
    }
    otCount = await OvertimeRequest.count();
    console.log(`   Created ${otCount} overtime requests`);

    // Create Business Trip Requests (deterministic)
    console.log('18. Creating deterministic business trip requests...');
    let tripCount = 0;
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];
      if (!profile.hasBusinessTrip) continue;
      const numTrips = (profile.dept === 0 || profile.dept === 1) && profile.seniorityBand !== 'new_joiner' ? 6 : 5;

      const baseDate = clampDate(addDays(emp.startDate, 120 + (i % 45)), new Date('2025-02-01T00:00:00.000Z'), addDays(REFERENCE_DATE, -30));
      for (let j = 0; j < numTrips; j += 1) {
        const startDate = clampDate(addDays(baseDate, j * 52), emp.startDate, addDays(REFERENCE_DATE, -8));
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
    const seedRefMonth = REFERENCE_DATE.getUTCMonth() + 1; // 3 (tháng của REFERENCE_DATE)

    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const profile = employeeProfiles[i];

      const periodCandidates = buildSalaryAdvancePeriodList(i, emp.employeeCode);
      const advanceSlots = profile.seniorityBand === 'ten_years' ? 6
        : profile.seniorityBand === 'five_years' ? 5
          : profile.seniorityBand === 'three_years' ? 4
            : 3;
      const used = new Set();
      let slotIndex = 0;

      for (const period of periodCandidates) {
        if (used.size >= advanceSlots) break;
        const key = `${period.year}-${period.month}`;
        if (used.has(key)) continue;
        used.add(key);

        const isRefPeriod = period.year === seedRefYear && period.month === seedRefMonth;
        let status;
        if (isRefPeriod) {
          const salaryPaidGroup = i % 3 === 1;
          const rejectCase = (i % 13 === 0 && slotIndex === 0);

          if (salaryPaidGroup) {
            status = rejectCase ? 'rejected' : 'approved';
          } else if (rejectCase) {
            status = 'rejected';
          } else if (i % 3 === 0) {
            status = (i % 4 === 0 || i % 4 === 3) ? 'pending' : 'approved';
          } else {
            status = (i % 4 === 1) ? 'pending' : 'approved';
          }
        } else {
          status = (i + used.size) % 7 === 0 ? 'rejected' : 'approved';
        }

        const ratio = [0.25, 0.30, 0.35][(i + slotIndex) % 3];
        const amount = Math.round(Number(emp.baseSalary) * ratio);
        const requestDate = new Date(Date.UTC(period.year, period.month - 1, 15));

        await SalaryAdvance.create({
          userId: emp.id,
          month: period.month,
          year: period.year,
          amount,
          reason: `Tạm ứng lương tháng ${period.month}/${period.year} — ${emp.employeeCode}`,
          requestDate,
          approvalLevel: 1,
          currentApproverId: status === 'pending' ? supervisor.id : null,
          approvalStatus: status,
          approvedBy: status === 'approved' ? accountant.id : null,
          approvedAt: status === 'approved' ? addDays(requestDate, 1) : null,
          rejectionReason: status === 'rejected' ? 'Vượt định mức tạm ứng theo quy định công ty' : null,
          isDeducted: false
        });
        advanceCount += 1;
        slotIndex += 1;
      }
    }
    console.log(`   Created ${advanceCount} salary advances`);

    // Create edge cases for workflow robustness
    console.log('19.1 Creating edge-case scenarios...');
    let edgeCaseCount = 0;
    let workflowCount = 0;
    let notificationCount = 0;

    // Edge case 1: employee without manager assignment (org gap)
    const unassignedManagerEmployee = employees.find((emp) => emp.employeeCode === 'EMP050');
    if (unassignedManagerEmployee) {
      await unassignedManagerEmployee.update({ managerId: null });
      edgeCaseCount += 1;
    }

    // Edge case 2: rejected then resubmitted salary advance
    const resubmitEmployee = employees.find((emp) => emp.employeeCode === 'EMP049');
    if (resubmitEmployee) {
      await SalaryAdvance.create({
        userId: resubmitEmployee.id,
        month: 3,
        year: 2026,
        amount: 2200000,
        reason: 'Emergency expense (initial request)',
        requestDate: new Date('2026-03-01T00:00:00.000Z'),
        approvalStatus: 'rejected',
        approvedBy: accountant.id,
        approvedAt: new Date('2026-03-02T00:00:00.000Z'),
        rejectionReason: 'Insufficient justification',
        isDeducted: false,
      });

      await SalaryAdvance.create({
        userId: resubmitEmployee.id,
        month: 4,
        year: 2026,
        amount: 2200000,
        reason: 'Emergency expense (resubmitted with documents)',
        requestDate: new Date('2026-04-01T00:00:00.000Z'),
        approvalStatus: 'pending',
        isDeducted: false,
      });
      edgeCaseCount += 2;
    }

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

    console.log('19.2 Seeding approval workflows (mẫu theo đơn từ)...');
    const leavesForWf = await LeaveRequest.findAll({ limit: 300, order: [['id', 'ASC']] });
    const otsForWf = await OvertimeRequest.findAll({ limit: 300, order: [['id', 'ASC']] });
    const tripsForWf = await BusinessTripRequest.findAll({ limit: 240, order: [['id', 'ASC']] });
    const advancesForWf = await SalaryAdvance.findAll({ limit: 260, order: [['id', 'ASC']] });
    const wfRows = [];

    for (const lr of leavesForWf) {
      const st = lr.status === 'approved' ? 'approved' : lr.status === 'rejected' ? 'rejected' : 'pending';
      wfRows.push({
        requestType: 'leave',
        requestId: lr.id,
        level: 1,
        approverId: supervisor.id,
        status: st,
        approvedAt: st === 'approved' ? (lr.approvedAt || addDays(lr.startDate, 1))
          : st === 'rejected' ? addDays(lr.startDate, 2) : null,
        comments: st === 'rejected' ? 'Không đủ nhân sự thay thế' : null,
        isRequired: true
      });
    }
    for (const ot of otsForWf) {
      const st = ot.approvalStatus === 'approved' ? 'approved' : ot.approvalStatus === 'rejected' ? 'rejected' : 'pending';
      wfRows.push({
        requestType: 'overtime',
        requestId: ot.id,
        level: 1,
        approverId: supervisor.id,
        status: st,
        approvedAt: st === 'approved' ? (ot.approvedAt || addDays(ot.date, 1)) : st === 'rejected' ? addDays(ot.date, 1) : null,
        comments: st === 'rejected' ? 'Vượt định mức OT theo kế hoạch tháng' : null,
        isRequired: true
      });
    }
    for (const tr of tripsForWf) {
      const st = tr.approvalStatus === 'approved' ? 'approved' : tr.approvalStatus === 'rejected' ? 'rejected' : 'pending';
      wfRows.push({
        requestType: 'business_trip',
        requestId: tr.id,
        level: 1,
        approverId: supervisor.id,
        status: st,
        approvedAt: st === 'approved' ? (tr.approvedAt || addDays(tr.startDate, 1)) : st === 'rejected' ? addDays(tr.startDate, 2) : null,
        comments: null,
        isRequired: true
      });
    }
    for (const adv of advancesForWf) {
      const st = adv.approvalStatus === 'approved' ? 'approved' : adv.approvalStatus === 'rejected' ? 'rejected' : 'pending';
      wfRows.push({
        requestType: 'salary_advance',
        requestId: adv.id,
        level: 1,
        approverId: accountant.id,
        status: st,
        approvedAt: st === 'approved' ? (adv.approvedAt || addDays(adv.requestDate, 1)) : st === 'rejected' ? addDays(adv.requestDate, 1) : null,
        comments: st === 'rejected' ? (adv.rejectionReason || 'Không đạt điều kiện tạm ứng') : null,
        isRequired: true
      });
    }
    const WF_CHUNK = 350;
    for (let c = 0; c < wfRows.length; c += WF_CHUNK) {
      await ApprovalWorkflow.bulkCreate(wfRows.slice(c, c + WF_CHUNK));
    }
    workflowCount = wfRows.length;
    console.log(`   Created ${workflowCount} approval workflow rows`);

    console.log('19.3 Seeding in-app notifications...');
    const NOTIF_TYPES = ['attendance', 'late', 'leave', 'salary', 'salary_advance', 'system', 'alert'];
    const notifRows = [];
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      for (let n = 0; n < 5; n += 1) {
        const t = NOTIF_TYPES[(i + n) % NOTIF_TYPES.length];
        const read = (i + n) % 5 !== 0;
        notifRows.push({
          userId: emp.id,
          type: t,
          title: t === 'salary_advance' ? 'Đơn tạm ứng cần xử lý'
            : t === 'leave' ? 'Đơn nghỉ phép'
              : t === 'salary' ? 'Thông báo lương'
                : `Thông báo — ${t}`,
          message: `Hệ thống (seed): ${emp.employeeCode} — loại ${t}, mục ${n + 1}.`,
          read,
          readAt: read ? addDays(REFERENCE_DATE, -(n + 1)) : null,
          metadata: { seed: true, employeeCode: emp.employeeCode, idx: n }
        });
      }
    }
    notifRows.push({
      userId: null,
      type: 'system',
      title: 'Thông báo chung',
      message: 'Công ty: Lịch kiểm tra PCCC quý 2/2026 (dữ liệu mẫu).',
      read: false,
      readAt: null,
      metadata: { seedBroadcast: true }
    });
    const N_CHUNK = 400;
    for (let c = 0; c < notifRows.length; c += N_CHUNK) {
      await Notification.bulkCreate(notifRows.slice(c, c + N_CHUNK));
    }
    notificationCount = await Notification.count();
    console.log(`   Created ${notificationCount} notifications`);

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
          const finalSalary = Math.round(base + totalBonus - totalDeduction);

          // Seed salary statuses to cover the full workflow (pending -> approved -> paid)
          // - Tháng hiện tại (theo REFERENCE_DATE): mix pending/approved/paid
          // - EMP049 in Apr/2026: keep it pending because we seed a pending salary-advance there (edge case)
          const isRefMonth = year === refYear && month === refMonth;
          const isEmp049Apr = emp.employeeCode === 'EMP049' && year === 2026 && month === 4;

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
          } else if (isEmp049Apr) {
            salaryStatus = 'pending';
            calculatedAt = null;
            paidAt = null;
          }

          await Salary.create({
            userId: emp.id,
            month,
            year,
            baseSalary: base,
            bonus: totalBonus,
            deduction: totalDeduction,
            advanceDeduction,
            finalSalary,
            status: salaryStatus,
            calculatedAt,
            paidAt,
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
      roleChangeAudits: await RoleChangeAudit.count(),
      salaryHistories: await SalaryHistory.count(),
      workExperiences: await WorkExperience.count(),
      qualifications: await Qualification.count(),
      documents: await Document.count(),
      attendanceLogs: await AttendanceLog.count(),
      leaveRequests: await LeaveRequest.count(),
      overtimeRequests: await OvertimeRequest.count(),
      businessTripRequests: await BusinessTripRequest.count(),
      salaryAdvances: await SalaryAdvance.count(),
      salaries: await Salary.count(),
      approvalWorkflows: await ApprovalWorkflow.count(),
      notifications: await Notification.count()
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
    console.log(`   Users: ${employees.length + 4} (${employees.length} employees + manager + hr + accountant + supervisor = 100 accounts, đủ 5 role)`);
    console.log(`   Departments: ${depts.length}`);
    console.log(`   Job Titles: ${titles.length}`);
    console.log(`   Salary Grades: ${grades.length}`);
    console.log(`   Dependents: ${depCount}`);
    console.log(`   Salary history: ${salaryHistoryCount}`);
    console.log(`   Work Experiences: ${workExpCount}`);
    console.log(`   Qualifications: ${qualCount}`);
    console.log(`   Documents: ${docCount}`);
    console.log(`   Attendance Logs: ${attCount}`);
    console.log(`   Leave Requests: ${leaveCount}`);
    console.log(`   Overtime Requests: ${otCount}`);
    console.log(`   Business Trip Requests: ${tripCount}`);
    console.log(`   Salary Advances: ${advanceCount}`);
    console.log(`   Edge Cases: ${edgeCaseCount}`);
    console.log(`   Approval Workflows: ${workflowCount}`);
    console.log(`   Notifications: ${notificationCount}`);
    console.log(`   Salary Records: ${salCount} (from 2025-01 to ${currentYear}-${String(currentMonth).padStart(2, '0')})`);
    console.log('\nLogin Credentials:');
    console.log('   Manager:    manager@company.com / Manager@12345');
    console.log('   HR Staff:   hr@company.com / HR@12345');
    console.log('   Supervisor: supervisor@company.com / Supervisor@12345');
    console.log('   Accountant: accountant@company.com / Accountant@12345');
    console.log(`   Employees:  emp001@company.com to emp${pad3(REQUIRED_COUNTS.totalEmployees)}@company.com / Password123!`);
    console.log('\nAll employees have expanded deterministic data (2025–03/2026) for attendance, payroll, and HR workflows.');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.errors) console.error('Details:', err.errors);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

seedDB();


