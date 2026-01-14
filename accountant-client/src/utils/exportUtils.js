import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportSalariesToExcel = (salaries, filename = 'bang-luong') => {
  const data = salaries.map(salary => ({
    'Nhân viên': salary.User?.name || '',
    'Mã NV': salary.User?.employeeCode || '',
    'Tháng': salary.month || '',
    'Năm': salary.year || '',
    'Lương cơ bản': salary.baseSalary || 0,
    'Thưởng': salary.bonus || 0,
    'Khấu trừ': salary.deduction || 0,
    'Thực nhận': salary.finalSalary || 0,
    'Trạng thái': salary.status === 'paid' ? 'Đã thanh toán' : 
                   salary.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt',
    'Ngày tính': salary.calculatedAt ? new Date(salary.calculatedAt).toLocaleDateString('vi-VN') : ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bảng lương');
  
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
  doc.text('Bảng Lương', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 14, 30);

  const tableData = salaries.map(salary => [
    salary.User?.name || '',
    salary.User?.employeeCode || '',
    `${salary.month}/${salary.year}`,
    new Intl.NumberFormat('vi-VN').format(salary.baseSalary || 0),
    new Intl.NumberFormat('vi-VN').format(salary.bonus || 0),
    new Intl.NumberFormat('vi-VN').format(salary.deduction || 0),
    new Intl.NumberFormat('vi-VN').format(salary.finalSalary || 0),
    salary.status === 'paid' ? 'Đã thanh toán' : 
    salary.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'
  ]);

  doc.autoTable({
    head: [['Tên', 'Mã NV', 'Tháng/Năm', 'Lương cơ bản', 'Thưởng', 'Khấu trừ', 'Thực nhận', 'Trạng thái']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [31, 41, 55] },
  });

  doc.save(`${filename}.pdf`);
};

