import XLSX from 'xlsx';
import {
  getEmployeeTurnoverReport,
  getAttendanceReport,
  getPayrollCostReport,
  getEmployeeStructureReport,
  getSeniorityAndAgeReport,
  getEducationAndSkillsReport,
  getLeaveStatusReport,
  getAverageIncomeReport,
  getLateEarlyDetailReport,
  getAbsentDetailReport,
  getOvertimeDetailReport,
  getAllowancesAndBonusesReport
} from './reportService.js';
import { getAllEmployeesAnnualTaxSummary } from './taxService.js';

// Helper function to format number as VND
const formatVND = (num) => {
  return new Intl.NumberFormat('vi-VN').format(num || 0);
};

// Export turnover report to Excel
export const exportTurnoverReport = async (startDate, endDate) => {
  try {
    const report = await getEmployeeTurnoverReport(startDate, endDate);
    
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['BÁO CÁO BIẾN ĐỘNG NHÂN SỰ'],
      [''],
      ['Kỳ báo cáo:', `${startDate} đến ${endDate}`],
      [''],
      ['Tổng nhân viên đầu kỳ:', report.totalAtStart],
      ['Tổng nhân viên cuối kỳ:', report.totalAtEnd],
      ['Nhân viên mới:', report.newEmployees],
      ['Nhân viên nghỉ việc:', report.terminatedEmployees],
      ['Tỷ lệ luân chuyển:', `${report.turnoverRate}%`],
      [''],
      ['CHI TIẾT NHÂN VIÊN MỚI'],
      ['Mã NV', 'Họ tên', 'Ngày vào làm', 'Phòng ban']
    ];
    
    report.details.newEmployees.forEach(emp => {
      summaryData.push([
        emp.employeeCode || '-',
        emp.name,
        emp.startDate ? new Date(emp.startDate).toLocaleDateString('vi-VN') : '-',
        emp.departmentId || '-'
      ]);
    });
    
    summaryData.push(['']);
    summaryData.push(['CHI TIẾT NHÂN VIÊN NGHỈ VIỆC']);
    summaryData.push(['Mã NV', 'Họ tên', 'Trạng thái', 'Ngày nghỉ']);
    
    report.details.terminatedEmployees.forEach(emp => {
      summaryData.push([
        emp.employeeCode || '-',
        emp.name,
        emp.employmentStatus,
        emp.updatedAt ? new Date(emp.updatedAt).toLocaleDateString('vi-VN') : '-'
      ]);
    });
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng hợp');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting turnover report:", error);
    throw error;
  }
};

// Export attendance report to Excel
export const exportAttendanceReport = async (month, year) => {
  try {
    const report = await getAttendanceReport(month, year);
    
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['BÁO CÁO CHẤM CÔNG'],
      [''],
      ['Tháng/Năm:', `${month}/${year}`],
      [''],
      ['Mã NV', 'Họ tên', 'Phòng ban', 'Tổng ngày', 'Có mặt', 'Nghỉ phép', 'Vắng mặt', 'Đi muộn', 'Giờ OT', 'Tỷ lệ chấm công (%)']
    ];
    
    report.report.forEach(emp => {
      data.push([
        emp.employeeCode || '-',
        emp.employeeName,
        emp.department,
        emp.totalDays,
        emp.presentDays,
        emp.leaveDays,
        emp.absentDays,
        emp.lateCount,
        emp.overtimeHours,
        emp.attendanceRate
      ]);
    });
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Chấm công');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting attendance report:", error);
    throw error;
  }
};

// Export payroll cost report to Excel
export const exportPayrollCostReport = async (month, year) => {
  try {
    const report = await getPayrollCostReport(month, year);
    
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['BÁO CÁO CHI PHÍ LƯƠNG'],
      [''],
      ['Tháng/Năm:', `${month}/${year}`],
      [''],
      ['Tổng số nhân viên:', report.summary.totalEmployees],
      ['Tổng lương gộp:', formatVND(report.summary.totalGrossSalary)],
      ['Tổng lương thực nhận:', formatVND(report.summary.totalNetSalary)],
      ['Bảo hiểm nhân viên:', formatVND(report.summary.totalEmployeeInsurance)],
      ['Bảo hiểm công ty:', formatVND(report.summary.totalEmployerInsurance)],
      ['Tổng bảo hiểm:', formatVND(report.summary.totalInsurance)],
      ['Tổng thuế TNCN:', formatVND(report.summary.totalTax)],
      ['Tổng thưởng:', formatVND(report.summary.totalBonus)],
      ['Tổng khấu trừ:', formatVND(report.summary.totalDeduction)],
      ['Tổng chi phí:', formatVND(report.summary.totalCost)],
      [''],
      ['CHI TIẾT THEO NHÂN VIÊN'],
      ['Mã NV', 'Họ tên', 'Phòng ban', 'Lương gộp', 'Lương thực nhận', 'BH nhân viên', 'BH công ty', 'Thuế TNCN', 'Thưởng', 'Khấu trừ']
    ];
    
    report.breakdown.forEach(emp => {
      summaryData.push([
        emp.employeeCode || '-',
        emp.employeeName,
        emp.department,
        formatVND(emp.grossSalary),
        formatVND(emp.netSalary),
        formatVND(emp.employeeInsurance),
        formatVND(emp.employerInsurance),
        formatVND(emp.tax),
        formatVND(emp.bonus),
        formatVND(emp.deduction)
      ]);
    });
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Chi phí lương');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting payroll cost report:", error);
    throw error;
  }
};

// Export structure report to Excel
export const exportStructureReport = async () => {
  try {
    const report = await getEmployeeStructureReport();
    
    const workbook = XLSX.utils.book_new();
    
    // By Department
    const deptData = [
      ['THỐNG KÊ CƠ CẤU NHÂN SỰ - THEO PHÒNG BAN'],
      [''],
      ['Phòng ban', 'Số lượng', 'Tỷ lệ (%)']
    ];
    
    const total = report.total;
    report.byDepartment.forEach(dept => {
      const count = parseInt(dept.count) || 0;
      deptData.push([
        dept.departmentName || '-',
        count,
        total > 0 ? ((count / total) * 100).toFixed(2) : 0
      ]);
    });
    
    const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
    XLSX.utils.book_append_sheet(workbook, deptSheet, 'Theo phòng ban');
    
    // By Contract Type
    const contractData = [
      ['THỐNG KÊ CƠ CẤU NHÂN SỰ - THEO LOẠI HỢP ĐỒNG'],
      [''],
      ['Loại hợp đồng', 'Số lượng', 'Tỷ lệ (%)']
    ];
    
    report.byContractType.forEach(contract => {
      const count = parseInt(contract.count) || 0;
      const contractName = contract.contractType === 'probation' ? 'Thử việc' :
                          contract.contractType === '1_year' ? '1 năm' :
                          contract.contractType === '3_year' ? '3 năm' :
                          contract.contractType === 'indefinite' ? 'Không xác định' :
                          contract.contractType === 'other' ? 'Khác' : contract.contractType;
      contractData.push([
        contractName,
        count,
        total > 0 ? ((count / total) * 100).toFixed(2) : 0
      ]);
    });
    
    const contractSheet = XLSX.utils.aoa_to_sheet(contractData);
    XLSX.utils.book_append_sheet(workbook, contractSheet, 'Theo hợp đồng');
    
    // By Job Title
    const jobData = [
      ['THỐNG KÊ CƠ CẤU NHÂN SỰ - THEO CHỨC VỤ'],
      [''],
      ['Chức vụ', 'Số lượng', 'Tỷ lệ (%)']
    ];
    
    report.byJobTitle.forEach(job => {
      const count = parseInt(job.count) || 0;
      jobData.push([
        job.jobTitleName || '-',
        count,
        total > 0 ? ((count / total) * 100).toFixed(2) : 0
      ]);
    });
    
    const jobSheet = XLSX.utils.aoa_to_sheet(jobData);
    XLSX.utils.book_append_sheet(workbook, jobSheet, 'Theo chức vụ');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting structure report:", error);
    throw error;
  }
};

// Export seniority and age report to Excel
export const exportSeniorityAndAgeReport = async () => {
  try {
    const report = await getSeniorityAndAgeReport();
    
    const workbook = XLSX.utils.book_new();
    
    // Age distribution
    const ageData = [
      ['THỐNG KÊ PHÂN BỔ THEO ĐỘ TUỔI'],
      [''],
      ['Nhóm tuổi', 'Số lượng', 'Tỷ lệ (%)']
    ];
    
    report.ageDistribution.forEach(age => {
      ageData.push([age.ageGroup, age.count, age.percentage]);
    });
    
    const ageSheet = XLSX.utils.aoa_to_sheet(ageData);
    XLSX.utils.book_append_sheet(workbook, ageSheet, 'Theo độ tuổi');
    
    // Seniority distribution
    const seniorityData = [
      ['THỐNG KÊ PHÂN BỔ THEO THÂM NIÊN'],
      [''],
      ['Nhóm thâm niên', 'Số lượng', 'Tỷ lệ (%)']
    ];
    
    report.seniorityDistribution.forEach(sen => {
      seniorityData.push([sen.seniorityGroup, sen.count, sen.percentage]);
    });
    
    const senioritySheet = XLSX.utils.aoa_to_sheet(seniorityData);
    XLSX.utils.book_append_sheet(workbook, senioritySheet, 'Theo thâm niên');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting seniority and age report:", error);
    throw error;
  }
};

// Export education and skills report to Excel
export const exportEducationAndSkillsReport = async () => {
  try {
    const report = await getEducationAndSkillsReport();
    
    const workbook = XLSX.utils.book_new();
    
    // By Education Level
    const eduData = [
      ['THỐNG KÊ TRÌNH ĐỘ HỌC VẤN'],
      [''],
      ['Trình độ', 'Số lượng', 'Tỷ lệ (%)']
    ];
    
    report.byEducationLevel.forEach(edu => {
      eduData.push([edu.level, edu.count, edu.percentage]);
    });
    
    const eduSheet = XLSX.utils.aoa_to_sheet(eduData);
    XLSX.utils.book_append_sheet(workbook, eduSheet, 'Trình độ học vấn');
    
    // By Qualification Type
    const qualData = [
      ['THỐNG KÊ CHỨNG CHỈ'],
      [''],
      ['Loại chứng chỉ', 'Số lượng', 'Tỷ lệ (%)']
    ];
    
    report.byQualificationType.forEach(qual => {
      const typeName = qual.type === 'certificate' ? 'Chứng chỉ' :
                      qual.type === 'degree' ? 'Bằng cấp' :
                      qual.type === 'license' ? 'Giấy phép' :
                      qual.type === 'training' ? 'Đào tạo' : qual.type;
      qualData.push([typeName, qual.count, qual.percentage]);
    });
    
    const qualSheet = XLSX.utils.aoa_to_sheet(qualData);
    XLSX.utils.book_append_sheet(workbook, qualSheet, 'Chứng chỉ');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting education and skills report:", error);
    throw error;
  }
};

// Export leave status report to Excel
export const exportLeaveStatusReport = async (year) => {
  try {
    const report = await getLeaveStatusReport(year);
    
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['BÁO CÁO TÌNH TRẠNG NGHỈ PHÉP'],
      [''],
      ['Năm:', year],
      [''],
      ['Tổng số nhân viên:', report.totalEmployees],
      ['Tổng ngày phép đã dùng:', report.summary.totalLeaveDaysUsed],
      ['Tổng ngày phép còn lại:', report.summary.totalRemainingLeaveDays],
      ['Tỷ lệ sử dụng trung bình:', `${report.summary.averageUtilizationRate}%`],
      [''],
      ['CHI TIẾT THEO NHÂN VIÊN'],
      ['Mã NV', 'Họ tên', 'Phòng ban', 'Đã dùng', 'Còn lại', 'Chuẩn', 'Tỷ lệ sử dụng (%)']
    ];
    
    report.report.forEach(emp => {
      data.push([
        emp.employeeCode || '-',
        emp.employeeName,
        emp.department,
        emp.totalLeaveDaysUsed,
        emp.remainingLeaveDays,
        emp.standardLeaveDays,
        emp.utilizationRate
      ]);
    });
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Nghỉ phép');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting leave status report:", error);
    throw error;
  }
};

// Export average income report to Excel
export const exportAverageIncomeReport = async (month, year) => {
  try {
    const report = await getAverageIncomeReport(month, year);
    
    const workbook = XLSX.utils.book_new();
    
    // By Job Title
    const jobData = [
      ['PHÂN TÍCH THU NHẬP BÌNH QUÂN - THEO VỊ TRÍ'],
      [''],
      ['Tháng/Năm:', `${month}/${year}`],
      [''],
      ['Vị trí', 'Số lượng', 'Trung bình', 'Tối thiểu', 'Tối đa', 'Trung vị', 'Tổng']
    ];
    
    report.byJobTitle.forEach(job => {
      jobData.push([
        job.name,
        job.count,
        formatVND(job.average),
        formatVND(job.min),
        formatVND(job.max),
        formatVND(job.median),
        formatVND(job.total)
      ]);
    });
    
    const jobSheet = XLSX.utils.aoa_to_sheet(jobData);
    XLSX.utils.book_append_sheet(workbook, jobSheet, 'Theo vị trí');
    
    // By Department
    const deptData = [
      ['PHÂN TÍCH THU NHẬP BÌNH QUÂN - THEO PHÒNG BAN'],
      [''],
      ['Tháng/Năm:', `${month}/${year}`],
      [''],
      ['Phòng ban', 'Số lượng', 'Trung bình', 'Tối thiểu', 'Tối đa', 'Trung vị', 'Tổng']
    ];
    
    report.byDepartment.forEach(dept => {
      deptData.push([
        dept.name,
        dept.count,
        formatVND(dept.average),
        formatVND(dept.min),
        formatVND(dept.max),
        formatVND(dept.median),
        formatVND(dept.total)
      ]);
    });
    
    const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
    XLSX.utils.book_append_sheet(workbook, deptSheet, 'Theo phòng ban');
    
    // Overall summary
    const summaryData = [
      ['TỔNG QUAN'],
      [''],
      ['Tổng số nhân viên:', report.overall.totalEmployees],
      ['Lương trung bình:', formatVND(report.overall.averageSalary)],
      ['Lương tối thiểu:', formatVND(report.overall.minSalary)],
      ['Lương tối đa:', formatVND(report.overall.maxSalary)]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting average income report:", error);
    throw error;
  }
};

// Export late/early detail report to Excel
export const exportLateEarlyDetailReport = async (month, year) => {
  try {
    const report = await getLateEarlyDetailReport(month, year);
    
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['BÁO CÁO ĐI MUỘN/VỀ SỚM CHI TIẾT'],
      [''],
      ['Tháng/Năm:', `${month}/${year}`],
      [''],
      ['Tổng vi phạm:', report.totalViolations],
      ['Tổng đi muộn:', report.totalLate],
      ['Tổng về sớm:', report.totalEarlyLeave],
      ['Số nhân viên vi phạm:', report.employeesWithViolations],
      [''],
      ['CHI TIẾT THEO NHÂN VIÊN'],
      ['Mã NV', 'Họ tên', 'Phòng ban', 'Đi muộn', 'Về sớm', 'Tổng vi phạm']
    ];
    
    report.report.forEach(emp => {
      data.push([
        emp.employeeCode || '-',
        emp.employeeName,
        emp.department,
        emp.lateCount,
        emp.earlyLeaveCount,
        emp.totalViolations
      ]);
    });
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Vi phạm');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting late/early detail report:", error);
    throw error;
  }
};

// Export absent detail report to Excel
export const exportAbsentDetailReport = async (month, year) => {
  try {
    const report = await getAbsentDetailReport(month, year);
    
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['BÁO CÁO VẮNG MẶT CHI TIẾT'],
      [''],
      ['Tháng/Năm:', `${month}/${year}`],
      [''],
      ['Tổng số nhân viên:', report.totalEmployees],
      ['Tổng ngày có mặt:', report.summary.totalPresentDays],
      ['Tổng ngày nghỉ phép:', report.summary.totalLeaveDays],
      ['Tổng ngày vắng mặt:', report.summary.totalAbsentDays],
      ['Tỷ lệ chấm công trung bình:', `${report.summary.averageAttendanceRate}%`],
      [''],
      ['CHI TIẾT THEO NHÂN VIÊN'],
      ['Mã NV', 'Họ tên', 'Phòng ban', 'Tổng ngày', 'Có mặt', 'Nghỉ phép', 'Vắng mặt', 'Tỷ lệ chấm công (%)', 'Tỷ lệ vắng mặt (%)']
    ];
    
    report.report.forEach(emp => {
      data.push([
        emp.employeeCode || '-',
        emp.employeeName,
        emp.department,
        emp.totalDays,
        emp.presentDays,
        emp.leaveDays,
        emp.absentDays,
        emp.attendanceRate,
        emp.absentRate
      ]);
    });
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Vắng mặt');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting absent detail report:", error);
    throw error;
  }
};

// Export overtime detail report to Excel
export const exportOvertimeDetailReport = async (month, year) => {
  try {
    const report = await getOvertimeDetailReport(month, year);
    
    const workbook = XLSX.utils.book_new();
    
    // By Employee
    const empData = [
      ['BÁO CÁO GIỜ LÀM THÊM - THEO NHÂN VIÊN'],
      [''],
      ['Tháng/Năm:', `${month}/${year}`],
      [''],
      ['Mã NV', 'Họ tên', 'Phòng ban', 'Tổng giờ', 'Số đơn', 'Trung bình/đơn']
    ];
    
    report.byEmployee.forEach(emp => {
      empData.push([
        emp.employeeCode || '-',
        emp.employeeName,
        emp.department,
        emp.totalHours,
        emp.requestCount,
        emp.averageHoursPerRequest
      ]);
    });
    
    const empSheet = XLSX.utils.aoa_to_sheet(empData);
    XLSX.utils.book_append_sheet(workbook, empSheet, 'Theo nhân viên');
    
    // By Department
    const deptData = [
      ['BÁO CÁO GIỜ LÀM THÊM - THEO PHÒNG BAN'],
      [''],
      ['Tháng/Năm:', `${month}/${year}`],
      [''],
      ['Phòng ban', 'Tổng giờ', 'Số nhân viên', 'Số đơn', 'Trung bình/NV']
    ];
    
    report.byDepartment.forEach(dept => {
      deptData.push([
        dept.departmentName,
        dept.totalHours,
        dept.employeeCount,
        dept.requestCount,
        dept.averageHoursPerEmployee
      ]);
    });
    
    const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
    XLSX.utils.book_append_sheet(workbook, deptSheet, 'Theo phòng ban');
    
    // Summary
    const summaryData = [
      ['TỔNG QUAN'],
      [''],
      ['Tổng giờ làm thêm:', report.summary.totalHours],
      ['Tổng số đơn:', report.summary.totalRequests],
      ['Số nhân viên:', report.summary.totalEmployees],
      ['Trung bình/NV:', report.summary.averageHoursPerEmployee]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting overtime detail report:", error);
    throw error;
  }
};

// Export allowances and bonuses report to Excel
export const exportAllowancesAndBonusesReport = async (month, year) => {
  try {
    const report = await getAllowancesAndBonusesReport(month, year);
    
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['BÁO CÁO PHỤ CẤP VÀ THƯỞNG'],
      [''],
      ['Tháng/Năm:', `${month}/${year}`],
      [''],
      ['Tổng số nhân viên:', report.summary.totalEmployees],
      ['Tổng lương cơ bản:', formatVND(report.summary.totalBaseSalary)],
      ['Tổng phụ cấp ăn trưa:', formatVND(report.summary.totalLunchAllowance)],
      ['Tổng phụ cấp xăng xe:', formatVND(report.summary.totalTransportAllowance)],
      ['Tổng phụ cấp điện thoại:', formatVND(report.summary.totalPhoneAllowance)],
      ['Tổng phụ cấp trách nhiệm:', formatVND(report.summary.totalResponsibilityAllowance)],
      ['Tổng phụ cấp:', formatVND(report.summary.totalAllowances)],
      ['Tổng thưởng:', formatVND(report.summary.totalBonus)],
      ['Tổng lương gộp:', formatVND(report.summary.totalGrossSalary)],
      [''],
      ['CHI TIẾT THEO NHÂN VIÊN'],
      ['Mã NV', 'Họ tên', 'Phòng ban', 'Lương cơ bản', 'Phụ cấp ăn trưa', 'Phụ cấp xăng xe', 'Phụ cấp điện thoại', 'Phụ cấp trách nhiệm', 'Tổng phụ cấp', 'Thưởng', 'Lương gộp']
    ];
    
    report.report.forEach(emp => {
      data.push([
        emp.employeeCode || '-',
        emp.employeeName,
        emp.department,
        formatVND(emp.baseSalary),
        formatVND(emp.lunchAllowance),
        formatVND(emp.transportAllowance),
        formatVND(emp.phoneAllowance),
        formatVND(emp.responsibilityAllowance),
        formatVND(emp.totalAllowances),
        formatVND(emp.bonus),
        formatVND(emp.grossSalary)
      ]);
    });
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Phụ cấp & Thưởng');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting allowances and bonuses report:", error);
    throw error;
  }
};

// Export annual tax summary to Excel
export const exportAnnualTaxSummary = async (year) => {
  try {
    const report = await getAllEmployeesAnnualTaxSummary(year);
    
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['BẢNG TỔNG HỢP QUYẾT TOÁN THUẾ TNCN'],
      [''],
      ['Năm:', year],
      [''],
      ['Tổng số nhân viên:', report.totalEmployees],
      ['Số nhân viên có dữ liệu:', report.employeesWithTaxData],
      ['Tổng thu nhập chịu thuế:', formatVND(report.totalTaxableIncome)],
      ['Tổng thuế đã khấu trừ:', formatVND(report.totalTaxPaid)],
      [''],
      ['CHI TIẾT THEO NHÂN VIÊN'],
      ['Mã NV', 'Họ tên', 'Mã số thuế', 'Thu nhập chịu thuế', 'Giảm trừ bản thân', 'Giảm trừ người phụ thuộc', 'Tổng giảm trừ', 'Thuế phải nộp', 'Số người phụ thuộc']
    ];
    
    report.summaries.forEach(summary => {
      data.push([
        summary.employeeCode || '-',
        summary.employeeName,
        summary.taxCode || '-',
        formatVND(summary.totalTaxableIncome),
        formatVND(summary.annualTaxCalculation.personalDeduction),
        formatVND(summary.annualTaxCalculation.dependentDeduction),
        formatVND(summary.annualTaxCalculation.totalDeduction),
        formatVND(summary.annualTaxCalculation.taxAmount),
        summary.dependentCount
      ]);
    });
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Quyết toán thuế');
    
    return workbook;
  } catch (error) {
    console.error("[Excel Export] Error exporting annual tax summary:", error);
    throw error;
  }
};


