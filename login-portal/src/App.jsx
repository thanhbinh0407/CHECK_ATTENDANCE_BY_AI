import { useState } from 'react'
import './App.css'

/**
 * Mỗi vai trò → client riêng (đúng cổng Vite trong repo).
 * Ghi đè bằng biến môi trường nếu deploy khác (vd. VITE_HR_CLIENT_URL).
 */
const ROLE_CLIENT_CONFIG = {
  manager: {
    origin: (import.meta.env.VITE_MANAGER_CLIENT_URL || 'http://localhost:5174').replace(/\/$/, ''),
    path: '/dashboard',
  },
  hr: {
    origin: (import.meta.env.VITE_HR_CLIENT_URL || 'http://localhost:5172').replace(/\/$/, ''),
    path: '/',
  },
  accountant: {
    origin: (import.meta.env.VITE_ACCOUNTANT_CLIENT_URL || 'http://localhost:5175').replace(/\/$/, ''),
    path: '/',
  },
  supervisor: {
    origin: (import.meta.env.VITE_SUPERVISOR_CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
    path: '/',
  },
  employee: {
    origin: (import.meta.env.VITE_EMPLOYEE_CLIENT_URL || 'http://localhost:5178').replace(/\/$/, ''),
    path: '/',
  },
}

const ROLE_DESCRIPTIONS = {
  manager:    'Quản lý tài khoản người dùng, phân quyền và cấu hình hệ thống',
  hr:         'Quản lý hồ sơ nhân viên, phòng ban, chức danh và chấm công',
  accountant: 'Tính lương, bảng lương, thuế và bảo hiểm xã hội',
  supervisor: 'Duyệt đơn từ, phê duyệt lương và xem báo cáo',
  employee:   'Xem thông tin cá nhân, lịch sử chấm công và gửi đơn từ',
}

function App() {
  const [selectedRole, setSelectedRole] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!selectedRole) {
      setError('Vui lòng chọn vai trò đăng nhập')
      return
    }

    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, expectedRole: selectedRole }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        const cfg = ROLE_CLIENT_CONFIG[selectedRole]
        if (!cfg) {
          setError('Cấu hình client cho vai trò này chưa có.')
          setLoading(false)
          return
        }
        const tokenParam = encodeURIComponent(data.token)
        const dest = `${cfg.origin}${cfg.path}?token=${tokenParam}`
        window.location.href = dest
      } else {
        setError(data.message || 'Đăng nhập thất bại')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Hệ thống Quản lý Nhân sự</h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>
            Human Resource Management System
          </p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="role">Vai trò đăng nhập</label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Chọn vai trò --</option>
              <option value="manager">🏢 Giám đốc (Manager)</option>
              <option value="hr">👥 Nhân sự (HR Staff)</option>
              <option value="accountant">💰 Kế toán (Accountant)</option>
              <option value="supervisor">✅ Quản lý (Supervisor)</option>
              <option value="employee">👤 Nhân viên (Employee)</option>
            </select>
            {selectedRole && (
              <p className="role-description">
                {ROLE_DESCRIPTIONS[selectedRole]}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="Nhập email của bạn"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="login-footer">
          <p>Chọn đúng vai trò để truy cập ứng dụng tương ứng</p>
          <p style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
            💡 Tài khoản Manager có thể truy cập tất cả portal
          </p>
        </div>
      </div>
    </div>
  )
}

export default App

