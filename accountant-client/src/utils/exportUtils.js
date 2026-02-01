import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportSalariesToExcel = (salaries, filename = 'bang-luong') => {
  const data = salaries.map(salary => ({
    'Employee': salary.User?.name || '',
    'Emp. ID': salary.User?.employeeCode || '',
    'Month': salary.month || '',
    'Year': salary.year || '',
    'Base Salary': salary.baseSalary || 0,
    'Bonus': salary.bonus || 0,
    'Deduction': salary.deduction || 0,
    'Net Pay': salary.finalSalary || 0,
    'Status': salary.status === 'paid' ? 'Paid' : 
                   salary.status === 'approved' ? 'Approved' : 'Pending',
    'Calculated At': salary.calculatedAt ? new Date(salary.calculatedAt).toLocaleDateString('en') : ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
  
  const colWidths = [
    { wch: 25 }, { wch: 12 }, { wch: 8 }, { wch: 8 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }
  ];
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportSalariesToPDF = (salaries, filename = 'bang-luong') => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Payroll', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Export date: ${new Date().toLocaleDateString('en')}`, 14, 30);

  const tableData = salaries.map(salary => [
    salary.User?.name || '',
    salary.User?.employeeCode || '',
    `${salary.month}/${salary.year}`,
    new Intl.NumberFormat('vi-VN').format(salary.baseSalary || 0),
    new Intl.NumberFormat('vi-VN').format(salary.bonus || 0),
    new Intl.NumberFormat('vi-VN').format(salary.deduction || 0),
    new Intl.NumberFormat('vi-VN').format(salary.finalSalary || 0),
    salary.status === 'paid' ? 'Paid' : 
    salary.status === 'approved' ? 'Approved' : 'Pending'
  ]);

  doc.autoTable({
    head: [['Name', 'Emp. ID', 'Month/Year', 'Base Salary', 'Bonus', 'Deduction', 'Net Pay', 'Status']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [31, 41, 55] },
  });

  doc.save(`${filename}.pdf`);
};

