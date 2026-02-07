import React, { useState } from 'react';

/**
 * Reusable Modal for approval actions
 */
export function ApprovalModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Xác Nhận', cancelText = 'Huỷ', isDangerous = false, requiresReason = false }) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (requiresReason) {
        await onConfirm(reason);
      } else {
        await onConfirm();
      }
      setReason('');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className={`text-4xl mb-4 ${isDangerous ? 'text-red-600' : 'text-blue-600'}`}>
          {isDangerous ? '⚠️' : '❓'}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>

        {requiresReason && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lý do:
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              rows="3"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-medium disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || (requiresReason && !reason.trim())}
            className={`flex-1 px-4 py-2 text-white rounded-md font-medium disabled:opacity-50 transition ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal for editing payroll details
 */
export function EditPayrollModal({ isOpen, payroll, onSave, onCancel }) {
  const [formData, setFormData] = useState(payroll || {});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">✏️ Chỉnh Sửa Bảng Lương</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Mã Nhân Viên</label>
              <input
                type="text"
                value={formData.employeeCode || ''}
                onChange={(e) => handleChange('employeeCode', e.target.value)}
                disabled
                className="mt-1 w-full px-3 py-2 border rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên Nhân Viên</label>
              <input
                type="text"
                value={formData.employeeName || ''}
                onChange={(e) => handleChange('employeeName', e.target.value)}
                disabled
                className="mt-1 w-full px-3 py-2 border rounded-md bg-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tháng</label>
              <input
                type="number"
                min="1"
                max="12"
                value={formData.payrollMonth || ''}
                onChange={(e) => handleChange('payrollMonth', parseInt(e.target.value))}
                className="mt-1 w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Năm</label>
              <input
                type="number"
                value={formData.payrollYear || ''}
                onChange={(e) => handleChange('payrollYear', parseInt(e.target.value))}
                className="mt-1 w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ghi Chú</label>
              <input
                type="text"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Ghi chú thêm..."
                className="mt-1 w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-medium disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {isLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal for viewing payroll details
 */
export function ViewPayrollModal({ isOpen, payroll, onClose }) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [employeePassword, setEmployeePassword] = React.useState(null);
  const [isLoadingPassword, setIsLoadingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState(null);

  const handleShowPassword = async () => {
    if (showPassword) {
      setShowPassword(false);
      return;
    }

    // Fetch employee password
    setIsLoadingPassword(true);
    setPasswordError(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/employees/${payroll.userId}/with-password`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch employee data');
      }

      const data = await response.json();
      if (data.employee?.password) {
        setEmployeePassword(data.employee.password);
        setShowPassword(true);
      }
    } catch (error) {
      console.error('Error fetching password:', error);
      setPasswordError('Không thể tải mật khẩu. Vui lòng thử lại.');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  if (!isOpen || !payroll) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">👁️ Chi Tiết Bảng Lương</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Mã Nhân Viên</p>
              <p className="text-lg font-semibold text-gray-900">{payroll.employeeCode}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tên Nhân Viên</p>
              <p className="text-lg font-semibold text-gray-900">{payroll.employeeName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Kỳ Lương</p>
              <p className="text-lg font-semibold text-gray-900">{payroll.payrollMonth}/{payroll.payrollYear}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Trạng Thái</p>
              <p className="text-lg font-semibold text-blue-600">{payroll.status.toUpperCase()}</p>
            </div>
          </div>

          {/* Employee Password Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="text-sm text-gray-600">Mật Khẩu Đăng Nhập</p>
                <p className="text-lg font-semibold text-gray-900 font-mono">
                  {showPassword && employeePassword
                    ? employeePassword
                    : showPassword
                    ? '••••••••'
                    : '••••••••'}
                </p>
              </div>
              <button
                onClick={handleShowPassword}
                disabled={isLoadingPassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 transition"
              >
                {isLoadingPassword
                  ? 'Đang tải...'
                  : showPassword
                  ? '🔒 Ẩn'
                  : '👁️ Hiện'}
              </button>
            </div>
            {passwordError && (
              <p className="text-red-600 text-sm mt-2">{passwordError}</p>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Chi Tiết Thành Phần</h3>
            {payroll.details && payroll.details.length > 0 ? (
              <div className="space-y-2">
                {payroll.details.map((detail, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">{detail.componentName}</span>
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(detail.amount || 0)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Không có dữ liệu chi tiết</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
