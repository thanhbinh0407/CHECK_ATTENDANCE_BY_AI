/**
 * PayrollDashboard Component
 * Main dashboard showing overview cards and payroll list
 * 
 * Features: filters, status badges, quick actions
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ChevronDownIcon, PlusIcon, DocumentDownloadIcon } from '@heroicons/react/24/outline';
import StatusBadge from './StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';

const PayrollDashboard = () => {
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: 'all',
    policy: 'all',
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Fetch payrolls
  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ['payrolls', filters, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.month !== 'all') params.append('month', filters.month);
      if (filters.year !== 'all') params.append('year', filters.year);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.policy !== 'all') params.append('policyId', filters.policy);
      params.append('page', page);
      params.append('limit', limit);

      const response = await axios.get(`/api/payrolls?${params.toString()}`);
      return response.data.data;
    },
  });

  // Fetch summary stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['payroll-stats', filters.month, filters.year],
    queryFn: async () => {
      const response = await axios.get(
        `/api/reports/statistics?month=${filters.month}&year=${filters.year}`
      );
      return response.data.data;
    },
  });

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `Month ${i + 1}`,
  }));

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: new Date().getFullYear() - i,
    label: `${new Date().getFullYear() - i}`,
  }));

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_approval', label: 'Pending approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'paid', label: 'Paid' },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monthly Payroll</h1>
          <p className="text-gray-600 mt-2">Manage and calculate employee payroll</p>
        </div>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition">
          <PlusIcon className="w-5 h-5" />
          Create new
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <select
              value={filters.month}
              onChange={(e) => {
                setFilters({ ...filters, month: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={filters.year}
              onChange={(e) => {
                setFilters({ ...filters, year: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              {years.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Employee name or code..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            Search
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {!statsLoading && statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Draft</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsData.draft_count || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🟨</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending approval</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsData.pending_count || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🟨</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsData.approved_count || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🟩</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Paid</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsData.paid_count || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🟩</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">No.</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Base salary
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Total income
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Net salary
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payrollLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : payrollData && payrollData.length > 0 ? (
                payrollData.map((payroll, index) => (
                  <tr key={payroll.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{payroll.User?.fullName}</p>
                        <p className="text-gray-600">{payroll.User?.employeeCode}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(payroll.SalaryPolicy?.baseSalaryPerDay * 20)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {formatCurrency(payroll.totalIncome)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                      {formatCurrency(payroll.netSalary)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge status={payroll.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-blue-600 hover:text-blue-800 font-medium">
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing page <span className="font-medium">{page}</span>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
              Previous
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
