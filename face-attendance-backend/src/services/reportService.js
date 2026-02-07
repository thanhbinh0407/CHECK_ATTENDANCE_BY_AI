import User from "../models/pg/User.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import LeaveRequest from "../models/pg/LeaveRequest.js";
import Salary from "../models/pg/Salary.js";
import OvertimeRequest from "../models/pg/OvertimeRequest.js";
import Department from "../models/pg/Department.js";
import JobTitle from "../models/pg/JobTitle.js";
import Qualification from "../models/pg/Qualification.js";
import { Op } from "sequelize";
import sequelize from "../db/sequelize.js";
import { calculateAllEmployeesInsurance } from "./insuranceService.js";
import { calculatePersonalIncomeTax } from "./taxService.js";

// Employee Turnover Report
export const getEmployeeTurnoverReport = async (startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // New employees
    const newEmployees = await User.findAll({
      where: {
        role: 'employee',
        startDate: {
          [Op.between]: [start, end]
        }
      },
      attributes: ['id', 'name', 'employeeCode', 'startDate', 'departmentId']
    });

    // Terminated employees
    const terminatedEmployees = await User.findAll({
      where: {
        role: 'employee',
        employmentStatus: { [Op.in]: ['terminated', 'resigned'] },
        updatedAt: {
          [Op.between]: [start, end]
        }
      },
      attributes: ['id', 'name', 'employeeCode', 'employmentStatus', 'updatedAt']
    });

    // Total employees at start
    const totalAtStart = await User.count({
      where: {
        role: 'employee',
        isActive: true,
        startDate: { [Op.lte]: start }
      }
    });

    // Total employees at end
    const totalAtEnd = await User.count({
      where: {
        role: 'employee',
        isActive: true,
        startDate: { [Op.lte]: end }
      }
    });

    const turnoverRate = totalAtStart > 0 
      ? ((terminatedEmployees.length / totalAtStart) * 100).toFixed(2)
      : 0;

    return {
      period: { startDate, endDate },
      newEmployees: newEmployees.length,
      terminatedEmployees: terminatedEmployees.length,
      totalAtStart,
      totalAtEnd,
      turnoverRate: parseFloat(turnoverRate),
      details: {
        newEmployees,
        terminatedEmployees
      }
    };
  } catch (error) {
    console.error("[Report Service] Error generating turnover report:", error);
    throw error;
  }
};

// Attendance Report
export const getAttendanceReport = async (month, year) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const employees = await User.findAll({
      where: {
        role: 'employee',
        isActive: true
      },
      include: [
        {
          model: AttendanceLog,
          as: 'AttendanceLogs',
          where: {
            timestamp: {
              [Op.between]: [startDate, endDate]
            }
          },
          required: false
        },
        {
          model: LeaveRequest,
          as: 'LeaveRequests',
          where: {
            startDate: { [Op.lte]: endDate },
            endDate: { [Op.gte]: startDate },
            approvalStatus: 'approved'
          },
          required: false
        },
        {
          model: OvertimeRequest,
          as: 'OvertimeRequests',
          where: {
            date: {
              [Op.between]: [startDate, endDate]
            },
            approvalStatus: 'approved'
          },
          required: false
        }
      ]
    });

    const report = employees.map(emp => {
      const attendanceLogs = emp.AttendanceLogs || [];
      const leaveRequests = emp.LeaveRequests || [];
      const overtimeRequests = emp.OvertimeRequests || [];

      const totalDays = new Date(year, month, 0).getDate();
      const presentDays = attendanceLogs.filter(log => log.status === 'check_in').length;
      const lateCount = attendanceLogs.filter(log => log.isLate).length;
      const leaveDays = leaveRequests.reduce((sum, req) => {
        const reqStart = new Date(req.startDate);
        const reqEnd = new Date(req.endDate);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        
        const actualStart = reqStart < monthStart ? monthStart : reqStart;
        const actualEnd = reqEnd > monthEnd ? monthEnd : reqEnd;
        
        return sum + Math.max(0, Math.ceil((actualEnd - actualStart) / (1000 * 60 * 60 * 24)) + 1);
      }, 0);
      const overtimeHours = overtimeRequests.reduce((sum, req) => sum + parseFloat(req.totalHours || 0), 0);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        department: emp.Department?.name || '-',
        totalDays,
        presentDays,
        leaveDays,
        absentDays: totalDays - presentDays - leaveDays,
        lateCount,
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        attendanceRate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0
      };
    });

    return {
      month,
      year,
      totalEmployees: employees.length,
      report
    };
  } catch (error) {
    console.error("[Report Service] Error generating attendance report:", error);
    throw error;
  }
};

// Payroll Cost Report
export const getPayrollCostReport = async (month, year) => {
  try {
    const salaries = await Salary.findAll({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        status: { [Op.in]: ['approved', 'paid'] }
      },
      include: [
        {
          model: User,
          include: [{ model: Department }]
        }
      ]
    });

    // Calculate insurance for all employees
    const insuranceData = await calculateAllEmployeesInsurance(month, year);
    const insuranceMap = new Map(insuranceData.map(item => [item.employeeId, item]));

    let totalGrossSalary = 0;
    let totalNetSalary = 0;
    let totalEmployeeInsurance = 0;
    let totalEmployerInsurance = 0;
    let totalTax = 0;
    let totalBonus = 0;
    let totalDeduction = 0;

    const breakdown = [];
    for (const salary of salaries) {
      const user = salary.User;
      const insurance = insuranceMap.get(user.id) || { employee: { total: 0 }, employer: { total: 0 } };
      const tax = await calculatePersonalIncomeTax(user.id, salary.finalSalary || 0, month, year);

      totalGrossSalary += parseFloat(salary.grossSalary || 0);
      totalNetSalary += parseFloat(salary.finalSalary || 0);
      totalEmployeeInsurance += insurance.employee.total;
      totalEmployerInsurance += insurance.employer.total;
      totalTax += tax.taxAmount;
      totalBonus += parseFloat(salary.bonus || 0);
      totalDeduction += parseFloat(salary.deduction || 0);

      breakdown.push({
        employeeId: user.id,
        employeeName: user.name,
        employeeCode: user.employeeCode,
        department: user.Department?.name || "-",
        grossSalary: parseFloat(salary.grossSalary || 0),
        netSalary: parseFloat(salary.finalSalary || 0),
        employeeInsurance: insurance.employee.total,
        employerInsurance: insurance.employer.total,
        tax: tax.taxAmount,
        bonus: parseFloat(salary.bonus || 0),
        deduction: parseFloat(salary.deduction || 0),
      });
    }

    return {
      month,
      year,
      summary: {
        totalEmployees: salaries.length,
        totalGrossSalary: parseFloat(totalGrossSalary.toFixed(2)),
        totalNetSalary: parseFloat(totalNetSalary.toFixed(2)),
        totalEmployeeInsurance: parseFloat(totalEmployeeInsurance.toFixed(2)),
        totalEmployerInsurance: parseFloat(totalEmployerInsurance.toFixed(2)),
        totalInsurance: parseFloat((totalEmployeeInsurance + totalEmployerInsurance).toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        totalBonus: parseFloat(totalBonus.toFixed(2)),
        totalDeduction: parseFloat(totalDeduction.toFixed(2)),
        totalCost: parseFloat((totalNetSalary + totalEmployerInsurance).toFixed(2))
      },
      breakdown
    };
  } catch (error) {
    console.error("[Report Service] Error generating payroll cost report:", error);
    throw error;
  }
};

// Employee Structure Report
export const getEmployeeStructureReport = async () => {
  try {
    // By Department
    const byDepartment = await User.findAll({
      where: {
        role: 'employee',
        isActive: true
      },
      include: [{ model: Department }],
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('User.id')), 'count'],
        [sequelize.col('Department.name'), 'departmentName']
      ],
      group: ['Department.id', 'Department.name'],
      raw: true
    });

    // By Contract Type
    const byContractType = await User.findAll({
      where: {
        role: 'employee',
        isActive: true,
        contractType: { [Op.ne]: null }
      },
      attributes: [
        'contractType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['contractType'],
      raw: true
    });

    // By Job Title
    const byJobTitle = await User.findAll({
      where: {
        role: 'employee',
        isActive: true
      },
      include: [{ model: JobTitle }],
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('User.id')), 'count'],
        [sequelize.col('JobTitle.name'), 'jobTitleName']
      ],
      group: ['JobTitle.id', 'JobTitle.name'],
      raw: true
    });

    return {
      byDepartment,
      byContractType,
      byJobTitle,
      total: await User.count({
        where: {
          role: 'employee',
          isActive: true
        }
      })
    };
  } catch (error) {
    console.error("[Report Service] Error generating structure report:", error);
    throw error;
  }
};

// Seniority and Age Report
export const getSeniorityAndAgeReport = async () => {
  try {
    const employees = await User.findAll({
      where: {
        role: 'employee',
        isActive: true
      },
      attributes: ['id', 'name', 'employeeCode', 'dateOfBirth', 'startDate', 'departmentId'],
      include: [{ model: Department, attributes: ['name'] }]
    });

    const today = new Date();
    const ageGroups = {
      '18-25': [],
      '26-30': [],
      '31-35': [],
      '36-40': [],
      '41-45': [],
      '46-50': [],
      '51+': []
    };

    const seniorityGroups = {
      'Dưới 1 năm': [],
      '1-3 năm': [],
      '3-5 năm': [],
      '5-10 năm': [],
      'Trên 10 năm': []
    };

    for (const emp of employees) {
      // Calculate age
      if (emp.dateOfBirth) {
        const birthDate = new Date(emp.dateOfBirth);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

        if (actualAge >= 18 && actualAge <= 25) ageGroups['18-25'].push(emp.id);
        else if (actualAge >= 26 && actualAge <= 30) ageGroups['26-30'].push(emp.id);
        else if (actualAge >= 31 && actualAge <= 35) ageGroups['31-35'].push(emp.id);
        else if (actualAge >= 36 && actualAge <= 40) ageGroups['36-40'].push(emp.id);
        else if (actualAge >= 41 && actualAge <= 45) ageGroups['41-45'].push(emp.id);
        else if (actualAge >= 46 && actualAge <= 50) ageGroups['46-50'].push(emp.id);
        else if (actualAge >= 51) ageGroups['51+'].push(emp.id);
      }

      // Calculate seniority
      if (emp.startDate) {
        const startDate = new Date(emp.startDate);
        const years = (today - startDate) / (1000 * 60 * 60 * 24 * 365.25);

        if (years < 1) seniorityGroups['Dưới 1 năm'].push(emp.id);
        else if (years >= 1 && years < 3) seniorityGroups['1-3 năm'].push(emp.id);
        else if (years >= 3 && years < 5) seniorityGroups['3-5 năm'].push(emp.id);
        else if (years >= 5 && years < 10) seniorityGroups['5-10 năm'].push(emp.id);
        else if (years >= 10) seniorityGroups['Trên 10 năm'].push(emp.id);
      }
    }

    return {
      ageDistribution: Object.keys(ageGroups).map(key => ({
        ageGroup: key,
        count: ageGroups[key].length,
        percentage: employees.length > 0 ? ((ageGroups[key].length / employees.length) * 100).toFixed(2) : 0
      })),
      seniorityDistribution: Object.keys(seniorityGroups).map(key => ({
        seniorityGroup: key,
        count: seniorityGroups[key].length,
        percentage: employees.length > 0 ? ((seniorityGroups[key].length / employees.length) * 100).toFixed(2) : 0
      })),
      total: employees.length
    };
  } catch (error) {
    console.error("[Report Service] Error generating seniority and age report:", error);
    throw error;
  }
};

// Education and Skills Report
export const getEducationAndSkillsReport = async () => {
  try {
    const employees = await User.findAll({
      where: {
        role: 'employee',
        isActive: true
      },
      include: [
        {
          model: Qualification,
          as: 'Qualifications',
          where: { isActive: true },
          required: false
        }
      ],
      attributes: ['id', 'name', 'employeeCode', 'educationLevel']
    });

    // By Education Level
    const byEducationLevel = {};
    const byQualificationType = {
      'certificate': 0,
      'degree': 0,
      'license': 0,
      'training': 0
    };

    for (const emp of employees) {
      const eduLevel = emp.educationLevel || 'Không xác định';
      byEducationLevel[eduLevel] = (byEducationLevel[eduLevel] || 0) + 1;

      if (emp.Qualifications) {
        for (const qual of emp.Qualifications) {
          byQualificationType[qual.type] = (byQualificationType[qual.type] || 0) + 1;
        }
      }
    }

    return {
      byEducationLevel: Object.keys(byEducationLevel).map(level => ({
        level,
        count: byEducationLevel[level],
        percentage: employees.length > 0 ? ((byEducationLevel[level] / employees.length) * 100).toFixed(2) : 0
      })),
      byQualificationType: Object.keys(byQualificationType).map(type => ({
        type,
        count: byQualificationType[type],
        percentage: employees.length > 0 ? ((byQualificationType[type] / employees.length) * 100).toFixed(2) : 0
      })),
      total: employees.length,
      employeesWithQualifications: employees.filter(emp => emp.Qualifications && emp.Qualifications.length > 0).length
    };
  } catch (error) {
    console.error("[Report Service] Error generating education and skills report:", error);
    throw error;
  }
};

// Leave Status Report
export const getLeaveStatusReport = async (year) => {
  try {
    const targetYear = year || new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31);

    const employees = await User.findAll({
      where: {
        role: 'employee',
        isActive: true
      },
      include: [
        {
          model: LeaveRequest,
          as: 'LeaveRequests',
          where: {
            startDate: { [Op.lte]: endOfYear },
            endDate: { [Op.gte]: startOfYear },
            status: 'approved'
          },
          required: false
        },
        { model: Department, attributes: ['name'] }
      ]
    });

    const report = employees.map(emp => {
      const approvedLeaves = emp.LeaveRequests || [];
      const totalLeaveDays = approvedLeaves.reduce((sum, leave) => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        const yearStart = new Date(targetYear, 0, 1);
        const yearEnd = new Date(targetYear, 11, 31);

        // Calculate days within the year
        const actualStart = leaveStart < yearStart ? yearStart : leaveStart;
        const actualEnd = leaveEnd > yearEnd ? yearEnd : leaveEnd;

        if (actualStart <= actualEnd) {
          const days = Math.ceil((actualEnd - actualStart) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }
        return sum;
      }, 0);

      // Standard leave days per year (typically 12-15 days in Vietnam)
      const standardLeaveDays = 12;
      const remainingLeaveDays = Math.max(0, standardLeaveDays - totalLeaveDays);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        department: emp.Department?.name || '-',
        totalLeaveDaysUsed: totalLeaveDays,
        remainingLeaveDays,
        standardLeaveDays,
        utilizationRate: standardLeaveDays > 0 ? ((totalLeaveDays / standardLeaveDays) * 100).toFixed(2) : 0
      };
    });

    return {
      year: targetYear,
      totalEmployees: employees.length,
      report,
      summary: {
        totalLeaveDaysUsed: report.reduce((sum, r) => sum + r.totalLeaveDaysUsed, 0),
        totalRemainingLeaveDays: report.reduce((sum, r) => sum + r.remainingLeaveDays, 0),
        averageUtilizationRate: report.length > 0 
          ? (report.reduce((sum, r) => sum + parseFloat(r.utilizationRate), 0) / report.length).toFixed(2)
          : 0
      }
    };
  } catch (error) {
    console.error("[Report Service] Error generating leave status report:", error);
    throw error;
  }
};

// Average Income Analysis Report
export const getAverageIncomeReport = async (month, year) => {
  try {
    const salaries = await Salary.findAll({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        status: { [Op.in]: ['approved', 'paid'] }
      },
      include: [
        {
          model: User,
          include: [
            { model: JobTitle, attributes: ['name'] },
            { model: Department, attributes: ['name'] }
          ]
        }
      ]
    });

    // Group by Job Title
    const byJobTitle = {};
    const byDepartment = {};

    for (const salary of salaries) {
      const user = salary.User;
      const jobTitle = user.JobTitle?.name || 'Không xác định';
      const department = user.Department?.name || 'Không xác định';
      const netSalary = parseFloat(salary.finalSalary || 0);

      if (!byJobTitle[jobTitle]) {
        byJobTitle[jobTitle] = { total: 0, count: 0, salaries: [] };
      }
      byJobTitle[jobTitle].total += netSalary;
      byJobTitle[jobTitle].count += 1;
      byJobTitle[jobTitle].salaries.push(netSalary);

      if (!byDepartment[department]) {
        byDepartment[department] = { total: 0, count: 0, salaries: [] };
      }
      byDepartment[department].total += netSalary;
      byDepartment[department].count += 1;
      byDepartment[department].salaries.push(netSalary);
    }

    const processGroup = (group) => {
      return Object.keys(group).map(key => {
        const data = group[key];
        const average = data.count > 0 ? data.total / data.count : 0;
        const min = data.salaries.length > 0 ? Math.min(...data.salaries) : 0;
        const max = data.salaries.length > 0 ? Math.max(...data.salaries) : 0;
        const median = data.salaries.length > 0 
          ? data.salaries.sort((a, b) => a - b)[Math.floor(data.salaries.length / 2)]
          : 0;

        return {
          name: key,
          count: data.count,
          average: parseFloat(average.toFixed(2)),
          min: parseFloat(min.toFixed(2)),
          max: parseFloat(max.toFixed(2)),
          median: parseFloat(median.toFixed(2)),
          total: parseFloat(data.total.toFixed(2))
        };
      });
    };

    return {
      month,
      year,
      byJobTitle: processGroup(byJobTitle),
      byDepartment: processGroup(byDepartment),
      overall: {
        totalEmployees: salaries.length,
        averageSalary: salaries.length > 0
          ? parseFloat((salaries.reduce((sum, s) => sum + parseFloat(s.finalSalary || 0), 0) / salaries.length).toFixed(2))
          : 0,
        minSalary: salaries.length > 0
          ? parseFloat(Math.min(...salaries.map(s => parseFloat(s.finalSalary || 0))).toFixed(2))
          : 0,
        maxSalary: salaries.length > 0
          ? parseFloat(Math.max(...salaries.map(s => parseFloat(s.finalSalary || 0))).toFixed(2))
          : 0
      }
    };
  } catch (error) {
    console.error("[Report Service] Error generating average income report:", error);
    throw error;
  }
};

// Late/Early Arrival Detail Report
export const getLateEarlyDetailReport = async (month, year) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const logs = await AttendanceLog.findAll({
      where: {
        timestamp: {
          [Op.between]: [startDate, endDate]
        },
        [Op.or]: [
          { isLate: true },
          { isEarlyLeave: true }
        ]
      },
      include: [
        {
          model: User,
          as: 'User',
          include: [{ model: Department, attributes: ['name'] }]
        }
      ]
    });

    const employeeMap = {};

    for (const log of logs) {
      if (!log.User) continue;
      const userId = log.User.id;
      if (!employeeMap[userId]) {
        employeeMap[userId] = {
          employeeId: userId,
          employeeName: log.User.name,
          employeeCode: log.User.employeeCode,
          department: log.User.Department?.name || '-',
          lateCount: 0,
          earlyLeaveCount: 0,
          violations: []
        };
      }

      if (log.isLate) {
        employeeMap[userId].lateCount++;
        employeeMap[userId].violations.push({
          date: log.timestamp,
          type: 'late',
          note: log.note
        });
      }
      if (log.isEarlyLeave) {
        employeeMap[userId].earlyLeaveCount++;
        employeeMap[userId].violations.push({
          date: log.timestamp,
          type: 'early_leave',
          note: log.note
        });
      }
    }

    const report = Object.values(employeeMap).map(emp => ({
      ...emp,
      totalViolations: emp.lateCount + emp.earlyLeaveCount,
      violations: emp.violations.sort((a, b) => new Date(b.date) - new Date(a.date))
    })).sort((a, b) => b.totalViolations - a.totalViolations);

    return {
      month,
      year,
      totalViolations: report.reduce((sum, r) => sum + r.totalViolations, 0),
      totalLate: report.reduce((sum, r) => sum + r.lateCount, 0),
      totalEarlyLeave: report.reduce((sum, r) => sum + r.earlyLeaveCount, 0),
      employeesWithViolations: report.length,
      report
    };
  } catch (error) {
    console.error("[Report Service] Error generating late/early detail report:", error);
    throw error;
  }
};

// Absent Detail Report
export const getAbsentDetailReport = async (month, year) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const employees = await User.findAll({
      where: {
        role: 'employee',
        isActive: true
      },
      include: [
        {
          model: AttendanceLog,
          as: 'AttendanceLogs',
          where: {
            timestamp: {
              [Op.between]: [startDate, endDate]
            },
            type: 'IN'
          },
          required: false
        },
        {
          model: LeaveRequest,
          as: 'LeaveRequests',
          where: {
            startDate: { [Op.lte]: endDate },
            endDate: { [Op.gte]: startDate },
            status: 'approved'
          },
          required: false
        },
        { model: Department, attributes: ['name'] }
      ]
    });

    const totalDays = new Date(year, month, 0).getDate();
    const report = employees.map(emp => {
      const attendanceLogs = emp.AttendanceLogs || [];
      const leaveRequests = emp.LeaveRequests || [];

      // Count present days (unique dates with IN logs)
      const presentDates = new Set();
      attendanceLogs.forEach(log => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        presentDates.add(date);
      });
      const presentDays = presentDates.size;

      // Count leave days
      let leaveDays = 0;
      leaveRequests.forEach(leave => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        const actualStart = leaveStart < monthStart ? monthStart : leaveStart;
        const actualEnd = leaveEnd > monthEnd ? monthEnd : leaveEnd;

        if (actualStart <= actualEnd) {
          const days = Math.ceil((actualEnd - actualStart) / (1000 * 60 * 60 * 24)) + 1;
          leaveDays += days;
        }
      });

      const absentDays = totalDays - presentDays - leaveDays;

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        department: emp.Department?.name || '-',
        totalDays,
        presentDays,
        leaveDays,
        absentDays,
        attendanceRate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0,
        absentRate: totalDays > 0 ? ((absentDays / totalDays) * 100).toFixed(2) : 0
      };
    });

    return {
      month,
      year,
      totalEmployees: employees.length,
      summary: {
        totalDays,
        totalPresentDays: report.reduce((sum, r) => sum + r.presentDays, 0),
        totalLeaveDays: report.reduce((sum, r) => sum + r.leaveDays, 0),
        totalAbsentDays: report.reduce((sum, r) => sum + r.absentDays, 0),
        averageAttendanceRate: report.length > 0
          ? (report.reduce((sum, r) => sum + parseFloat(r.attendanceRate), 0) / report.length).toFixed(2)
          : 0
      },
      report: report.sort((a, b) => b.absentDays - a.absentDays)
    };
  } catch (error) {
    console.error("[Report Service] Error generating absent detail report:", error);
    throw error;
  }
};

// Overtime Detail Report
export const getOvertimeDetailReport = async (month, year) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const overtimeRequests = await OvertimeRequest.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        },
        approvalStatus: 'approved'
      },
      include: [
        {
          model: User,
          as: 'User',
          include: [{ model: Department, attributes: ['name'] }]
        }
      ]
    });

    const employeeMap = {};
    const departmentMap = {};

    for (const ot of overtimeRequests) {
      if (!ot.User) continue;
      const userId = ot.User.id;
      const department = ot.User.Department?.name || 'Không xác định';
      const hours = parseFloat(ot.totalHours || 0);

      // By Employee
      if (!employeeMap[userId]) {
        employeeMap[userId] = {
          employeeId: userId,
          employeeName: ot.User.name,
          employeeCode: ot.User.employeeCode,
          department,
          totalHours: 0,
          requestCount: 0,
          requests: []
        };
      }
      employeeMap[userId].totalHours += hours;
      employeeMap[userId].requestCount++;
      employeeMap[userId].requests.push({
        date: ot.date,
        hours,
        reason: ot.reason,
        projectName: ot.projectName
      });

      // By Department
      if (!departmentMap[department]) {
        departmentMap[department] = {
          departmentName: department,
          totalHours: 0,
          employeeCount: 0,
          requestCount: 0
        };
      }
      departmentMap[department].totalHours += hours;
      departmentMap[department].requestCount++;
      if (!departmentMap[department].employees) {
        departmentMap[department].employees = new Set();
      }
      departmentMap[department].employees.add(userId);
    }

    // Convert Set to count
    Object.keys(departmentMap).forEach(dept => {
      departmentMap[dept].employeeCount = departmentMap[dept].employees.size;
      delete departmentMap[dept].employees;
    });

    const employeeReport = Object.values(employeeMap)
      .map(emp => ({
        ...emp,
        totalHours: parseFloat(emp.totalHours.toFixed(2)),
        averageHoursPerRequest: emp.requestCount > 0 
          ? parseFloat((emp.totalHours / emp.requestCount).toFixed(2))
          : 0
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    const departmentReport = Object.values(departmentMap)
      .map(dept => ({
        ...dept,
        totalHours: parseFloat(dept.totalHours.toFixed(2)),
        averageHoursPerEmployee: dept.employeeCount > 0
          ? parseFloat((dept.totalHours / dept.employeeCount).toFixed(2))
          : 0
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    return {
      month,
      year,
      summary: {
        totalHours: parseFloat(employeeReport.reduce((sum, r) => sum + r.totalHours, 0).toFixed(2)),
        totalRequests: overtimeRequests.length,
        totalEmployees: employeeReport.length,
        averageHoursPerEmployee: employeeReport.length > 0
          ? parseFloat((employeeReport.reduce((sum, r) => sum + r.totalHours, 0) / employeeReport.length).toFixed(2))
          : 0
      },
      byEmployee: employeeReport,
      byDepartment: departmentReport
    };
  } catch (error) {
    console.error("[Report Service] Error generating overtime detail report:", error);
    throw error;
  }
};

// Allowances and Bonuses Report
export const getAllowancesAndBonusesReport = async (month, year) => {
  try {
    const salaries = await Salary.findAll({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        status: { [Op.in]: ['approved', 'paid'] }
      },
      include: [
        {
          model: User,
          include: [{ model: Department, attributes: ['name'] }]
        }
      ]
    });

    const report = salaries.map(salary => {
      const user = salary.User;
      return {
        employeeId: user.id,
        employeeName: user.name,
        employeeCode: user.employeeCode,
        department: user.Department?.name || '-',
        baseSalary: parseFloat(user.baseSalary || 0),
        lunchAllowance: parseFloat(user.lunchAllowance || 0),
        transportAllowance: parseFloat(user.transportAllowance || 0),
        phoneAllowance: parseFloat(user.phoneAllowance || 0),
        responsibilityAllowance: parseFloat(user.responsibilityAllowance || 0),
        totalAllowances: parseFloat(
          (parseFloat(user.lunchAllowance || 0) +
           parseFloat(user.transportAllowance || 0) +
           parseFloat(user.phoneAllowance || 0) +
           parseFloat(user.responsibilityAllowance || 0)).toFixed(2)
        ),
        bonus: parseFloat(salary.bonus || 0),
        grossSalary: parseFloat(salary.grossSalary || 0)
      };
    });

    return {
      month,
      year,
      summary: {
        totalEmployees: salaries.length,
        totalBaseSalary: parseFloat(report.reduce((sum, r) => sum + r.baseSalary, 0).toFixed(2)),
        totalLunchAllowance: parseFloat(report.reduce((sum, r) => sum + r.lunchAllowance, 0).toFixed(2)),
        totalTransportAllowance: parseFloat(report.reduce((sum, r) => sum + r.transportAllowance, 0).toFixed(2)),
        totalPhoneAllowance: parseFloat(report.reduce((sum, r) => sum + r.phoneAllowance, 0).toFixed(2)),
        totalResponsibilityAllowance: parseFloat(report.reduce((sum, r) => sum + r.responsibilityAllowance, 0).toFixed(2)),
        totalAllowances: parseFloat(report.reduce((sum, r) => sum + r.totalAllowances, 0).toFixed(2)),
        totalBonus: parseFloat(report.reduce((sum, r) => sum + r.bonus, 0).toFixed(2)),
        totalGrossSalary: parseFloat(report.reduce((sum, r) => sum + r.grossSalary, 0).toFixed(2))
      },
      report
    };
  } catch (error) {
    console.error("[Report Service] Error generating allowances and bonuses report:", error);
    throw error;
  }
};

