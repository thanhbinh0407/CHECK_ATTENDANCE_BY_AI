import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
// Import jspdf-autotable - for v5.x we need to import and apply the plugin
import { applyPlugin } from 'jspdf-autotable';
import { toastError, toastWarning } from '../lib/notify.jsx';

// Apply the plugin to extend jsPDF prototype
applyPlugin(jsPDF);

/** Report net export: match screen — if DB still 0 (legacy row) but gross − deduction < 0, use negative value. */
function displayNetSalary(s) {
  const stored = Number(s.finalSalary);
  const g = parseFloat(s.grossSalary ?? 0);
  const d = parseFloat(s.deduction ?? 0);
  const recomputed = parseFloat((g - d).toFixed(2));
  if (Math.abs(stored) < 0.005 && recomputed < 0) return recomputed;
  return Number.isFinite(stored) ? stored : recomputed;
}

// Helper function to format currency
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0';
  return new Intl.NumberFormat('en-US').format(parseFloat(amount) || 0);
};

// Helper function to format currency with VND symbol
const formatCurrencyVND = (amount) => {
  return `${formatCurrency(amount)} ₫`;
};

export const exportSalariesToExcel = (salaries, filename = 'bang-luong') => {
  try {
    // Validate input
    if (!salaries || !Array.isArray(salaries)) {
      throw new Error('Invalid salary data');
    }

    if (salaries.length === 0) {
      toastWarning('No data to export.');
      return;
    }

    // Map salary data with proper formatting
    const data = salaries.map(salary => {
      // Safely access nested properties
      const user = salary.User || salary.user || {};
      const baseSalary = parseFloat(salary.baseSalary) || 0;
      const bonus = parseFloat(salary.bonus) || 0;
      const deduction = parseFloat(salary.deduction) || 0;
      const netPay = displayNetSalary(salary);

      return {
        'Employee Name': user.name || salary.employeeName || 'N/A',
        'Emp. ID': user.employeeCode || salary.employeeCode || 'N/A',
        'Month': salary.month || '',
        'Year': salary.year || '',
        'Base Salary (VND)': baseSalary,
        'Bonus (VND)': bonus,
        'Deduction (VND)': deduction,
        'Net Pay (VND)': netPay,
        'Status': salary.status === 'paid' ? 'Paid' : 
                   salary.status === 'approved' ? 'Approved' : 
                   salary.status === 'pending' ? 'Pending' : 'Unknown',
        'Calculated At': salary.calculatedAt ? new Date(salary.calculatedAt).toLocaleString('en-US') : 
                        salary.createdAt ? new Date(salary.createdAt).toLocaleString('en-US') : ''
      };
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 25 }, // Employee Name
      { wch: 12 }, // Emp. ID
      { wch: 8 },  // Month
      { wch: 8 },  // Year
      { wch: 18 }, // Base Salary
      { wch: 18 }, // Bonus
      { wch: 18 }, // Deduction
      { wch: 18 }, // Net Pay
      { wch: 12 }, // Status
      { wch: 20 }  // Calculated At
    ];
    ws['!cols'] = colWidths;

    // Add number formatting for currency columns
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let row = 1; row <= range.e.r; row++) {
      // Base Salary (column E)
      const baseSalaryCell = XLSX.utils.encode_cell({ r: row, c: 4 });
      if (ws[baseSalaryCell]) {
        ws[baseSalaryCell].z = '#,##0';
      }
      // Bonus (column F)
      const bonusCell = XLSX.utils.encode_cell({ r: row, c: 5 });
      if (ws[bonusCell]) {
        ws[bonusCell].z = '#,##0';
      }
      // Deduction (column G)
      const deductionCell = XLSX.utils.encode_cell({ r: row, c: 6 });
      if (ws[deductionCell]) {
        ws[deductionCell].z = '#,##0';
      }
      // Net Pay (column H)
      const netPayCell = XLSX.utils.encode_cell({ r: row, c: 7 });
      if (ws[netPayCell]) {
        ws[netPayCell].z = '#,##0';
      }
    }

    // Write file
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    console.log(`✅ Exported ${salaries.length} salaries to ${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    toastError(`Error exporting Excel: ${error.message}`);
  }
};

export const exportSalariesToPDF = (salaries, filename = 'bang-luong') => {
  try {
    // Validate input
    if (!salaries || !Array.isArray(salaries)) {
      throw new Error('Invalid salary data');
    }

    if (salaries.length === 0) {
      toastWarning('No data to export.');
      return;
    }

    // Create PDF document
    const doc = new jsPDF('landscape');
    
    // Verify autoTable is available (should be extended by applyPlugin above)
    if (typeof doc.autoTable !== 'function') {
      throw new Error('jspdf-autotable plugin failed to load. Please restart the dev server.');
    }
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text('Payroll Report', 14, 20);
    
    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Export date: ${new Date().toLocaleDateString('en-US')}`, 14, 28);
    doc.text(`Total employees: ${salaries.length}`, 14, 34);

    // Prepare table data with proper formatting
    const tableData = salaries.map(salary => {
      const user = salary.User || salary.user || {};
      const baseSalary = parseFloat(salary.baseSalary) || 0;
      const bonus = parseFloat(salary.bonus) || 0;
      const deduction = parseFloat(salary.deduction) || 0;
      const netPay = displayNetSalary(salary);

      const status = salary.status === 'paid' ? 'Paid' : 
                     salary.status === 'approved' ? 'Approved' : 
                     salary.status === 'pending' ? 'Pending' : 'Unknown';

      return [
        user.name || salary.employeeName || 'N/A',
        user.employeeCode || salary.employeeCode || 'N/A',
        `${salary.month || ''}/${salary.year || ''}`,
        formatCurrency(baseSalary),
        formatCurrency(bonus),
        formatCurrency(deduction),
        formatCurrency(netPay),
        status
      ];
    });

    // Create table using autoTable
    doc.autoTable({
      head: [['Name', 'Emp. ID', 'Month/Year', 'Base Salary', 'Bonus', 'Deduction', 'Net Pay', 'Status']],
      body: tableData,
      startY: 40,
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [59, 130, 246], // Blue
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: { 
        fillColor: [249, 250, 251] 
      },
      margin: { left: 14, right: 14 },
      tableWidth: 'auto'
    });

    // Save file
    doc.save(`${filename}.pdf`);
    
    console.log(`✅ Exported ${salaries.length} salaries to ${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    toastError(`Error exporting PDF: ${error.message}. Ensure jspdf-autotable is installed: npm install jspdf-autotable`);
  }
};
