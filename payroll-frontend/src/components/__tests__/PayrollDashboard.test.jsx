/**
 * Test Suite for PayrollDashboard Component
 * Unit tests using Jest and React Testing Library
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PayrollDashboard from '../PayrollDashboard';
import * as apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('PayrollDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard header correctly', () => {
    apiClient.payrollApi.getAllPayrolls.mockResolvedValue({
      data: {
        data: [],
        pagination: { total: 0, page: 1, limit: 20 },
      },
    });

    renderWithProviders(<PayrollDashboard />);
    expect(screen.getByText('Bảng Lương Tháng')).toBeInTheDocument();
    expect(screen.getByText('Quản lý và tính toán lương nhân viên')).toBeInTheDocument();
  });

  test('renders filter controls', () => {
    apiClient.payrollApi.getAllPayrolls.mockResolvedValue({
      data: {
        data: [],
        pagination: { total: 0, page: 1, limit: 20 },
      },
    });

    renderWithProviders(<PayrollDashboard />);
    expect(screen.getByLabelText('Tháng')).toBeInTheDocument();
    expect(screen.getByLabelText('Năm')).toBeInTheDocument();
    expect(screen.getByLabelText('Trạng Thái')).toBeInTheDocument();
  });

  test('displays payroll data in table', async () => {
    const mockPayrolls = [
      {
        id: 1,
        User: { fullName: 'Nguyễn Văn A', employeeCode: 'NV001' },
        SalaryPolicy: { baseSalaryPerDay: 400000 },
        totalIncome: 10000000,
        netSalary: 8500000,
        status: 'approved',
      },
    ];

    apiClient.payrollApi.getAllPayrolls.mockResolvedValue({
      data: {
        data: mockPayrolls,
        pagination: { total: 1, page: 1, limit: 20 },
      },
    });

    apiClient.payrollApi.getPayrollStatistics.mockResolvedValue({
      data: {
        approved_count: 1,
        draft_count: 0,
        pending_count: 0,
        paid_count: 0,
      },
    });

    renderWithProviders(<PayrollDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('NV001')).toBeInTheDocument();
    });
  });

  test('filters payroll data by month', async () => {
    apiClient.payrollApi.getAllPayrolls.mockResolvedValue({
      data: {
        data: [],
        pagination: { total: 0, page: 1, limit: 20 },
      },
    });

    apiClient.payrollApi.getPayrollStatistics.mockResolvedValue({
      data: {
        approved_count: 0,
        draft_count: 0,
        pending_count: 0,
        paid_count: 0,
      },
    });

    renderWithProviders(<PayrollDashboard />);

    const monthSelect = screen.getByLabelText('Tháng');
    fireEvent.change(monthSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(apiClient.payrollApi.getAllPayrolls).toHaveBeenCalled();
    });
  });

  test('creates new payroll', async () => {
    apiClient.payrollApi.getAllPayrolls.mockResolvedValue({
      data: {
        data: [],
        pagination: { total: 0, page: 1, limit: 20 },
      },
    });

    apiClient.payrollApi.getPayrollStatistics.mockResolvedValue({
      data: {
        approved_count: 0,
        draft_count: 0,
        pending_count: 0,
        paid_count: 0,
      },
    });

    renderWithProviders(<PayrollDashboard />);

    const createButton = screen.getByText('Tạo Mới');
    expect(createButton).toBeInTheDocument();
  });

  test('handles loading state', async () => {
    apiClient.payrollApi.getAllPayrolls.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() =>
            resolve({
              data: {
                data: [],
                pagination: { total: 0, page: 1, limit: 20 },
              },
            }),
            1000
          )
        )
    );

    apiClient.payrollApi.getPayrollStatistics.mockResolvedValue({
      data: {
        approved_count: 0,
        draft_count: 0,
        pending_count: 0,
        paid_count: 0,
      },
    });

    renderWithProviders(<PayrollDashboard />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  test('handles error state', async () => {
    apiClient.payrollApi.getAllPayrolls.mockRejectedValue(
      new Error('Failed to fetch')
    );

    apiClient.payrollApi.getPayrollStatistics.mockRejectedValue(
      new Error('Failed to fetch')
    );

    renderWithProviders(<PayrollDashboard />);

    await waitFor(() => {
      expect(apiClient.payrollApi.getAllPayrolls).toHaveBeenCalled();
    });
  });
});
