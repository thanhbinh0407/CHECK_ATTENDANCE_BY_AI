import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { payrollApi } from '../api/apiClient';

export default function PayrollComponentManager() {
  const [editId, setEditId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    componentName: '',
    componentType: 'income',
    description: '',
    status: 'active'
  });
  const [showForm, setShowForm] = useState(false);

  const { data: components, refetch } = useQuery(
    ['payroll-components', filterType],
    () => filterType === 'all' 
      ? payrollApi.getAllPayrollComponents()
      : payrollApi.getComponentsByType(filterType)
  );

  const createMutation = useMutation(
    (data) => payrollApi.createPayrollComponent(data),
    { onSuccess: () => {
      refetch();
      setShowForm(false);
      setFormData({ componentName: '', componentType: 'income', description: '', status: 'active' });
    }}
  );

  const updateMutation = useMutation(
    (data) => payrollApi.updatePayrollComponent(editId, data),
    { onSuccess: () => {
      refetch();
      setEditId(null);
      setFormData({ componentName: '', componentType: 'income', description: '', status: 'active' });
    }}
  );

  const deactivateMutation = useMutation(
    (id) => payrollApi.deactivatePayrollComponent(id),
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

  const handleEdit = (component) => {
    setEditId(component.id);
    setFormData(component);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditId(null);
    setFormData({ componentName: '', componentType: 'income', description: '', status: 'active' });
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">🧮 Quản Lý Khoản Chi Trả & Khấu Trừ</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Thêm Khoản
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-md font-medium transition ${
            filterType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Tất Cả
        </button>
        <button
          onClick={() => setFilterType('income')}
          className={`px-4 py-2 rounded-md font-medium transition ${
            filterType === 'income'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📈 Chi Trả
        </button>
        <button
          onClick={() => setFilterType('deduction')}
          className={`px-4 py-2 rounded-md font-medium transition ${
            filterType === 'deduction'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📉 Khấu Trừ
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editId ? '✏️ Chỉnh Sửa Khoản' : '➕ Thêm Khoản Mới'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tên Khoản</label>
                <input
                  type="text"
                  value={formData.componentName}
                  onChange={(e) => setFormData({ ...formData, componentName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Loại Khoản</label>
                <select
                  value={formData.componentType}
                  onChange={(e) => setFormData({ ...formData, componentType: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="income">📈 Chi Trả</option>
                  <option value="deduction">📉 Khấu Trừ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mô Tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Trạng Thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="active">✅ Hoạt Động</option>
                  <option value="inactive">⚠️ Không Hoạt Động</option>
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

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {components?.map((component) => (
          <div
            key={component.id}
            className={`rounded-lg p-6 border-2 ${
              component.componentType === 'income'
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {component.componentType === 'income' ? '📈' : '📉'} {component.componentName}
                </h3>
                {component.description && (
                  <p className="text-sm text-gray-600 mt-1">{component.description}</p>
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                component.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {component.status === 'active' ? '✅' : '⚠️'}
              </span>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <button
                onClick={() => handleEdit(component)}
                className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
              >
                ✏️ Sửa
              </button>
              {component.status === 'active' && (
                <button
                  onClick={() => deactivateMutation.mutate(component.id)}
                  disabled={deactivateMutation.isLoading}
                  className="flex-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium disabled:bg-gray-200"
                >
                  ❌ Vô Hiệu
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {components?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Không có khoản nào. Hãy thêm một khoản mới!</p>
        </div>
      )}
    </div>
  );
}
