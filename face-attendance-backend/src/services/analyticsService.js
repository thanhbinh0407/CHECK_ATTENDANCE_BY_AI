import {
  getEmployeeTurnoverReport,
  getAttendanceReport,
  getPayrollCostReport,
  getEmployeeStructureReport,
  getSeniorityAndAgeReport,
  getEducationAndSkillsReport,
  getOvertimeDetailReport
} from './reportService.js';
import User from '../models/pg/User.js';
import AttendanceLog from '../models/pg/AttendanceLog.js';
import LeaveRequest from '../models/pg/LeaveRequest.js';
import Salary from '../models/pg/Salary.js';
import { Op } from 'sequelize';

const UNKNOWN = 'Unknown';

/** Display labels for educationLevel enum (pie chart / legend) */
const EDUCATION_LEVEL_LABELS = {
  high_school: 'High school',
  vocational: 'Vocational',
  college: 'College',
  university: 'University',
  master: 'Master',
  phd: 'PhD',
  other: 'Other',
  'Không xác định': UNKNOWN,
};

function formatEducationLevelName(level) {
  if (level == null || level === '') return UNKNOWN;
  return EDUCATION_LEVEL_LABELS[level] || String(level);
}

const CONTRACT_TYPE_LABELS = {
  probation: 'Probation',
  '1_year': '1 year',
  '3_year': '3 years',
  indefinite: 'Open-ended',
  other: 'Other',
};

function formatContractTypeName(contractType) {
  if (contractType == null || contractType === '') return UNKNOWN;
  return CONTRACT_TYPE_LABELS[contractType] || String(contractType);
}

/** Seniority bucket keys from reportService (Vietnamese) → English for dashboard API */
const SENIORITY_GROUP_LABELS = {
  'Dưới 1 năm': 'Under 1 year',
  '1-3 năm': '1–3 years',
  '3-5 năm': '3–5 years',
  '5-10 năm': '5–10 years',
  'Trên 10 năm': 'Over 10 years',
};

function formatSeniorityGroupName(key) {
  if (key == null || key === '') return UNKNOWN;
  return SENIORITY_GROUP_LABELS[key] || String(key);
}

// Get dashboard analytics data
export const getDashboardAnalytics = async (month, year) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Get current month data with error handling for each service
    let attendanceReport = { totalEmployees: 0, report: [] };
    let payrollReport = { summary: { totalCost: 0, totalEmployees: 0, totalGrossSalary: 0, totalInsurance: 0, totalTax: 0 } };
    let structureReport = { total: 0, byDepartment: [], byContractType: [], byJobTitle: [] };
    let seniorityAgeReport = { ageDistribution: [], seniorityDistribution: [] };
    let educationReport = { byEducationLevel: [] };
    let overtimeReport = { summary: { totalHours: 0, totalRequests: 0, totalEmployees: 0 }, byDepartment: [], byEmployee: [] };

    try {
      attendanceReport = await getAttendanceReport(month, year);
    } catch (error) {
      console.error("[Analytics Service] Error getting attendance report:", error);
    }

    try {
      payrollReport = await getPayrollCostReport(month, year);
    } catch (error) {
      console.error("[Analytics Service] Error getting payroll report:", error);
    }

    try {
      structureReport = await getEmployeeStructureReport();
    } catch (error) {
      console.error("[Analytics Service] Error getting structure report:", error);
    }

    try {
      seniorityAgeReport = await getSeniorityAndAgeReport();
    } catch (error) {
      console.error("[Analytics Service] Error getting seniority/age report:", error);
    }

    try {
      educationReport = await getEducationAndSkillsReport();
    } catch (error) {
      console.error("[Analytics Service] Error getting education report:", error);
    }

    try {
      overtimeReport = await getOvertimeDetailReport(month, year);
    } catch (error) {
      console.error("[Analytics Service] Error getting overtime report:", error);
    }

    // Get last 6 months turnover data for trend
    const turnoverTrend = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(year, month - 1 - i, 1);
      const targetEnd = new Date(year, month - i, 0);
      try {
        const turnover = await getEmployeeTurnoverReport(
          targetDate.toISOString().split('T')[0],
          targetEnd.toISOString().split('T')[0]
        );
        turnoverTrend.push({
          month: targetDate.getMonth() + 1,
          year: targetDate.getFullYear(),
          label: `${targetDate.getMonth() + 1}/${targetDate.getFullYear()}`,
          turnoverRate: turnover.turnoverRate,
          newEmployees: turnover.newEmployees,
          terminatedEmployees: turnover.terminatedEmployees
        });
      } catch (error) {
        console.error(`Error getting turnover for ${targetDate}:`, error);
      }
    }

    // Get last 6 months payroll cost trend
    const payrollTrend = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonth = month - i <= 0 ? month - i + 12 : month - i;
      const targetYear = month - i <= 0 ? year - 1 : year;
      try {
        const payroll = await getPayrollCostReport(targetMonth, targetYear);
        payrollTrend.push({
          month: targetMonth,
          year: targetYear,
          label: `${targetMonth}/${targetYear}`,
          totalCost: payroll.summary.totalCost,
          totalGrossSalary: payroll.summary.totalGrossSalary,
          totalInsurance: payroll.summary.totalInsurance,
          totalTax: payroll.summary.totalTax
        });
      } catch (error) {
        console.error(`Error getting payroll for ${targetMonth}/${targetYear}:`, error);
      }
    }

    // Get attendance statistics for last 6 months
    const attendanceTrend = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonth = month - i <= 0 ? month - i + 12 : month - i;
      const targetYear = month - i <= 0 ? year - 1 : year;
      try {
        const attendance = await getAttendanceReport(targetMonth, targetYear);
        const avgAttendanceRate = attendance.report.length > 0
          ? attendance.report.reduce((sum, emp) => sum + parseFloat(emp.attendanceRate || 0), 0) / attendance.report.length
          : 0;
        attendanceTrend.push({
          month: targetMonth,
          year: targetYear,
          label: `${targetMonth}/${targetYear}`,
          averageAttendanceRate: parseFloat(avgAttendanceRate.toFixed(2)),
          totalLate: attendance.report.reduce((sum, emp) => sum + (emp.lateCount || 0), 0),
          totalAbsent: attendance.report.reduce((sum, emp) => sum + (emp.absentDays || 0), 0)
        });
      } catch (error) {
        console.error(`Error getting attendance for ${targetMonth}/${targetYear}:`, error);
      }
    }

    return {
      currentMonth: { month, year },
      summary: {
        totalEmployees: structureReport.total,
        totalDepartments: structureReport.byDepartment.length,
        totalJobTitles: structureReport.byJobTitle.length,
        currentMonthAttendance: {
          totalEmployees: attendanceReport.totalEmployees,
          averageAttendanceRate: attendanceReport.report.length > 0
            ? (attendanceReport.report.reduce((sum, emp) => sum + parseFloat(emp.attendanceRate || 0), 0) / attendanceReport.report.length).toFixed(2)
            : 0
        },
        currentMonthPayroll: {
          totalCost: payrollReport.summary.totalCost,
          totalEmployees: payrollReport.summary.totalEmployees,
          totalGrossSalary: payrollReport.summary.totalGrossSalary,
          totalInsurance: payrollReport.summary.totalInsurance,
          totalTax: payrollReport.summary.totalTax
        },
        currentMonthOvertime: {
          totalHours: overtimeReport.summary.totalHours,
          totalRequests: overtimeReport.summary.totalRequests,
          totalEmployees: overtimeReport.summary.totalEmployees
        }
      },
      charts: {
        // Pie chart: Structure by Department
        structureByDepartment: (structureReport.byDepartment || []).map(dept => ({
          name: dept.departmentName || UNKNOWN,
          value: parseInt(dept.count) || 0
        })),
        // Pie chart: Structure by Contract Type
        structureByContractType: (structureReport.byContractType || []).map(contract => ({
          name: formatContractTypeName(contract.contractType),
          value: parseInt(contract.count) || 0
        })),
        // Pie chart: Age Distribution (ageGroup keys are already e.g. 18–25, 26–30)
        ageDistribution: (seniorityAgeReport.ageDistribution || []).map(age => ({
          name: age.ageGroup || UNKNOWN,
          value: age.count || 0
        })),
        // Pie chart: Seniority Distribution
        seniorityDistribution: (seniorityAgeReport.seniorityDistribution || []).map(sen => ({
          name: formatSeniorityGroupName(sen.seniorityGroup),
          value: sen.count || 0
        })),
        // Pie chart: Education Level (numeric value required for Recharts)
        educationLevel: (educationReport.byEducationLevel || []).map((edu) => ({
          name: formatEducationLevelName(edu.level),
          value: Number(edu.count) || 0,
        })),
        // Line chart: Turnover Rate Trend (6 months)
        turnoverTrend: turnoverTrend || [],
        // Line chart: Payroll Cost Trend (6 months)
        payrollTrend: payrollTrend || [],
        // Line chart: Attendance Rate Trend (6 months)
        attendanceTrend: attendanceTrend || [],
        // Bar chart: Overtime by Department
        overtimeByDepartment: (overtimeReport.byDepartment || []).map(dept => ({
          name: dept.departmentName || UNKNOWN,
          hours: dept.totalHours || 0,
          employees: dept.employeeCount || 0
        })),
        // Bar chart: Top 10 Employees by Overtime
        topOvertimeEmployees: (overtimeReport.byEmployee || [])
          .sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0))
          .slice(0, 10)
          .map(emp => ({
            name: emp.employeeName || UNKNOWN,
            hours: emp.totalHours || 0
          }))
      }
    };
  } catch (error) {
    console.error("[Analytics Service] Error generating dashboard analytics:", error);
    throw error;
  }
};


