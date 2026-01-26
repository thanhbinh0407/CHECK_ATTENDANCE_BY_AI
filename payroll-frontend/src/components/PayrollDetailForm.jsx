import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { payrollApi } from '../api/apiClient';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../utils/formatters';
import StatusBadge from './StatusBadge';

export default function PayrollDetailForm({ payrollId, onClose, onSuccess }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();
  const [editMode, setEditMode] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [calculations, setCalculations] = useState({});
  const [auditHistory, setAuditHistory] = useState([]);

  // Fetch payroll details
  const { data: payroll, isLoading } = useQuery(
    ['payroll', payrollId],
    () => payrollApi.getPayrollById(payrollId),
    { enabled: !!payrollId }
  );

  // Fetch all payroll components
  const { data: allComponents } = useQuery(
    ['payroll-components'],
    () => payrollApi.getAllPayrollComponents()
  );

  // Update payroll mutation
  const updateMutation = useMutation(
    (data) => payrollApi.updatePayroll(payrollId, data),
    {
      onSuccess: () => {
        setEditMode(false);
        onSuccess?.();
      }
    }
  );

  // Submit payroll mutation
  const submitMutation = useMutation(
    () => payrollApi.submitPayroll(payrollId),
    { onSuccess: () => onSuccess?.() }
  );

  // Approve mutation
  const approveMutation = useMutation(
    () => payrollApi.approvePayroll(payrollId),
    { onSuccess: () => onSuccess?.() }
  );

  // Reject mutation
  const rejectMutation = useMutation(
    () => payrollApi.rejectPayroll(payrollId, { reason: '' }),
    { onSuccess: () => onSuccess?.() }
  );

  // Mark as paid mutation
  const paidMutation = useMutation(
    () => payrollApi.markAsPaid(payrollId),
    { onSuccess: () => onSuccess?.() }
  );

  // Load payroll data into form
  useEffect(() => {
    if (payroll) {
      Object.keys(payroll).forEach(key => {
        setValue(key, payroll[key]);
      });
      setSelectedComponents(payroll.details || []);
      setAuditHistory(payroll.auditTrail || []);
      recalculateTotals(payroll.details || []);
    }
  }, [payroll, setValue]);

  const recalculateTotals = (components) => {
    const totalIncome = components
      .filter(c => c.componentType === 'income')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    
    const totalDeduction = components
      .filter(c => c.componentType === 'deduction')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const netSalary = totalIncome - totalDeduction;

    setCalculations({
      totalIncome,
      totalDeduction,
      netSalary
    });
  };

  const handleComponentChange = (index, field, value) => {
    const updated = [...selectedComponents];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedComponents(updated);
    recalculateTotals(updated);
  };

  const onSubmit = (data) => {
    updateMutation.mutate({
      ...data,
      details: selectedComponents
    });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!payroll) {
    return <div className="text-center py-8">Không tìm thấy bảng lương</div>;
  }

  const isApprovalRole = ['HR', 'Manager'].includes(localStorage.getItem('userRole'));
  const canEdit = payroll.status === 'draft' && editMode;
  const canSubmit = payroll.status === 'draft' && !editMode;
  const canApprove = payroll.status === 'pending' && isApprovalRole;
  const canMarkPaid = payroll.status === 'approved' && isApprovalRole;

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chi tiết Bảng Lương</h1>
          <p className="text-gray-600 mt-1">Nhân viên: {payroll.employeeName}</p>
        </div>
        <div className="text-right">
          <StatusBadge status={payroll.status} size="lg" />
          <p className="text-sm text-gray-500 mt-2">
            Kỳ: {payroll.payrollMonth}/{payroll.payrollYear}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Employee Info Section */}
        <div className="grid grid-cols-3 gap-4 mb-8 bg-gray-50 p-6 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700">Mã NV</label>
            <input
              {...register('employeeCode')}
              disabled
              className="mt-1 w-full px-3 py-2 border rounded-md bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Chức danh</label>
            <input
              {...register('jobTitle')}
              disabled
              className="mt-1 w-full px-3 py-2 border rounded-md bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cấp bậc</label>
            <input
              {...register('salaryGrade')}
              disabled
              className="mt-1 w-full px-3 py-2 border rounded-md bg-white"
            />
          </div>
        </div>

        {/* Components Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Các Khoản Chi Trả & Khấu Trừ</h2>
            {canEdit && (
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                onClick={() => setSelectedComponents([...selectedComponents, { amount: 0, componentType: 'income' }])}
              >
                + Thêm Khoản
              </button>
            )}
          </div>

          {/* Income Components */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-green-700 mb-3">📈 Chi Trả (THU NHẬP)</h3>
            <div className="bg-green-50 rounded-lg p-4">
              {selectedComponents
                .filter(c => c.componentType === 'income')
                .map((component, idx) => (
                  <div key={idx} className="flex gap-4 items-center mb-3 pb-3 border-b last:border-b-0">
                    <div className="flex-1">
                      <select
                        value={component.componentName || ''}
                        onChange={(e) => handleComponentChange(idx, 'componentName', e.target.value)}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option>Chọn khoản chi trả</option>
                        {allComponents
                          ?.filter(c => c.componentType === 'income')
                          .map(c => (
                            <option key={c.id} value={c.componentName}>{c.componentName}</option>
                          ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={component.amount || 0}
                        onChange={(e) => handleComponentChange(idx, 'amount', parseFloat(e.target.value))}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border rounded-md text-right"
                      />
                    </div>
                    <div className="w-32 text-right font-medium">
                      {formatCurrency(component.amount || 0)}
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = selectedComponents.filter((_, i) => i !== idx);
                          setSelectedComponents(updated);
                          recalculateTotals(updated);
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
            </div>
            <div className="text-right mt-2 font-semibold text-green-700">
              Tổng thu nhập: {formatCurrency(calculations.totalIncome || 0)}
            </div>
          </div>

          {/* Deduction Components */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-red-700 mb-3">📉 Khấu Trừ (CHI PHÍ)</h3>
            <div className="bg-red-50 rounded-lg p-4">
              {selectedComponents
                .filter(c => c.componentType === 'deduction')
                .map((component, idx) => (
                  <div key={idx} className="flex gap-4 items-center mb-3 pb-3 border-b last:border-b-0">
                    <div className="flex-1">
                      <select
                        value={component.componentName || ''}
                        onChange={(e) => handleComponentChange(idx, 'componentName', e.target.value)}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option>Chọn khoản khấu trừ</option>
                        {allComponents
                          ?.filter(c => c.componentType === 'deduction')
                          .map(c => (
                            <option key={c.id} value={c.componentName}>{c.componentName}</option>
                          ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={component.amount || 0}
                        onChange={(e) => handleComponentChange(idx, 'amount', parseFloat(e.target.value))}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border rounded-md text-right"
                      />
                    </div>
                    <div className="w-32 text-right font-medium text-red-600">
                      -{formatCurrency(component.amount || 0)}
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = selectedComponents.filter((_, i) => i !== idx);
                          setSelectedComponents(updated);
                          recalculateTotals(updated);
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
            </div>
            <div className="text-right mt-2 font-semibold text-red-700">
              Tổng khấu trừ: {formatCurrency(calculations.totalDeduction || 0)}
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 mb-8 border-2 border-blue-200">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tổng Thu Nhập</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(calculations.totalIncome || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Tổng Khấu Trừ</p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(calculations.totalDeduction || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Lương Ròng</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(calculations.netSalary || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        {auditHistory && auditHistory.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Lịch Sử Thay Đổi</h3>
            <div className="space-y-2">
              {auditHistory.map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-md text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{entry.action}</span>
                    <span className="text-gray-600 ml-2">bởi {entry.userId}</span>
                  </div>
                  <span className="text-gray-500">{formatDate(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-6 border-t">
          {editMode ? (
            <>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={updateMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {updateMutation.isLoading ? 'Đang lưu...' : 'Lưu'}
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  ✏️ Chỉnh Sửa
                </button>
              )}
              {canSubmit && (
                <button
                  type="button"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {submitMutation.isLoading ? 'Đang gửi...' : '✅ Nộp Duyệt'}
                </button>
              )}
              {canApprove && (
                <>
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {approveMutation.isLoading ? 'Đang duyệt...' : '✅ Duyệt'}
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectMutation.mutate()}
                    disabled={rejectMutation.isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {rejectMutation.isLoading ? 'Đang từ chối...' : '❌ Từ Chối'}
                  </button>
                </>
              )}
              {canMarkPaid && (
                <button
                  type="button"
                  onClick={() => paidMutation.mutate()}
                  disabled={paidMutation.isLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {paidMutation.isLoading ? 'Đang cập nhật...' : '💰 Đã Thanh Toán'}
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Đóng
          </button>
        </div>
      </form>
    </div>
  );
}
