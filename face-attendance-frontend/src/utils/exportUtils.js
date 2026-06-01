import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageOrientation } from 'docx';
import { saveAs } from 'file-saver';
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
  { key: 'otDetails', header: 'OT Details', widthChars: 20, widthPx: 180, align: 'center' },
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

const isCheckInType = (type) => typeof type === 'string' && (type === 'IN' || type.endsWith('_IN'));
const isCheckOutType = (type) => typeof type === 'string' && (type === 'OUT' || type.endsWith('_OUT'));

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
    const employeeName = employee.name || (logs[0] && logs[0].detectedName) || `User ${employeeId}`;
    const employeeCode = employee.employeeCode || String(employeeId || '') || '';
    const sortedLogs = logs.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const morningInCandidates = sortedLogs.filter((log) => isCheckInType(log.type) && new Date(log.timestamp).getHours() < 12);
    const afternoonInCandidates = sortedLogs.filter((log) => isCheckInType(log.type) && new Date(log.timestamp).getHours() >= 12);
    const morningOutCandidates = sortedLogs.filter((log) => isCheckOutType(log.type) && new Date(log.timestamp).getHours() < 13);
    const finalOutCandidates = sortedLogs.filter((log) => isCheckOutType(log.type));

    const morningCheckIn = morningInCandidates[0] || sortedLogs.find((log) => isCheckInType(log.type));
    const morningCheckOut = morningOutCandidates.length > 0
      ? morningOutCandidates[morningOutCandidates.length - 1]
      : sortedLogs.find((log) => isCheckOutType(log.type));
    const afternoonCheckIn = afternoonInCandidates[0] || sortedLogs.slice().reverse().find((log) => isCheckInType(log.type));
    const finalCheckOut = finalOutCandidates.length > 0 ? finalOutCandidates[finalOutCandidates.length - 1] : null;

    const lateMinutes = sortedLogs
      .filter((log) => isCheckInType(log.type) && log.isLate)
      .reduce((sum, log) => sum + (extractMinutesFromNote(log.note, 'Late') || Number(log.lateMinutes || 0)), 0);

    const earlyLeaveMinutes = sortedLogs
      .filter((log) => isCheckOutType(log.type) && log.isEarlyLeave)
      .reduce((sum, log) => sum + (extractMinutesFromNote(log.note, 'Left early') || Number(log.earlyLeaveMinutes || 0)), 0);

    // build OT shifts and minutes (fallback to log.otMinutes when note doesn't contain minutes)
    const otLogs = sortedLogs.filter((log) => log.isOvertime || String(log.type || '').toUpperCase().includes('OT'));
    const otIns = otLogs.filter((log) => isCheckInType(log.type));
    const otOuts = otLogs.filter((log) => isCheckOutType(log.type));
    const otShifts = [];
    let otOutIdx = 0;
    for (let inIdx = 0; inIdx < otIns.length; inIdx += 1) {
      const inLog = otIns[inIdx];
      const inTs = new Date(inLog.timestamp);
      while (otOutIdx < otOuts.length && new Date(otOuts[otOutIdx].timestamp) < inTs) otOutIdx += 1;
      if (otOutIdx < otOuts.length) {
        otShifts.push({ in: inLog, out: otOuts[otOutIdx] });
        otOutIdx += 1;
      }
    }

    const otMinutes = otLogs.reduce((sum, log) => sum + (extractMinutesFromNote(log.note, 'Overtime') || Number(log.otMinutes || 0)), 0);

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

    const otDetails = otShifts.length > 0
      ? otShifts.map(s => `${formatAttendanceTime(s.in.timestamp)}-${formatAttendanceTime(s.out.timestamp)}`).join('; ')
      : '';

    rows.push({
      employeeName: employeeName || '',
      employeeCode: employeeCode || '',
      day: dayFormatter.format(new Date(`${dateKey}T00:00:00`)),
      date: dateKey,
      morningCheckIn: formatAttendanceTime(morningCheckIn?.timestamp),
      morningCheckOut: formatAttendanceTime(morningCheckOut?.timestamp),
      afternoonCheckIn: formatAttendanceTime(afternoonCheckIn?.timestamp),
      finalCheckOut: formatAttendanceTime(finalCheckOut?.timestamp),
      lateMinutes: lateMinutes > 0 ? lateMinutes : '',
      earlyLeaveMinutes: earlyLeaveMinutes > 0 ? earlyLeaveMinutes : '',
      otHours: otMinutes > 0 ? (otMinutes / 60).toFixed(1) : '',
      otDetails,
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
  // Show employee columns when there is at least one distinct employee
  const includeEmployeeColumns = new Set(summaryRows.map((row) => row.employeeName || row.employeeCode)).size >= 1;

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
      'OT Details': row.otDetails,
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
    { wch: 14 }, // Day
    { wch: 14 }, // Date
    { wch: 16 }, // Morning Check-in
    { wch: 16 }, // Morning Check-out
    { wch: 16 }, // Afternoon Check-in
    { wch: 16 }, // Final Check-out
    { wch: 14 }, // Late (mins)
    { wch: 12 }, // Early Leave (mins)
    { wch: 10 }, // OT Hours
    { wch: 20 }, // OT Details
    { wch: 18 }, // Approved Early Leave
    { wch: 14 }  // Status
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

const buildAttendanceWorkHourRows = (logs = [], employees = []) => {
  const employeeMap = getAttendanceEmployeeMap(employees);
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  });

  const groups = new Map();

  logs.forEach((log) => {
    const timestamp = new Date(log.timestamp);
    const dateKey = dateFormatter.format(timestamp);
    const employeeId = String(log.userId || 'unknown');
    const groupKey = `${employeeId}||${dateKey}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        employeeId: log.userId,
        dateKey,
        checkIns: [],
        checkOuts: [],
        hasAbsent: false,
        hasLate: false,
        hasEarlyLeave: false,
        hasOvertime: false,
      });
    }

    const group = groups.get(groupKey);
    const type = String(log.type || '').toUpperCase();
    if (['IN', 'LATE_IN', 'OT_IN'].includes(type)) {
      group.checkIns.push(log);
    }
    if (['OUT', 'EARLY_OUT', 'OT_OUT'].includes(type)) {
      group.checkOuts.push(log);
    }
    if (log.isAbsent) group.hasAbsent = true;
    if (log.isLate) group.hasLate = true;
    if (log.isEarlyLeave) group.hasEarlyLeave = true;
    if (log.isOvertime) group.hasOvertime = true;
  });

  const rows = [];
  groups.forEach((group) => {
    const employee = employeeMap.get(String(group.employeeId)) || {};
    const employeeName = employee.name || (group.checkIns[0]?.detectedName || group.checkOuts[0]?.detectedName) || String(group.employeeId || '');
    const employeeCode = employee.employeeCode || String(group.employeeId || '');
    const checkIn = group.checkIns.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
    const checkOuts = group.checkOuts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const checkOut = checkOuts[checkOuts.length - 1];
    const timestampIn = checkIn ? new Date(checkIn.timestamp) : null;
    const timestampOut = checkOut ? new Date(checkOut.timestamp) : null;
    const totalHours = timestampIn && timestampOut ? Math.max(0, (timestampOut - timestampIn) / 3600000) : 0;
    let otHours = 0;
    if (totalHours > 0) {
      otHours = group.hasOvertime ? Math.max(0, totalHours - 9) : 0;
      if (!group.hasOvertime && timestampOut) {
        const outLabel = timeFormatter.format(timestampOut);
        const [outHour, outMin] = outLabel.split(':').map(Number);
        otHours = Math.max(0, outHour + outMin / 60 - 17);
      }
      otHours = Number(otHours.toFixed(1));
    }

    let status = 'No hours';
    if (group.hasAbsent && !timestampIn && !timestampOut) {
      status = 'Absent';
    } else if (group.hasAbsent && timestampIn && timestampOut) {
      status = group.hasOvertime ? 'Absent + OT' : 'Partial Absent';
    } else if (group.hasOvertime) {
      status = 'OT';
    } else if (group.hasLate) {
      status = 'Late';
    } else if (group.hasEarlyLeave) {
      status = 'Early Leave';
    } else if (timestampIn && timestampOut) {
      status = 'Normal';
    } else if (timestampIn || timestampOut) {
      status = 'Partial';
    }

    const fmt = (ts) => (ts ? timeFormatter.format(new Date(ts)) : '');
    const normalIns = group.checkIns
      .filter((log) => !String(log.type || '').includes('OT'))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const normalOuts = group.checkOuts
      .filter((log) => !String(log.type || '').includes('OT'))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const otIns = group.checkIns
      .filter((log) => String(log.type || '').includes('OT'))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const otOuts = group.checkOuts
      .filter((log) => String(log.type || '').includes('OT'))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const normalShifts = [];
    let normalOutIdx = 0;
    for (let inIdx = 0; inIdx < normalIns.length; inIdx += 1) {
      const inLog = normalIns[inIdx];
      const inTs = new Date(inLog.timestamp);
      while (normalOutIdx < normalOuts.length && new Date(normalOuts[normalOutIdx].timestamp) < inTs) normalOutIdx += 1;
      if (normalOutIdx < normalOuts.length) {
        normalShifts.push({ in: inLog, out: normalOuts[normalOutIdx] });
        normalOutIdx += 1;
      }
    }

    const otShifts = [];
    let otOutIdx = 0;
    for (let inIdx = 0; inIdx < otIns.length; inIdx += 1) {
      const inLog = otIns[inIdx];
      const inTs = new Date(inLog.timestamp);
      while (otOutIdx < otOuts.length && new Date(otOuts[otOutIdx].timestamp) < inTs) otOutIdx += 1;
      if (otOutIdx < otOuts.length) {
        otShifts.push({ in: inLog, out: otOuts[otOutIdx] });
        otOutIdx += 1;
      }
    }

    const shift1 = normalShifts[0] ? `${fmt(normalShifts[0].in.timestamp)}-${fmt(normalShifts[0].out.timestamp)}` : '';
    const shift2 = normalShifts[1] ? `${fmt(normalShifts[1].in.timestamp)}-${fmt(normalShifts[1].out.timestamp)}` : '';
    const otShift = otShifts[0] ? `${fmt(otShifts[0].in.timestamp)}-${fmt(otShifts[0].out.timestamp)}` : '';
    const isAbsentDay = ['Absent', 'Partial Absent', 'Absent + OT'].includes(status);
    const absentLabel = translateMonthlyWorkHoursStatus('Absent', 'en');

    rows.push({
      employeeName: employeeName || '',
      employeeCode: employeeCode || '',
      date: group.dateKey,
      checkIn: checkIn ? timeFormatter.format(timestampIn) : '',
      checkOut: checkOut ? timeFormatter.format(timestampOut) : '',
      workHours: totalHours > 0 ? totalHours.toFixed(1) : '',
      otHours: otHours > 0 ? otHours.toFixed(1) : '',
      status,
      shift1: shift1 || (isAbsentDay ? absentLabel : ''),
      shift2: shift2 || (isAbsentDay && shift1 ? absentLabel : ''),
      otShift: otShift || (isAbsentDay && !shift1 ? absentLabel : ''),
    });
  });

  return rows.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode) || a.date.localeCompare(b.date));
};

const buildAttendanceMonthlyWorkHourRows = (logs = [], employees = []) => {
  const dailyRows = buildAttendanceWorkHourRows(logs, employees);
  const monthlyMap = new Map();

  dailyRows.forEach((row) => {
    const [year, month] = row.date.split('-');
    const key = `${row.employeeCode}||${year}-${month}`;
    const existing = monthlyMap.get(key) || {
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      year,
      month,
      totalHours: 0,
      totalOtHours: 0,
      daysWorked: 0,
      absentDays: 0,
    };

    existing.totalHours += Number(row.workHours || 0);
    existing.totalOtHours += Number(row.otHours || 0);
    if (row.workHours) existing.daysWorked += 1;
    if (['Absent', 'Partial Absent', 'Absent + OT'].includes(row.status)) existing.absentDays += 1;
    monthlyMap.set(key, existing);
  });

  return Array.from(monthlyMap.values()).sort((a, b) =>
    a.employeeCode.localeCompare(b.employeeCode) || a.year.localeCompare(b.year) || a.month.localeCompare(b.month)
  );
};

const getMonthDayCount = (year, month) => new Date(Number(year), Number(month), 0).getDate();

const MONTHLY_WORK_HOURS_LABELS = {
  en: {
    Employee: 'Employee',
    Code: 'Code',
    Month: 'Month',
    Year: 'Year',
    Day: 'Day',
    Date: 'Date',
    WorkHours: 'Work Hours',
    OTHours: 'OT Hours',
    Shift1: 'Shift 1',
    Shift2: 'Shift 2',
    OTShift: 'OT Shift',
    Status: 'Status',
    TotalWorkHours: 'Total Work Hours',
    TotalOTHours: 'Total OT Hours',
    DaysWorked: 'Days Worked',
    AbsentDays: 'Absent Days',
  },
  vi: {
    Employee: 'Nhân viên',
    Code: 'Mã',
    Month: 'Tháng',
    Year: 'Năm',
    Day: 'Ngày',
    Date: 'Ngày',
    WorkHours: 'Giờ làm',
    OTHours: 'Giờ OT',
    Shift1: 'Ca 1',
    Shift2: 'Ca 2',
    OTShift: 'Ca OT',
    Status: 'Trạng thái',
    TotalWorkHours: 'Tổng giờ làm',
    TotalOTHours: 'Tổng giờ OT',
    DaysWorked: 'Số ngày đi làm',
    AbsentDays: 'Số ngày nghỉ',
  },
};

const MONTHLY_WORK_HOURS_STATUS = {
  en: {
    Normal: 'Normal',
    Absent: 'Absent',
    'Partial Absent': 'Partial Absent',
    'Absent + OT': 'Absent + OT',
    OT: 'OT',
    Late: 'Late',
    'Early Leave': 'Early Leave',
    Partial: 'Partial',
    'No hours': 'No hours',
    Weekend: 'Weekend',
  },
  vi: {
    Normal: 'Bình thường',
    Absent: 'Nghỉ',
    'Partial Absent': 'Nghỉ một phần',
    'Absent + OT': 'Nghỉ + OT',
    OT: 'OT',
    Late: 'Trễ',
    'Early Leave': 'Về sớm',
    Partial: 'Một phần',
    'No hours': 'Không có giờ',
    Weekend: 'Cuối tuần',
  },
};

const getMonthlyWorkHoursLabel = (key, language = 'en') => {
  return (MONTHLY_WORK_HOURS_LABELS[language] || MONTHLY_WORK_HOURS_LABELS.en)[key] || key;
};

const translateMonthlyWorkHoursStatus = (status, language = 'en') => {
  return (MONTHLY_WORK_HOURS_STATUS[language] || MONTHLY_WORK_HOURS_STATUS.en)[status] || status || '';
};

const buildAttendanceMonthlyWorkHoursSheets = (logs = [], employees = [], language = 'en') => {
  const dayRows = buildAttendanceWorkHourRows(logs, employees);
  const employeeByCode = new Map((employees || []).map((employee) => [String(employee.employeeCode), employee]));
  const monthGroups = new Map();

  dayRows.forEach((row) => {
    const [year, month, day] = row.date.split('-').map((part) => Number(part));
    if (!year || !month || !day) return;

    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const groupKey = `${row.employeeCode}||${monthKey}`;
    const existing = monthGroups.get(groupKey) || {
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      year,
      month,
      dayData: new Map(),
      totalHours: 0,
      totalOtHours: 0,
      daysWorked: 0,
      absentDays: 0,
      startDate: safeParseDate(employeeByCode.get(String(row.employeeCode))?.startDate),
    };

    existing.dayData.set(day, {
      hours: row.workHours || '',
      status: row.status || '',
    });
    existing.totalHours += Number(row.workHours || 0);
    existing.totalOtHours += Number(row.otHours || 0);
    if (row.workHours) existing.daysWorked += 1;
    if (['Absent', 'Partial Absent', 'Absent + OT'].includes(row.status)) existing.absentDays += 1;
    monthGroups.set(groupKey, existing);
  });

  const sheets = new Map();
  Array.from(monthGroups.values()).forEach((group) => {
    const monthKey = `${group.year}-${String(group.month).padStart(2, '0')}`;
    const dayCount = getMonthDayCount(group.year, group.month);
    const row = {
      [getMonthlyWorkHoursLabel('Employee', language)]: group.employeeName,
      [getMonthlyWorkHoursLabel('Code', language)]: group.employeeCode,
      [getMonthlyWorkHoursLabel('Month', language)]: group.month,
      [getMonthlyWorkHoursLabel('Year', language)]: group.year,
    };

    for (let day = 1; day <= dayCount; day += 1) {
      const cell = group.dayData.get(day);
      const dayDate = new Date(Date.UTC(group.year, group.month - 1, day));
      const isWeekend = dayDate.getUTCDay() === 0;
      const beforeStart = group.startDate && dayDate < group.startDate;
      row[`${getMonthlyWorkHoursLabel('Day', language)} ${day}`] = cell?.hours || '';
      const statusKey = cell?.status || (beforeStart ? '' : isWeekend ? 'Weekend' : 'No hours');
      row[`${getMonthlyWorkHoursLabel('Status', language)} ${day}`] = translateMonthlyWorkHoursStatus(statusKey, language);
    }

    row['Total Work Hours'] = Number(group.totalHours.toFixed(1));
    row['Total OT Hours'] = Number(group.totalOtHours.toFixed(1));
    row['Days Worked'] = group.daysWorked;
    row['Absent Days'] = group.absentDays;

    const sheet = sheets.get(monthKey) || {
      year: group.year,
      month: group.month,
      dayCount,
      rows: [],
    };
    sheet.rows.push(row);
    sheets.set(monthKey, sheet);
  });

  return Array.from(sheets.values()).sort((a, b) => a.year - b.year || a.month - b.month);
};

const safeParseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const ATTENDANCE_DAY_CODE = {
  IN: 'I',
  OUT: 'O',
  OT_IN: 'OTI',
  OT_OUT: 'OTO',
  LATE_IN: 'L',
  EARLY_OUT: 'E',
  ABSENT: 'A',
};

const buildAttendanceSheetRows = (logs = [], employees = []) => {
  const employeeMap = new Map((employees || []).map((employee) => [String(employee.id), employee]));
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const rows = new Map();

  (employees || []).forEach((employee) => {
    rows.set(String(employee.id), {
      employee,
      dayCodes: new Map(),
    });
  });

  logs.forEach((log) => {
    const timestamp = new Date(log.timestamp);
    if (Number.isNaN(timestamp.getTime())) return;
    const dateKey = dateFormatter.format(timestamp);
    const dayNumber = Number(dateKey.split('-')[2]);
    if (dayNumber < 1 || dayNumber > 31) return;

    const employeeId = String(log.userId || 'unknown');
    if (!rows.has(employeeId)) {
      const emp = employeeMap.get(employeeId);
      rows.set(employeeId, {
        employee: emp || { id: log.userId, name: log.detectedName || '', employeeCode: String(log.userId || '') },
        dayCodes: new Map(),
      });
    }

    const row = rows.get(employeeId);
    const type = String(log.type || '').toUpperCase();
    const code = ATTENDANCE_DAY_CODE[type] || (log.isAbsent ? ATTENDANCE_DAY_CODE.ABSENT : '');
    if (!code) return;

    const existing = row.dayCodes.get(dayNumber) || '';
    if (existing === ATTENDANCE_DAY_CODE.ABSENT) {
      return;
    }

    if (code === ATTENDANCE_DAY_CODE.ABSENT) {
      row.dayCodes.set(dayNumber, ATTENDANCE_DAY_CODE.ABSENT);
      return;
    }

    const values = existing ? new Set(existing.split(',').map((part) => part.trim())) : new Set();
    values.add(code);
    row.dayCodes.set(dayNumber, Array.from(values).join(', '));
  });
  // compute OT minutes and late minutes per user for the provided logs (month scope)
  const otMinutesMap = new Map();
  const lateMinutesMap = new Map();
  const absentFlagMap = new Map();
  logs.forEach((log) => {
    const uid = String(log.userId || 'unknown');
    const otMinutes = extractMinutesFromNote(log.note, 'Overtime') || 0;
    const lateMinutes = extractMinutesFromNote(log.note, 'Late') || 0;
    const isOTFlag = log.isOvertime || String(log.type || '').toUpperCase().includes('OT');
    const isLateFlag = log.isLate || String(log.type || '').toUpperCase().includes('LATE');
    const isAbsentFlag = log.isAbsent || String(log.type || '').toUpperCase().includes('ABSENT');

    if (isOTFlag || otMinutes) otMinutesMap.set(uid, (otMinutesMap.get(uid) || 0) + (otMinutes || 0));
    if (isLateFlag || lateMinutes) lateMinutesMap.set(uid, (lateMinutesMap.get(uid) || 0) + (lateMinutes || 0));
    if (isAbsentFlag) absentFlagMap.set(uid, (absentFlagMap.get(uid) || 0) + 1);
  });

    const results = Array.from(rows.values()).map((row) => {
    const dayValues = Array.from({ length: 31 }, (_, index) => row.dayCodes.get(index + 1) || '');
    const totalWorkDays = dayValues.filter((value) => value && value !== ATTENDANCE_DAY_CODE.ABSENT).length;
    const absentDays = dayValues.filter((v) => v && v.split(',').some(p => p.trim() === ATTENDANCE_DAY_CODE.ABSENT)).length;
    // fallback: count absent flags parsed from logs if day-based count is zero
    const absentFlagCount = absentFlagMap.get(String(row.employee.id)) || 0;
    const totalAbsentDays = Math.max(absentDays, absentFlagCount);
    const totalAbsentHours = Number((totalAbsentDays * 8).toFixed(1));
    const totalOtHours = Number(((otMinutesMap.get(String(row.employee.id)) || 0) / 60).toFixed(1));
    const totalLateMinutes = Number((lateMinutesMap.get(String(row.employee.id)) || 0));
    return {
      employeeName: row.employee.name || '',
      employeeCode: row.employee.employeeCode || '',
      position: row.employee.JobTitle?.name || row.employee.jobTitle || '',
      dayValues,
      totalWorkDays,
      absentDays: totalAbsentDays,
      totalAbsentHours,
      totalOtHours,
      totalLateMinutes,
    };
  }).sort((a, b) => a.employeeCode.localeCompare(b.employeeCode) || a.employeeName.localeCompare(b.employeeName));

  return results;
};

const createDocxCell = (
  text,
  { bold = false, align = AlignmentType.CENTER, width = 1000, fontSize = 16, verticalAlign = 'center' } = {}
) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: text ? String(text) : '', bold, size: fontSize }),
        ],
        alignment: align,
      }),
    ],
    verticalAlign,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
  });

export const exportAttendanceMonthlyWorkHoursSummaryToDocx = async (logs, employees, filename = 'attendance-sheet') => {
  const rows = buildAttendanceSheetRows(logs, employees);
  if (rows.length === 0) {
    toastWarning('No attendance data available for monthly attendance export.');
    return;
  }

  const monthDates = logs
    .filter((log) => log.timestamp)
    .map((log) => new Date(log.timestamp))
    .filter((date) => !Number.isNaN(date.getTime()));
  const dateLabel = monthDates.length
    ? monthDates.length === 1
      ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(monthDates[0])
      : new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(monthDates[0])
    : new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

  const makeHeaderRange = (startDay, endDay, includeSummary = false) => {
    const cells = [
      createDocxCell('No.', { bold: true, width: 700, fontSize: 18 }),
      createDocxCell('Employee Name', { bold: true, width: 3000, align: AlignmentType.LEFT, fontSize: 18 }),
      createDocxCell('Position', { bold: true, width: 2000, align: AlignmentType.LEFT, fontSize: 18 }),
    ];
    for (let d = startDay; d <= endDay; d += 1) cells.push(createDocxCell(String(d), { bold: true, width: 600, fontSize: 16 }));
    if (includeSummary) {
      cells.push(createDocxCell('Absent Days', { bold: true, width: 800, fontSize: 16 }));
      cells.push(createDocxCell('Total Absent Hours', { bold: true, width: 1000, fontSize: 16 }));
      cells.push(createDocxCell('Total OT Hours', { bold: true, width: 900, fontSize: 16 }));
      cells.push(createDocxCell('Total Late (mins)', { bold: true, width: 900, fontSize: 16 }));
      cells.push(createDocxCell('Total Work Days', { bold: true, width: 900, fontSize: 18 }));
      cells.push(createDocxCell('Notes', { bold: true, width: 1600, align: AlignmentType.LEFT, fontSize: 16 }));
    }
    return cells;
  };

  const header1 = makeHeaderRange(1, 16, false);
  const header2 = makeHeaderRange(17, 31, true);

  const tableRows1 = [new TableRow({ children: header1 })];
  const tableRows2 = [new TableRow({ children: header2 })];

  rows.forEach((row, index) => {
    const leftCells = [
      createDocxCell(String(index + 1), { width: 700, fontSize: 14 }),
      createDocxCell(row.employeeName, { width: 3200, align: AlignmentType.LEFT, fontSize: 14 }),
      createDocxCell(row.position, { width: 2200, align: AlignmentType.LEFT, fontSize: 14 }),
    ];
    for (let i = 0; i < 16; i += 1) leftCells.push(createDocxCell(row.dayValues[i] || '', { width: 600, fontSize: 12 }));

    const rightCells = [
      createDocxCell(String(index + 1), { width: 700, fontSize: 14 }),
      createDocxCell(row.employeeName, { width: 3200, align: AlignmentType.LEFT, fontSize: 14 }),
      createDocxCell(row.position, { width: 2200, align: AlignmentType.LEFT, fontSize: 14 }),
    ];
    for (let i = 16; i < 31; i += 1) rightCells.push(createDocxCell(row.dayValues[i] || '', { width: 600, fontSize: 12 }));
    // summary columns on the right table
    rightCells.push(createDocxCell(String(row.absentDays || 0), { width: 800, fontSize: 14, align: AlignmentType.CENTER }));
    rightCells.push(createDocxCell(String(row.totalAbsentHours || 0), { width: 1000, fontSize: 14, align: AlignmentType.CENTER }));
    rightCells.push(createDocxCell(String(row.totalOtHours || 0), { width: 900, fontSize: 14, align: AlignmentType.CENTER }));
    rightCells.push(createDocxCell(String(row.totalLateMinutes || 0), { width: 900, fontSize: 14, align: AlignmentType.CENTER }));
    rightCells.push(createDocxCell(String(row.totalWorkDays), { width: 900, fontSize: 14, align: AlignmentType.RIGHT }));
    rightCells.push(createDocxCell('', { width: 1600, align: AlignmentType.LEFT, fontSize: 12 }));

    tableRows1.push(new TableRow({ children: leftCells }));
    tableRows2.push(new TableRow({ children: rightCells }));
  });

  const legendParagraphs = [
    new Paragraph({
      children: [new TextRun({ text: 'Legend:', bold: true, size: 16 })],
      spacing: { before: 400, after: 120 },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new TextRun({ text: 'Check-in = I | Check-out = O | Overtime Check-in = OTI | Overtime Check-out = OTO | Late Check-in = L | Early Check-out = E | Absent = A', size: 14 })], alignment: AlignmentType.CENTER }),
  ];

  const children = [
    new Paragraph({ children: [new TextRun({ text: 'COMPANY', bold: true, size: 24 })], alignment: AlignmentType.LEFT }),
    new Paragraph({ children: [new TextRun({ text: 'ATTENDANCE SHEET', bold: true, size: 32 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: `Month: ${dateLabel}`, size: 18 })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
    new Table({ rows: tableRows1, width: { size: 100, type: WidthType.PERCENTAGE } }),
    new Paragraph({ children: [new TextRun({ text: 'Continued →', italics: true, size: 12 })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }),
    new Table({ rows: tableRows2, width: { size: 100, type: WidthType.PERCENTAGE } }),
    ...legendParagraphs,
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: '29.7cm', height: '21cm', orientation: PageOrientation.LANDSCAPE },
            margin: { top: '1.5cm', right: '1.2cm', bottom: '1.5cm', left: '1.2cm' },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};

const styleExcelTotalRow = (ws, totalRowNumber, columnCount) => {
  for (let c = 0; c < columnCount; c += 1) {
    const address = XLSX.utils.encode_cell({ r: totalRowNumber, c });
    if (!ws[address]) ws[address] = { t: 's', v: '' };
    ws[address].s = {
      font: { bold: true, color: { rgb: 'FF000000' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'FFF3F4F6' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }
};

export const exportAttendanceWorkHoursSummaryToExcel = (logs, employees, filename = 'work-hours-summary') => {
  const rows = buildAttendanceWorkHourRows(logs, employees);
  if (rows.length === 0) {
    toastWarning('No attendance data available for work hours export.');
    return;
  }

  const data = rows.map((row) => ({
    'Employee': row.employeeName,
    'Code': row.employeeCode,
    'Date': row.date,
    'Check-in': row.checkIn,
    'Check-out': row.checkOut,
    'Work Hours': row.workHours,
    'OT Hours': row.otHours,
    'Status': row.status,
  }));

  const totalWorkHours = rows.reduce((sum, row) => sum + Number(row.workHours || 0), 0);
  const totalOtHours = rows.reduce((sum, row) => sum + Number(row.otHours || 0), 0);
  data.push({
    Employee: 'TOTAL',
    Code: '',
    Date: '',
    'Check-in': '',
    'Check-out': '',
    'Work Hours': totalWorkHours.toFixed(1),
    'OT Hours': totalOtHours.toFixed(1),
    Status: ''
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Work Hours');
  ws['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 }
  ];

  const totalRowNumber = data.length + 1;
  styleExcelTotalRow(ws, totalRowNumber, 8);

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportAttendanceMonthlyWorkHoursSummaryToExcel = (
  logs,
  employees,
  filename = 'work-hours-monthly-summary',
  language = 'en'
) => {
  const rows = buildAttendanceWorkHourRows(logs, employees);
  if (rows.length === 0) {
    toastWarning('No attendance data available for monthly work hours export.');
    return;
  }

  const employeeByCode = new Map((employees || []).map((employee) => [String(employee.employeeCode), employee]));
  const monthGroups = new Map();
  rows.forEach((row) => {
    const [year, month] = row.date.split('-');
    if (!year || !month) return;
    const sheetKey = `${year}-${month}||${row.employeeCode}`;
    const group = monthGroups.get(sheetKey) || [];
    group.push(row);
    monthGroups.set(sheetKey, group);
  });

  const wb = XLSX.utils.book_new();
  // Aggregate monthly summary per month (employee-level totals)
  const monthlySummary = new Map(); // monthKey -> Map(employeeCode -> totals)
  const totalLabel = language === 'vi' ? 'TỔNG' : 'TOTAL';

  monthGroups.forEach((monthRows, sheetKey) => {
    const [sheetMonth, employeeCode] = sheetKey.split('||');
    const [yearStr, monthStr] = sheetMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const employee = employeeByCode.get(employeeCode);
    const employeeStartDate = safeParseDate(employee?.startDate);
    const dayCount = getMonthDayCount(year, month);
    const dayMap = new Map();

    monthRows.forEach((row) => {
      const day = Number(row.date.split('-')[2]);
      if (day >= 1 && day <= dayCount) {
        dayMap.set(day, row);
      }
    });

    const headers = [
      getMonthlyWorkHoursLabel('Employee', language),
      getMonthlyWorkHoursLabel('Code', language),
      getMonthlyWorkHoursLabel('Date', language),
      getMonthlyWorkHoursLabel('Day', language),
      getMonthlyWorkHoursLabel('WorkHours', language),
      getMonthlyWorkHoursLabel('OTHours', language),
      getMonthlyWorkHoursLabel('Shift1', language),
      getMonthlyWorkHoursLabel('Shift2', language),
      getMonthlyWorkHoursLabel('OTShift', language),
      getMonthlyWorkHoursLabel('Status', language),
    ];

    const data = [];
    // Insert a title row so the sheet clearly indicates which month it is
    const titleRow = {};
    titleRow[getMonthlyWorkHoursLabel('Employee', language)] = `${language === 'vi' ? 'Tháng' : 'Month'}: ${yearStr}-${monthStr}`;
    // ensure other keys exist to keep column order
    titleRow[getMonthlyWorkHoursLabel('Code', language)] = '';
    titleRow[getMonthlyWorkHoursLabel('Date', language)] = '';
    titleRow[getMonthlyWorkHoursLabel('Day', language)] = '';
    titleRow[getMonthlyWorkHoursLabel('WorkHours', language)] = '';
    titleRow[getMonthlyWorkHoursLabel('OTHours', language)] = '';
    titleRow[getMonthlyWorkHoursLabel('Shift1', language)] = '';
    // push title first
    data.push(titleRow);
    for (let day = 1; day <= dayCount; day += 1) {
      const dayDate = new Date(Date.UTC(year, month - 1, day));
      const row = dayMap.get(day);
      const isWeekend = dayDate.getUTCDay() === 0;
      const beforeStart = employeeStartDate && dayDate < employeeStartDate;
      const statusKey = row?.status || (beforeStart ? '' : isWeekend ? 'Weekend' : 'No hours');

      data.push({
        [getMonthlyWorkHoursLabel('Employee', language)]: row?.employeeName || employee?.name || '',
        [getMonthlyWorkHoursLabel('Code', language)]: row?.employeeCode || employeeCode || '',
        [getMonthlyWorkHoursLabel('Date', language)]: `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`,
        [getMonthlyWorkHoursLabel('Day', language)]: String(day).padStart(2, '0'),
        [getMonthlyWorkHoursLabel('WorkHours', language)]: row?.workHours || '',
        [getMonthlyWorkHoursLabel('OTHours', language)]: row?.otHours || '',
        [getMonthlyWorkHoursLabel('Shift1', language)]: row?.shift1 || '',
        [getMonthlyWorkHoursLabel('Shift2', language)]: row?.shift2 || '',
        [getMonthlyWorkHoursLabel('OTShift', language)]: row?.otShift || '',
        [getMonthlyWorkHoursLabel('Status', language)]: translateMonthlyWorkHoursStatus(statusKey, language),
      });
    }

    const totalWorkHours = monthRows.reduce((sum, row) => sum + Number(row.workHours || 0), 0);
    const totalOtHours = monthRows.reduce((sum, row) => sum + Number(row.otHours || 0), 0);
    const daysWorked = monthRows.filter((row) => row.workHours).length;
    const absentDays = monthRows.filter((row) => ['Absent', 'Partial Absent', 'Absent + OT'].includes(row.status)).length;

    data.push({
      [getMonthlyWorkHoursLabel('Employee', language)]: totalLabel,
      [getMonthlyWorkHoursLabel('Code', language)]: '',
      [getMonthlyWorkHoursLabel('Date', language)]: '',
      [getMonthlyWorkHoursLabel('Day', language)]: '',
      [getMonthlyWorkHoursLabel('WorkHours', language)]: totalWorkHours.toFixed(1),
      [getMonthlyWorkHoursLabel('OTHours', language)]: totalOtHours.toFixed(1),
      [getMonthlyWorkHoursLabel('Status', language)]: `${getMonthlyWorkHoursLabel('DaysWorked', language)}: ${daysWorked}, ${getMonthlyWorkHoursLabel('AbsentDays', language)}: ${absentDays}`,
    });

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const sheetName = `WorkHours-${sheetKey}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    ws['!cols'] = [
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
    ];

    const totalRowNumber = data.length + 1;
    styleExcelTotalRow(ws, totalRowNumber, headers.length);

      // Store monthly summary totals for aggregated sheet
      const monthKey = `${yearStr}-${monthStr}`;
      const monthMap = monthlySummary.get(monthKey) || new Map();
      monthMap.set(employeeCode, {
        employeeName: employee?.name || (monthRows[0] && monthRows[0].employeeName) || '',
        employeeCode: employeeCode || '',
        totalWorkHours: Number(totalWorkHours.toFixed(1)),
        totalOtHours: Number(totalOtHours.toFixed(1)),
        daysWorked,
        absentDays,
        lateCount: monthRows.filter(r => r.status === 'Late').length,
        otCount: monthRows.filter(r => r.status === 'OT' || r.status === 'Absent + OT').length,
        earlyLeaveCount: monthRows.filter(r => r.status === 'Early Leave').length,
        normalCount: monthRows.filter(r => r.status === 'Normal').length,
      });
      monthlySummary.set(monthKey, monthMap);
  });

    // Append aggregated summary sheets per month
    monthlySummary.forEach((empMap, monthKey) => {
      const summaryRows = [];
      // add title row to summary sheet to indicate the month
      const titleSummaryRow = {};
      titleSummaryRow[empLabel] = `${language === 'vi' ? 'Tháng' : 'Month'}: ${monthKey}`;
      titleSummaryRow[codeLabel] = '';
      titleSummaryRow[daysLabel] = '';
      titleSummaryRow[totalWorkLabel] = '';
      titleSummaryRow[totalOtLabel] = '';
      titleSummaryRow[absentLabel] = '';
      titleSummaryRow[lateLabel] = '';
      titleSummaryRow[otLabel] = '';
      titleSummaryRow[earlyLabel] = '';
      titleSummaryRow[normalLabel] = '';
      summaryRows.push(titleSummaryRow);
      let aggTotalWork = 0;
      let aggTotalOt = 0;
      let aggTotalDays = 0;
      let aggAbsentDays = 0;

      const empEntries = Array.from(empMap.values()).sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));

      const empLabel = getMonthlyWorkHoursLabel('Employee', language);
      const codeLabel = getMonthlyWorkHoursLabel('Code', language);
      const daysLabel = getMonthlyWorkHoursLabel('DaysWorked', language);
      const totalWorkLabel = getMonthlyWorkHoursLabel('TotalWorkHours', language);
      const totalOtLabel = getMonthlyWorkHoursLabel('TotalOTHours', language);
      const absentLabel = getMonthlyWorkHoursLabel('AbsentDays', language);
      const lateLabel = 'Late Count';
      const otLabel = 'OT Count';
      const earlyLabel = 'Early Leave Count';
      const normalLabel = 'Normal Count';

      empEntries.forEach((item) => {
        summaryRows.push({
          [empLabel]: item.employeeName,
          [codeLabel]: item.employeeCode,
          [daysLabel]: item.daysWorked,
          [totalWorkLabel]: item.totalWorkHours,
          [totalOtLabel]: item.totalOtHours,
          [absentLabel]: item.absentDays,
          [lateLabel]: item.lateCount || 0,
          [otLabel]: item.otCount || 0,
          [earlyLabel]: item.earlyLeaveCount || 0,
          [normalLabel]: item.normalCount || 0,
        });
        aggTotalWork += Number(item.totalWorkHours || 0);
        aggTotalOt += Number(item.totalOtHours || 0);
        aggTotalDays += Number(item.daysWorked || 0);
        aggAbsentDays += Number(item.absentDays || 0);
      });

      // Add total row using localized keys
      summaryRows.push({
        [empLabel]: totalLabel,
        [codeLabel]: '',
        [daysLabel]: aggTotalDays,
        [totalWorkLabel]: aggTotalWork.toFixed(1),
        [totalOtLabel]: aggTotalOt.toFixed(1),
        [absentLabel]: aggAbsentDays,
      });

      const summaryHeaders = [empLabel, codeLabel, daysLabel, totalWorkLabel, totalOtLabel, absentLabel];

      const extendedHeaders = [empLabel, codeLabel, daysLabel, totalWorkLabel, totalOtLabel, absentLabel, lateLabel, otLabel, earlyLabel, normalLabel];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows, { header: extendedHeaders });
      const summarySheetName = `Summary-${monthKey}`;
      XLSX.utils.book_append_sheet(wb, wsSummary, summarySheetName);
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 12 }];
      styleExcelTotalRow(wsSummary, summaryRows.length + 1, extendedHeaders.length);
    });

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportAttendanceWorkHoursSummaryToPDF = async (logs, employees, filename = 'work-hours-summary') => {
  const rows = buildAttendanceWorkHourRows(logs, employees);
  if (rows.length === 0) {
    toastWarning('No attendance data available for work hours export.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  ensureAutoTable(doc);

  const tableData = rows.map((row) => [
    row.employeeName,
    row.employeeCode,
    row.date,
    row.checkIn,
    row.checkOut,
    row.workHours,
    row.otHours,
    row.status,
  ]);

  doc.setFontSize(18);
  doc.text('Work Hours Summary', 14, 20);
  doc.setFontSize(11);
  doc.text(`Exported: ${new Date().toLocaleDateString('vi-VN')}`, 14, 28);

  doc.autoTable({
    startY: 34,
    head: [[
      'Employee', 'Code', 'Date', 'Check-in', 'Check-out', 'Work Hours', 'OT Hours', 'Status'
    ]],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [56, 189, 248], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`${filename}.pdf`);
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

