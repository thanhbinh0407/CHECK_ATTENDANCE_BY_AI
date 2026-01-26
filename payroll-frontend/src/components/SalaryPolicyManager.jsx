import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { payrollApi } from '../api/apiClient';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function SalaryPolicyManager() {
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    policyName: '',
    baseSalary: 0,
    bonusPercent: 0,
    allowancePercent: 0,
    status: 'active'
  });
  const [showForm, setShowForm] = useState(false);

  const { data: policies, refetch } = useQuery(
    ['salary-policies'],
    () => payrollApi.getAllSalaryPolicies()
  );

  const createMutation = useMutation(
    (data) => payrollApi.createSalaryPolicy(data),
    { onSuccess: () => {
      refetch();
      setShowForm(false);
      setFormData({ policyName: '', baseSalary: 0, bonusPercent: 0, allowancePercent: 0, status: 'active' });
    }}
  );

  const updateMutation = useMutation(
    (data) => payrollApi.updateSalaryPolicy(editId, data),
    { onSuccess: () => {
      refetch();
      setEditId(null);
      setFormData({ policyName: '', baseSalary: 0, bonusPercent: 0, allowancePercent: 0, status: 'active' });
    }}
  );

  const deactivateMutation = useMutation(
    (id) => payrollApi.deactivateSalaryPolicy(id),
    { onSuccess: () => refetch() }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (policy) => {
    setEditId(policy.id);
    setFormData(policy);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditId(null);
    setFormData({ policyName: '', baseSalary: 0, bonusPercent: 0, allowancePercent: 0, status: 'active' });
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">📋 Quản Lý Chính Sách Lương</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Thêm Chính Sách
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editId ? '✏️ Chỉnh Sửa Chính Sách' : '➕ Thêm Chính Sách Mới'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tên Chính Sách</label>
                <input
                  type="text"
                  value={formData.policyName}
                  onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Lương Cơ Bản (VNĐ)</label>
                <input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">% Thưởng</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bonusPercent}
                  onChange={(e) => setFormData({ ...formData, bonusPercent: parseFloat(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">% Phụ Cấp</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.allowancePercent}
                  onChange={(e) => setFormData({ ...formData, allowancePercent: parseFloat(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Trạng Thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="active">Hoạt Động</option>
                  <option value="inactive">Không Hoạt Động</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {editId ? 'Lưu Thay Đổi' : 'Thêm Mới'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Huỷ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Policies Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border">
              <th className="px-4 py-3 text-left font-semibold">Tên Chính Sách</th>
              <th className="px-4 py-3 text-right font-semibold">Lương Cơ Bản</th>
              <th className="px-4 py-3 text-right font-semibold">% Thưởng</th>
              <th className="px-4 py-3 text-right font-semibold">% Phụ Cấp</th>
              <th className="px-4 py-3 text-center font-semibold">Trạng Thái</th>
              <th className="px-4 py-3 text-center font-semibold">Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {policies?.map((policy) => (
              <tr key={policy.id} className="border hover:bg-gray-50">
                <td className="px-4 py-3">{policy.policyName}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(policy.baseSalary)}</td>
                <td className="px-4 py-3 text-right">{policy.bonusPercent}%</td>
                <td className="px-4 py-3 text-right">{policy.allowancePercent}%</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    policy.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {policy.status === 'active' ? '✅ Hoạt Động' : '⚠️ Không Hoạt Động'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button
                    onClick={() => handleEdit(policy)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                  >
                    ✏️ Sửa
                  </button>
                  {policy.status === 'active' && (
                    <button
                      onClick={() => deactivateMutation.mutate(policy.id)}
                      disabled={deactivateMutation.isLoading}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm disabled:bg-gray-200"
                    >
                      ❌ Vô Hiệu Hóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {policies?.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Không có chính sách lương nào. Hãy thêm một chính sách mới!
        </div>
      )}
    </div>
  );
}
