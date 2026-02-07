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

// Get dashboard analytics data
export const getDashboardAnalytics = async (month, year) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Get current month data
    const attendanceReport = await getAttendanceReport(month, year);
    const payrollReport = await getPayrollCostReport(month, year);
    const structureReport = await getEmployeeStructureReport();
    const seniorityAgeReport = await getSeniorityAndAgeReport();
    const educationReport = await getEducationAndSkillsReport();
    const overtimeReport = await getOvertimeDetailReport(month, year);

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
        structureByDepartment: structureReport.byDepartment.map(dept => ({
          name: dept.departmentName || 'Không xác định',
          value: parseInt(dept.count) || 0
        })),
        // Pie chart: Structure by Contract Type
        structureByContractType: structureReport.byContractType.map(contract => ({
          name: contract.contractType === 'probation' ? 'Thử việc' :
                contract.contractType === '1_year' ? '1 năm' :
                contract.contractType === '3_year' ? '3 năm' :
                contract.contractType === 'indefinite' ? 'Không xác định' :
                contract.contractType === 'other' ? 'Khác' : contract.contractType,
          value: parseInt(contract.count) || 0
        })),
        // Pie chart: Age Distribution
        ageDistribution: seniorityAgeReport.ageDistribution.map(age => ({
          name: age.ageGroup,
          value: age.count
        })),
        // Pie chart: Seniority Distribution
        seniorityDistribution: seniorityAgeReport.seniorityDistribution.map(sen => ({
          name: sen.seniorityGroup,
          value: sen.count
        })),
        // Pie chart: Education Level
        educationLevel: educationReport.byEducationLevel.map(edu => ({
          name: edu.level,
          value: edu.count
        })),
        // Line chart: Turnover Rate Trend (6 months)
        turnoverTrend: turnoverTrend,
        // Line chart: Payroll Cost Trend (6 months)
        payrollTrend: payrollTrend,
        // Line chart: Attendance Rate Trend (6 months)
        attendanceTrend: attendanceTrend,
        // Bar chart: Overtime by Department
        overtimeByDepartment: overtimeReport.byDepartment.map(dept => ({
          name: dept.departmentName,
          hours: dept.totalHours,
          employees: dept.employeeCount
        })),
        // Bar chart: Top 10 Employees by Overtime
        topOvertimeEmployees: overtimeReport.byEmployee
          .sort((a, b) => b.totalHours - a.totalHours)
          .slice(0, 10)
          .map(emp => ({
            name: emp.employeeName,
            hours: emp.totalHours
          }))
      }
    };
  } catch (error) {
    console.error("[Analytics Service] Error generating dashboard analytics:", error);
    throw error;
  }
};


