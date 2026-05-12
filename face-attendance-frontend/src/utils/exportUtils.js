import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { calculateCompleteSalary, SALARY_CONSTANTS } from './salaryCalculation.js';
import { toastError, toastWarning } from '../lib/notify.jsx';
import notoSansRegularUrl from '../assets/fonts/NotoSans-Regular.ttf?url';

applyPlugin(jsPDF);

const ensureAutoTable = (doc) => {
  if (typeof doc.autoTable !== 'function') {
    throw new Error('jspdf-autotable plugin failed to load. Please restart the dev server.');
  }
};

const ATTENDANCE_SUMMARY_COLUMNS = [
  { key: 'day', header: 'Day', widthChars: 14, widthPx: 120, align: 'left' },
  { key: 'date', header: 'Date', widthChars: 14, widthPx: 100, align: 'left' },
  { key: 'morningCheckIn', header: 'Morning Check-in', widthChars: 16, widthPx: 130, align: 'center' },
  { key: 'morningCheckOut', header: 'Morning Check-out', widthChars: 16, widthPx: 130, align: 'center' },
  { key: 'afternoonCheckIn', header: 'Afternoon Check-in', widthChars: 16, widthPx: 130, align: 'center' },
  { key: 'finalCheckOut', header: 'Final Check-out', widthChars: 16, widthPx: 130, align: 'center' },
  { key: 'lateMinutes', header: 'Late (mins)', widthChars: 12, widthPx: 100, align: 'center' },
  { key: 'earlyLeaveMinutes', header: 'Early Leave (mins)', widthChars: 16, widthPx: 120, align: 'center' },
  { key: 'otHours', header: 'OT Hours', widthChars: 10, widthPx: 90, align: 'center' },
  { key: 'approvedEarlyLeave', header: 'Approved Early Leave', widthChars: 18, widthPx: 140, align: 'center' },
  { key: 'status', header: 'Status', widthChars: 14, widthPx: 120, align: 'left' },
];

const ATTENDANCE_PDF_ROWS_PER_PAGE = 24;

const getAttendanceEmployeeMap = (employees = []) =>
  new Map((employees || []).map((employee) => [String(employee.id), employee]));

const extractMinutesFromNote = (note, prefix) => {
  if (!note) return 0;
  const regex = new RegExp(`${prefix}\\s*by\\s*(\\d+)\\s*min`, 'i');
  const match = note.match(regex);
  if (match) return parseInt(match[1], 10);
  return 0;
};

const formatAttendanceTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const buildAttendanceSummaryRows = (logs = [], employees = []) => {
  const employeeMap = getAttendanceEmployeeMap(employees);
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Ho_Chi_Minh' });

  const groups = new Map();

  logs.forEach((log) => {
    const timestamp = new Date(log.timestamp);
    const dateKey = dateFormatter.format(timestamp);
    const employeeKey = String(log.userId || 'unknown');
    const groupKey = `${employeeKey}||${dateKey}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        employeeId: log.userId,
        dateKey,
        logs: [],
      });
    }

    groups.get(groupKey).logs.push(log);
  });

  const rows = [];
  groups.forEach(({ employeeId, dateKey, logs }) => {
    const employee = employeeMap.get(String(employeeId)) || {};
    const sortedLogs = logs.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const morningInCandidates = sortedLogs.filter((log) => log.type === 'IN' && new Date(log.timestamp).getHours() < 12);
    const afternoonInCandidates = sortedLogs.filter((log) => log.type === 'IN' && new Date(log.timestamp).getHours() >= 12);
    const morningOutCandidates = sortedLogs.filter((log) => log.type === 'OUT' && new Date(log.timestamp).getHours() < 13);
    const finalOutCandidates = sortedLogs.filter((log) => log.type === 'OUT');

    const morningCheckIn = morningInCandidates[0] || sortedLogs.find((log) => log.type === 'IN');
    const morningCheckOut = morningOutCandidates.length > 0
      ? morningOutCandidates[morningOutCandidates.length - 1]
      : sortedLogs.find((log) => log.type === 'OUT');
    const afternoonCheckIn = afternoonInCandidates[0] || sortedLogs.slice().reverse().find((log) => log.type === 'IN');
    const finalCheckOut = finalOutCandidates.length > 0 ? finalOutCandidates[finalOutCandidates.length - 1] : null;

    const lateMinutes = sortedLogs
      .filter((log) => log.type === 'IN' && log.isLate)
      .reduce((sum, log) => sum + extractMinutesFromNote(log.note, 'Late'), 0);

    const earlyLeaveMinutes = sortedLogs
      .filter((log) => log.type === 'OUT' && log.isEarlyLeave)
      .reduce((sum, log) => sum + extractMinutesFromNote(log.note, 'Left early'), 0);

    const otMinutes = sortedLogs
      .filter((log) => log.isOvertime)
      .reduce((sum, log) => {
        const overtimeMinutes = extractMinutesFromNote(log.note, 'Overtime');
        return sum + (overtimeMinutes || 0);
      }, 0);

    const hasApprovedEarlyLeave = sortedLogs.some((log) => /approved.*early/i.test(log.note || ''));
    const status = hasApprovedEarlyLeave
      ? 'Approved Early Leave'
      : (lateMinutes > 0 && otMinutes > 0)
        ? 'Late + OT'
        : lateMinutes > 0
          ? 'Late'
          : otMinutes > 0
            ? 'OT'
            : sortedLogs.some((log) => log.isEarlyLeave)
              ? 'Early Leave'
              : 'On Time';

    rows.push({
      employeeName: employee.name || '',
      employeeCode: employee.employeeCode || '',
      day: dayFormatter.format(new Date(`${dateKey}T00:00:00`)),
      date: dateKey,
      morningCheckIn: formatAttendanceTime(morningCheckIn?.timestamp),
      morningCheckOut: formatAttendanceTime(morningCheckOut?.timestamp),
      afternoonCheckIn: formatAttendanceTime(afternoonCheckIn?.timestamp),
      finalCheckOut: formatAttendanceTime(finalCheckOut?.timestamp),
      lateMinutes: lateMinutes > 0 ? lateMinutes : '',
      earlyLeaveMinutes: earlyLeaveMinutes > 0 ? earlyLeaveMinutes : '',
      otHours: otMinutes > 0 ? (otMinutes / 60).toFixed(1) : '',
      approvedEarlyLeave: hasApprovedEarlyLeave ? 'Yes' : 'No',
      status,
    });
  });

  return rows.sort((a, b) => {
    if (a.date === b.date) return (a.employeeName || '').localeCompare(b.employeeName || '');
    return a.date.localeCompare(b.date);
  });
};

const chunkItems = (items, chunkSize) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildAttendancePdfPageHtml = ({ rows, pageIndex, totalPages, totalRows, exportDate }) => {
  const tableWidth = ATTENDANCE_SUMMARY_COLUMNS.reduce((sum, column) => sum + column.widthPx, 0);
  const rowStart = pageIndex * ATTENDANCE_PDF_ROWS_PER_PAGE + 1;
  const rowEnd = rowStart + rows.length - 1;

  const headerCells = ATTENDANCE_SUMMARY_COLUMNS.map(
    (column) => `
      <th style="
        width: ${column.widthPx}px;
        min-width: ${column.widthPx}px;
        border: 1px solid #d1d5db;
        padding: 8px 10px;
        background: #f3f4f6;
        color: #111827;
        text-align: ${column.align};
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
      ">${escapeHtml(column.header)}</th>`
  ).join('');

  const bodyRows = rows.map((row, rowIndex) => {
    const cells = ATTENDANCE_SUMMARY_COLUMNS.map(
      (column) => `
        <td style="
          border: 1px solid #e5e7eb;
          padding: 7px 10px;
          color: #111827;
          text-align: ${column.align};
          font-size: 12px;
          background: ${rowIndex % 2 === 0 ? '#ffffff' : '#fafafa'};
          word-break: break-word;
          vertical-align: top;
        ">${escapeHtml(row[column.key])}</td>`
    ).join('');

    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <div style="
      width: ${tableWidth + 64}px;
      padding: 28px 32px;
      box-sizing: border-box;
      background: #ffffff;
      color: #111827;
      font-family: 'Segoe UI', Arial, sans-serif;
    ">
      <div style="margin-bottom: 16px;">
        <div style="font-size: 24px; font-weight: 700; margin-bottom: 6px;">Attendance History</div>
        <div style="font-size: 13px; color: #4b5563; margin-bottom: 2px;">
          Export Date: ${escapeHtml(exportDate)} | Total rows: ${totalRows} | Page ${pageIndex + 1}/${totalPages}
        </div>
        <div style="font-size: 13px; color: #6b7280;">Rows ${rowStart}-${rowEnd}</div>
      </div>
      <table style="
        width: ${tableWidth}px;
        border-collapse: collapse;
        table-layout: fixed;
        border: 1px solid #d1d5db;
      ">
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
};

const renderHtmlToCanvas = async (html, width) => {
  const { default: html2canvas } = await import('html2canvas');
  const container = document.createElement('div');

  container.style.position = 'absolute';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = `${width}px`;
  container.style.backgroundColor = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    return await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width,
      windowWidth: width,
    });
  } finally {
    document.body.removeChild(container);
  }
};

const ATTENDANCE_PDF_FONT_FILE = 'NotoSans-Regular.ttf';
const ATTENDANCE_PDF_FONT_NAME = 'NotoSansRegular';

let attendancePdfFontBase64Promise;

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const getAttendancePdfFontBase64 = async () => {
  if (!attendancePdfFontBase64Promise) {
    attendancePdfFontBase64Promise = fetch(notoSansRegularUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load PDF font asset.');
        }
        return response.arrayBuffer();
      })
      .then(arrayBufferToBase64);
  }

  return attendancePdfFontBase64Promise;
};

const prepareAttendancePdfFont = async (doc) => {
  const fontBase64 = await getAttendancePdfFontBase64();
  doc.addFileToVFS(ATTENDANCE_PDF_FONT_FILE, fontBase64);
  doc.addFont(ATTENDANCE_PDF_FONT_FILE, ATTENDANCE_PDF_FONT_NAME, 'normal');
  doc.setFont(ATTENDANCE_PDF_FONT_NAME, 'normal');
};

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
  const summaryRows = buildAttendanceSummaryRows(logs, employees);
  const includeEmployeeColumns = new Set(summaryRows.map((row) => row.employeeName || row.employeeCode)).size > 1;

  const data = summaryRows.map((row) => {
    const item = {
      'Day': row.day,
      'Date': row.date,
      'Morning Check-in': row.morningCheckIn,
      'Morning Check-out': row.morningCheckOut,
      'Afternoon Check-in': row.afternoonCheckIn,
      'Final Check-out': row.finalCheckOut,
      'Late (mins)': row.lateMinutes,
      'Early Leave (mins)': row.earlyLeaveMinutes,
      'OT Hours': row.otHours,
      'Approved Early Leave': row.approvedEarlyLeave,
      'Status': row.status,
    };
    if (includeEmployeeColumns) {
      item['Employee'] = row.employeeName;
      item['Code'] = row.employeeCode;
    }
    return item;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary');

  const colWidths = [];
  if (includeEmployeeColumns) {
    colWidths.push({ wch: 20 }, { wch: 12 });
  }
  colWidths.push(
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 10 },
    { wch: 18 },
    { wch: 14 }
  );
  ws['!cols'] = colWidths;

  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const headerRow = headerRange.s.r;
  for (let c = headerRange.s.c; c <= headerRange.e.c; c += 1) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'FF1E90FF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

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
  ensureAutoTable(doc);
  
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
  ensureAutoTable(doc);
  
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
export const exportAttendanceToPDF = async (logs, employees, filename = 'lich-su-diem-danh') => {
  if (!Array.isArray(logs) || logs.length === 0) {
    toastWarning('No attendance data available for export.');
    return;
  }

  const summaryRows = buildAttendanceSummaryRows(logs, employees);
  const includeEmployeeColumns = new Set(summaryRows.map((row) => row.employeeName || row.employeeCode)).size > 1;
  const reportColumns = includeEmployeeColumns
    ? [
        { key: 'employeeName', header: 'Employee', widthChars: 20, widthPx: 140, align: 'left' },
        { key: 'employeeCode', header: 'Code', widthChars: 12, widthPx: 90, align: 'left' },
        ...ATTENDANCE_SUMMARY_COLUMNS,
      ]
    : ATTENDANCE_SUMMARY_COLUMNS;
  const exportDateFast = new Date().toLocaleDateString('vi-VN');

  const docFast = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  ensureAutoTable(docFast);
  await prepareAttendancePdfFont(docFast);

  const headFast = [reportColumns.map((column) => column.header)];
  const bodyFast = summaryRows.map((row) => reportColumns.map((column) => row[column.key]));
  const columnStylesFast = reportColumns.reduce((styles, column, index) => {
    styles[index] = {
      cellWidth: Math.max(12, Math.round((column.widthChars || 10) * 1.3)),
      halign: column.align === 'center' ? 'center' : 'left',
    };
    return styles;
  }, {});

  docFast.autoTable({
    head: headFast,
    body: bodyFast,
    startY: 22,
    margin: { top: 22, right: 8, bottom: 12, left: 8 },
    theme: 'grid',
    tableWidth: 'wrap',
    styles: {
      font: ATTENDANCE_PDF_FONT_NAME,
      fontStyle: 'normal',
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      textColor: [17, 24, 39],
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      font: ATTENDANCE_PDF_FONT_NAME,
      fontStyle: 'normal',
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      lineColor: [209, 213, 219],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: columnStylesFast,
    didDrawPage: (data) => {
      docFast.setFont(ATTENDANCE_PDF_FONT_NAME, 'normal');
      docFast.setFontSize(14);
      docFast.text('Attendance History', data.settings.margin.left, 10);
      docFast.setFontSize(9);
      docFast.text(`Export Date: ${exportDateFast} | Total rows: ${summaryRows.length}`, data.settings.margin.left, 16);
      docFast.text(
        `Page ${docFast.internal.getNumberOfPages()}`,
        docFast.internal.pageSize.getWidth() - data.settings.margin.right,
        10,
        { align: 'right' }
      );
    },
  });

  docFast.save(`${filename}.pdf`);
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
    toastError(`Failed to download template: ${error.message}`);
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
          toastWarning(
            `Warning:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more warning(s)` : ''}\n\n${employees.length} valid employee(s) will be imported.`
          );
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

