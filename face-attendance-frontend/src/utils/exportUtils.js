import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { calculateCompleteSalary, SALARY_CONSTANTS } from './salaryCalculation.js';

// Export employees to Excel
export const exportEmployeesToExcel = (employees, filename = 'danh-sach-nhan-vien') => {
  const data = employees.map(emp => ({
    'Mã NV': emp.employeeCode || '',
    'Tên': emp.name || '',
    'Email': emp.email || '',
    'Vai trò': emp.role || '',
    'Trạng thái': emp.isActive ? 'Hoạt động' : 'Không hoạt động',
    'Đã đăng ký khuôn mặt': (emp.FaceProfiles && emp.FaceProfiles.length > 0) ? 'Có' : 'Không',
    'Ngày tạo': emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('vi-VN') : '',
    'Lương cơ bản': emp.baseSalary || 0
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nhân viên');
  
  // Auto-size columns
  const colWidths = [
    { wch: 12 }, // Mã NV
    { wch: 25 }, // Tên
    { wch: 30 }, // Email
    { wch: 12 }, // Vai trò
    { wch: 15 }, // Trạng thái
    { wch: 20 }, // Đã đăng ký
    { wch: 15 }, // Ngày tạo
    { wch: 15 }  // Lương cơ bản
  ];
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Export attendance logs to Excel
export const exportAttendanceToExcel = (logs, employees, filename = 'lich-su-diem-danh') => {
  const data = logs.map(log => {
    const emp = employees.find(e => e.id === log.userId);
    return {
      'Thời gian': log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '',
      'Nhân viên': emp?.name || log.detectedName || 'Unknown',
      'Mã NV': emp?.employeeCode || '',
      'Loại': log.type === 'IN' ? 'Vào' : 'Ra',
      'Độ tin cậy': log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : '',
      'Khoảng cách': log.matchDistance ? log.matchDistance.toFixed(3) : '',
      'Thiết bị': log.deviceId || '',
      'Muộn': log.isLate ? 'Có' : 'Không',
      'Về sớm': log.isEarlyLeave ? 'Có' : 'Không',
      'Tăng ca': log.isOvertime ? 'Có' : 'Không',
      'Ghi chú': log.note || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Điểm danh');
  
  // Auto-size columns
  const colWidths = [
    { wch: 20 }, // Thời gian
    { wch: 25 }, // Nhân viên
    { wch: 12 }, // Mã NV
    { wch: 8 },  // Loại
    { wch: 12 }, // Độ tin cậy
    { wch: 12 }, // Khoảng cách
    { wch: 15 }, // Thiết bị
    { wch: 8 },  // Muộn
    { wch: 10 }, // Về sớm
    { wch: 10 }, // Tăng ca
    { wch: 30 }  // Ghi chú
  ];
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Export salaries to Excel with detailed breakdown
export const exportSalariesToExcel = (salaries, filename = 'bang-luong') => {
  const formatNumber = (num) => {
    return new Intl.NumberFormat('vi-VN').format(num || 0);
  };

  const data = salaries.map(salary => {
    // Extract data
    const baseSalary = parseFloat(salary.baseSalary) || SALARY_CONSTANTS.BASE_SALARY;
    const totalCoefficient = parseFloat(salary.User?.totalCoefficient) || 
                            parseFloat(salary.totalCoefficient) || 
                            parseFloat(salary.User?.coefficient) || 
                            parseFloat(salary.coefficient) || 1;
    const dependents = parseInt(salary.User?.dependents) || parseInt(salary.dependents) || 0;
    const bonus = parseFloat(salary.bonus) || 0;
    const deduction = parseFloat(salary.deduction) || 0;

    // Calculate detailed salary breakdown
    let salaryCalc = null;
    try {
      salaryCalc = calculateCompleteSalary({
        baseSalary,
        totalCoefficient,
        dependents,
        bonus,
        deduction,
      });
    } catch (error) {
      console.error('Error calculating salary for export:', error);
    }

    return {
      'Employee': salary.User?.name || '',
      'Code': salary.User?.employeeCode || '',
      'Job Title': salary.User?.jobTitle || '',
      'Month': salary.month || '',
      'Year': salary.year || '',
      'Base Salary': baseSalary,
      'Coefficient': totalCoefficient.toFixed(2),
      'Gross Salary': salaryCalc?.grossSalary || (baseSalary * totalCoefficient),
      'Bonus': bonus,
      'BHXH (8%)': salaryCalc?.insurance?.bhxh || 0,
      'BHYT (1.5%)': salaryCalc?.insurance?.bhyt || 0,
      'BHTN (1%)': salaryCalc?.insurance?.bhtn || 0,
      'Total Insurance': salaryCalc?.insurance?.total || 0,
      'Taxable Income': salaryCalc?.tax?.taxableIncome || 0,
      'Deduction': salaryCalc?.tax?.personalDeduction || 0,
      'PIT': salaryCalc?.tax?.pit || 0,
      'Other Deduction': deduction,
      'Net Pay': salaryCalc?.netSalary || salary.finalSalary || 0,
      'Dependents': dependents,
      'Status': salary.status === 'paid' ? 'Paid' : 
                salary.status === 'approved' ? 'Approved' : 'Pending',
      'Calculated At': salary.calculatedAt ? new Date(salary.calculatedAt).toLocaleDateString('en-US') : ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
  
  // Auto-size columns
  const colWidths = [
    { wch: 25 }, // Nhân viên
    { wch: 12 }, // Mã NV
    { wch: 20 }, // Chức vụ
    { wch: 8 },  // Tháng
    { wch: 8 },  // Năm
    { wch: 15 }, // Lương cơ sở
    { wch: 12 }, // Tổng hệ số
    { wch: 15 }, // Lương gộp
    { wch: 15 }, // Thưởng
    { wch: 15 }, // BHXH
    { wch: 15 }, // BHYT
    { wch: 15 }, // BHTN
    { wch: 15 }, // Tổng BH
    { wch: 18 }, // Thu nhập chịu thuế
    { wch: 18 }, // Giảm trừ gia cảnh
    { wch: 15 }, // Thuế TNCN
    { wch: 15 }, // Khấu trừ khác
    { wch: 15 }, // Thực nhận
    { wch: 12 }, // Người phụ thuộc
    { wch: 15 }, // Trạng thái
    { wch: 15 }  // Ngày tính
  ];
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Export employees to PDF
export const exportEmployeesToPDF = (employees, filename = 'danh-sach-nhan-vien') => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('Danh Sách Nhân Viên', 14, 20);
  doc.setFontSize(12);
  doc.text(`Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`, 14, 28);
  doc.text(`Tổng số: ${employees.length} nhân viên`, 14, 34);

  // Table data
  const tableData = employees.map(emp => [
    emp.employeeCode || '',
    emp.name || '',
    emp.email || '',
    emp.role || '',
    emp.isActive ? 'Hoạt động' : 'Không hoạt động',
    (emp.FaceProfiles && emp.FaceProfiles.length > 0) ? 'Có' : 'Không'
  ]);

  doc.autoTable({
    startY: 40,
    head: [['Mã NV', 'Tên', 'Email', 'Vai trò', 'Trạng thái', 'Đã đăng ký']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [102, 126, 234] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.save(`${filename}.pdf`);
};

// Export salaries to PDF with detailed breakdown
export const exportSalariesToPDF = (salaries, filename = 'bang-luong') => {
  const doc = new jsPDF('landscape');
  
  const formatNumber = (num) => {
    return new Intl.NumberFormat('vi-VN').format(num || 0);
  };

  // Title
  doc.setFontSize(18);
  doc.text('Payroll Details', 14, 20);
  doc.setFontSize(12);
  doc.text(`Exported: ${new Date().toLocaleDateString('en-US')}`, 14, 28);
  doc.text(`Total: ${salaries.length} employees`, 14, 34);

  // Prepare table data with detailed breakdown
  const tableData = salaries.map(salary => {
    const baseSalary = parseFloat(salary.baseSalary) || SALARY_CONSTANTS.BASE_SALARY;
    const totalCoefficient = parseFloat(salary.User?.totalCoefficient) || 
                            parseFloat(salary.totalCoefficient) || 
                            parseFloat(salary.User?.coefficient) || 
                            parseFloat(salary.coefficient) || 1;
    const dependents = parseInt(salary.User?.dependents) || parseInt(salary.dependents) || 0;
    const bonus = parseFloat(salary.bonus) || 0;
    const deduction = parseFloat(salary.deduction) || 0;

    let salaryCalc = null;
    try {
      salaryCalc = calculateCompleteSalary({
        baseSalary,
        totalCoefficient,
        dependents,
        bonus,
        deduction,
      });
    } catch (error) {
      console.error('Error calculating salary for PDF export:', error);
    }

    return [
      salary.User?.employeeCode || '',
      salary.User?.name || '',
      formatNumber(baseSalary),
      totalCoefficient.toFixed(2),
      formatNumber(salaryCalc?.grossSalary || baseSalary * totalCoefficient),
      formatNumber(bonus),
      formatNumber(salaryCalc?.insurance?.bhxh || 0),
      formatNumber(salaryCalc?.insurance?.bhyt || 0),
      formatNumber(salaryCalc?.insurance?.bhtn || 0),
      formatNumber(salaryCalc?.insurance?.total || 0),
      formatNumber(salaryCalc?.tax?.pit || 0),
      formatNumber(deduction),
      formatNumber(salaryCalc?.netSalary || salary.finalSalary || 0),
      salary.status === 'paid' ? 'Paid' : 
      salary.status === 'approved' ? 'Approved' : 'Pending'
    ];
  });

  doc.autoTable({
    head: [[
      'Code', 'Employee', 'Base Salary', 'Coeff', 'Gross', 'Bonus',
      'BHXH', 'BHYT', 'BHTN', 'Total Ins', 'PIT', 'Deduction', 'Net Pay', 'Status'
    ]],
    body: tableData,
    startY: 42,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`${filename}.pdf`);
};

// Export attendance to PDF
export const exportAttendanceToPDF = (logs, employees, filename = 'lich-su-diem-danh') => {
  const doc = new jsPDF('landscape');
  
  // Title
  doc.setFontSize(18);
  doc.text('Lịch Sử Điểm Danh', 14, 20);
  doc.setFontSize(12);
  doc.text(`Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`, 14, 28);
  doc.text(`Tổng số: ${logs.length} bản ghi`, 14, 34);

  // Table data
  const tableData = logs.slice(0, 100).map(log => {
    const emp = employees.find(e => e.id === log.userId);
    return [
      new Date(log.timestamp).toLocaleString('vi-VN'),
      emp?.name || log.detectedName || 'Unknown',
      emp?.employeeCode || '',
      log.type === 'IN' ? 'Vào' : 'Ra',
      log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : '',
      log.deviceId || ''
    ];
  });

  doc.autoTable({
    startY: 40,
    head: [['Thời gian', 'Nhân viên', 'Mã NV', 'Loại', 'Độ tin cậy', 'Thiết bị']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 172, 254] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.save(`${filename}.pdf`);
};

// Download Excel template for bulk import
export const downloadEmployeeTemplate = () => {
  try {
    // Create template with example rows
    const template = [
      {
        'Mã NV': 'NV001',
        'Tên': 'Nguyễn Văn A',
        'Email': 'nguyenvana@example.com',
        'Lương cơ bản': 10000000
      },
      {
        'Mã NV': 'NV002',
        'Tên': 'Trần Thị B',
        'Email': 'tranthib@example.com',
        'Lương cơ bản': 12000000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mẫu');
    
    // Set column widths
    const colWidths = [
      { wch: 12 }, // Mã NV
      { wch: 25 }, // Tên
      { wch: 30 }, // Email
      { wch: 15 }  // Lương cơ bản
    ];
    ws['!cols'] = colWidths;

    // Add number formatting for salary column
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let row = 1; row <= range.e.r; row++) {
      const salaryCell = XLSX.utils.encode_cell({ r: row, c: 3 });
      if (ws[salaryCell]) {
        ws[salaryCell].z = '#,##0';
      }
    }
    
    XLSX.writeFile(wb, 'mau-nhap-nhan-vien.xlsx');
    console.log('✅ Template downloaded successfully');
  } catch (error) {
    console.error('Error downloading template:', error);
    alert(`Lỗi khi tải template: ${error.message}`);
  }
};

// Import employees from Excel file
export const importEmployeesFromExcel = async (file) => {
  return new Promise((resolve, reject) => {
    // Validate file type
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidFile) {
      reject(new Error('File không hợp lệ! Vui lòng chọn file Excel (.xlsx hoặc .xls)'));
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      reject(new Error('File quá lớn! Kích thước tối đa là 5MB'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Check if workbook has sheets
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File Excel không có dữ liệu!');
        }
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Check if sheet has data
        if (!jsonData || jsonData.length === 0) {
          throw new Error('File Excel không có dữ liệu nhân viên!');
        }
        
        // Validate and format data
        const employees = [];
        const errors = [];
        
        jsonData.forEach((row, index) => {
          const rowNumber = index + 2; // +2 because index starts at 0 and header is row 1
          
          try {
            // Check required fields
            if (!row['Mã NV'] || String(row['Mã NV']).trim() === '') {
              errors.push(`Dòng ${rowNumber}: Thiếu "Mã NV"`);
              return;
            }
            
            if (!row['Tên'] || String(row['Tên']).trim() === '') {
              errors.push(`Dòng ${rowNumber}: Thiếu "Tên"`);
              return;
            }
            
            if (!row['Email'] || String(row['Email']).trim() === '') {
              errors.push(`Dòng ${rowNumber}: Thiếu "Email"`);
              return;
            }
            
            // Validate email format
            const email = String(row['Email']).trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              errors.push(`Dòng ${rowNumber}: Email không hợp lệ: ${email}`);
              return;
            }
            
            // Validate employee code format (should not be empty and should be string)
            const employeeCode = String(row['Mã NV']).trim();
            if (employeeCode.length === 0) {
              errors.push(`Dòng ${rowNumber}: Mã NV không được để trống`);
              return;
            }
            
            // Parse base salary
            let baseSalary = 0;
            if (row['Lương cơ bản']) {
              const salaryValue = parseFloat(row['Lương cơ bản']);
              if (!isNaN(salaryValue) && salaryValue >= 0) {
                baseSalary = salaryValue;
              } else {
                errors.push(`Dòng ${rowNumber}: Lương cơ bản không hợp lệ, sẽ đặt mặc định là 0`);
              }
            }
            
            employees.push({
              employeeCode: employeeCode,
              name: String(row['Tên']).trim(),
              email: email,
              baseSalary: baseSalary
            });
          } catch (rowError) {
            errors.push(`Dòng ${rowNumber}: ${rowError.message}`);
          }
        });
        
        // If there are errors, show them but still return valid employees
        if (errors.length > 0) {
          console.warn('Import warnings:', errors);
          // Show warnings but don't fail if there are valid employees
          if (employees.length === 0) {
            reject(new Error(`Không có dữ liệu hợp lệ!\n${errors.join('\n')}`));
            return;
          }
          // Show warnings but continue with valid data
          alert(`Cảnh báo:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... và ${errors.length - 5} cảnh báo khác` : ''}\n\nSẽ import ${employees.length} nhân viên hợp lệ.`);
        }
        
        if (employees.length === 0) {
          reject(new Error('Không có dữ liệu nhân viên hợp lệ trong file!'));
          return;
        }
        
        resolve(employees);
      } catch (error) {
        reject(new Error(`Lỗi khi đọc file Excel: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Lỗi đọc file. Vui lòng thử lại!'));
    reader.onabort = () => reject(new Error('Đã hủy đọc file!'));
    reader.readAsArrayBuffer(file);
  });
};

