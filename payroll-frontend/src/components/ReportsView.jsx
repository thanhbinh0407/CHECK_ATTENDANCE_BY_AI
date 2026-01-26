import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { payrollApi } from '../api/apiClient';
import { formatCurrency } from '../utils/formatters';

export default function ReportsView() {
  const [reportType, setReportType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: monthlySummary } = useQuery(
    ['payroll-summary', selectedMonth, selectedYear],
    () => payrollApi.getMonthlyPayrollSummary(selectedMonth, selectedYear)
  );

  const { data: statistics } = useQuery(
    ['payroll-statistics', selectedMonth, selectedYear],
    () => payrollApi.getPayrollStatistics(selectedMonth, selectedYear)
  );

  const { data: employeeHistory } = useQuery(
    ['payroll-history'],
    () => payrollApi.getEmployeePayrollHistory()
  );

  const handleExportExcel = async () => {
    try {
      const response = await payrollApi.exportToExcel(selectedMonth, selectedYear);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payroll_${selectedMonth}_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await payrollApi.exportPayslipToPDF(selectedMonth, selectedYear);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslips_${selectedMonth}_${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">📊 Báo Cáo Bảng Lương</h1>

      {/* Filter Section */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại Báo Cáo</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="monthly">📅 Hàng Tháng</option>
              <option value="employee">👤 Theo Nhân Viên</option>
              <option value="department">🏢 Theo Phòng Ban</option>
              <option value="trend">📈 Xu Hướng</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tháng</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Năm</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleExportExcel}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              📊 Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
            >
              📄 PDF
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-l-4 border-blue-600">
            <p className="text-sm text-gray-600 mb-1">Tổng Thu Nhập</p>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(statistics.totalIncome || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">+{statistics.employeeCount || 0} nhân viên</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-l-4 border-green-600">
            <p className="text-sm text-gray-600 mb-1">Tổng Lương Ròng</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(statistics.totalNetSalary || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Trung bình: {formatCurrency((statistics.totalNetSalary || 0) / (statistics.employeeCount || 1))}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border-l-4 border-red-600">
            <p className="text-sm text-gray-600 mb-1">Tổng Khấu Trừ</p>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(statistics.totalDeduction || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Thuế & Bảo Hiểm</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-l-4 border-purple-600">
            <p className="text-sm text-gray-600 mb-1">% Khấu Trừ Trung Bình</p>
            <p className="text-3xl font-bold text-purple-600">
              {((statistics.totalDeduction || 0) / (statistics.totalIncome || 1) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-2">Tỷ lệ chi phí</p>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Income vs Deduction Chart */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Thu Nhập vs Khấu Trừ</h3>
          {statistics && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[{
                name: 'Tháng ' + selectedMonth,
                'Thu Nhập': statistics.totalIncome || 0,
                'Khấu Trừ': statistics.totalDeduction || 0,
                'Lương Ròng': statistics.totalNetSalary || 0
              }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Thu Nhập" fill="#10b981" />
                <Bar dataKey="Khấu Trừ" fill="#ef4444" />
                <Bar dataKey="Lương Ròng" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Salary Distribution Chart */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Phân Bố Lương</h3>
          {monthlySummary && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySummary?.payrollsByEmployee || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="employeeName" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="netSalary"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Lương Ròng"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Payroll Summary Table */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Chi Tiết Bảng Lương Tháng {selectedMonth}/{selectedYear}</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-200 border">
                <th className="px-4 py-2 text-left">Mã NV</th>
                <th className="px-4 py-2 text-left">Tên Nhân Viên</th>
                <th className="px-4 py-2 text-right">Lương Cơ Bản</th>
                <th className="px-4 py-2 text-right">Thu Nhập Khác</th>
                <th className="px-4 py-2 text-right">Tổng Thu Nhập</th>
                <th className="px-4 py-2 text-right">Khấu Trừ</th>
                <th className="px-4 py-2 text-right">Lương Ròng</th>
                <th className="px-4 py-2 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary?.payrollsByEmployee?.map((payroll, idx) => (
                <tr key={idx} className="border hover:bg-white">
                  <td className="px-4 py-2">{payroll.employeeCode}</td>
                  <td className="px-4 py-2">{payroll.employeeName}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(payroll.baseSalary || 0)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency((payroll.totalIncome || 0) - (payroll.baseSalary || 0))}</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-600">{formatCurrency(payroll.totalIncome || 0)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-red-600">{formatCurrency(payroll.totalDeduction || 0)}</td>
                  <td className="px-4 py-2 text-right font-bold text-blue-600">{formatCurrency(payroll.netSalary || 0)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      payroll.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : payroll.status === 'approved'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payroll.status === 'paid' ? '✅ Đã TT' : payroll.status === 'approved' ? '🔵 Duyệt' : '⏳ Chờ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!monthlySummary?.payrollsByEmployee?.length && (
          <div className="text-center py-8 text-gray-500">
            Không có dữ liệu bảng lương cho tháng {selectedMonth}/{selectedYear}
          </div>
        )}
      </div>
    </div>
  );
}
